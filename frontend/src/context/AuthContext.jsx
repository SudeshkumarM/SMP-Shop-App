import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('smp_token') || null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const loadUser = async () => {
    const savedToken = localStorage.getItem('smp_token');
    if (!savedToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
      }
    } catch (err) {
      console.error('Failed to load user:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (role, identifier, password) => {
    let endpoint = '/auth/customer/login';
    let payload = { identifier, username: identifier, email: identifier, password };

    if (role === 'staff') {
      endpoint = '/auth/staff/login';
      payload = { staffIdOrEmail: identifier, identifier, username: identifier, email: identifier, password };
    } else if (role === 'admin') {
      endpoint = '/auth/admin/login';
      payload = { adminIdOrEmail: identifier, identifier, username: identifier, email: identifier, password };
    } else if (role === 'owner') {
      endpoint = '/auth/owner/login';
      payload = { email: identifier, username: identifier, identifier, password };
    }

    try {
      const res = await api.post(endpoint, payload);
      if (res.data.success) {
        const { token, user, welcomeMessage } = res.data;
        localStorage.setItem('smp_token', token);
        localStorage.setItem('smp_role', user.role);
        setToken(token);
        setUser(user);
        addToast(welcomeMessage || `Welcome ${user.name}!`, 'success');
        return { success: true, user, role: user.role };
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Invalid Username/Email or Password.';
      addToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    const currentRole = user?.role || localStorage.getItem('smp_role') || 'customer';
    localStorage.removeItem('smp_token');
    localStorage.removeItem('smp_role');
    setToken(null);
    setUser(null);
    addToast('You have been logged out.', 'info');

    // Return destination
    if (currentRole === 'staff') return '/staff/login';
    if (currentRole === 'admin') return '/admin/login';
    if (currentRole === 'owner') return '/owner/login';
    return '/customer/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        loadUser,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
