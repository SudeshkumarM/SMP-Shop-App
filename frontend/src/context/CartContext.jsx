import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const CartContext = createContext();

const getGuestSessionId = () => {
  let guestId = localStorage.getItem('smp_guest_session_id');
  if (!guestId) {
    guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('smp_guest_session_id', guestId);
  }
  return guestId;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], subtotal: 0, gstAmount: 0, discountAmount: 0, grandTotal: 0 });
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const fetchCart = useCallback(async () => {
    try {
      const guestSessionId = getGuestSessionId();
      const res = await api.get('/cart', {
        params: isAuthenticated ? {} : { guestSessionId }
      });
      if (res.data.success && res.data.cart) {
        setCart(res.data.cart);
      }
    } catch (err) {
      console.error('Fetch cart error:', err.message);
    }
  }, [isAuthenticated]);

  // Merge guest cart on login
  useEffect(() => {
    const handleLoginCart = async () => {
      if (isAuthenticated && user?.role === 'customer') {
        const guestSessionId = localStorage.getItem('smp_guest_session_id');
        if (guestSessionId) {
          try {
            await api.post('/cart/merge', { guestSessionId });
            localStorage.removeItem('smp_guest_session_id');
          } catch (e) {
            console.error('Cart merge error:', e.message);
          }
        }
        fetchCart();
      } else {
        fetchCart();
      }
    };
    handleLoginCart();
  }, [isAuthenticated, user, fetchCart]);

  const addToCart = async (productOrId, size = 'Standard', colour = 'Default', quantity = 1) => {
    setLoading(true);
    try {
      const productId = typeof productOrId === 'object' && productOrId !== null ? productOrId._id : productOrId;
      const guestSessionId = getGuestSessionId();
      const res = await api.post('/cart/add', {
        productId,
        size,
        colour,
        quantity,
        guestSessionId: isAuthenticated ? undefined : guestSessionId
      });

      if (res.data.success) {
        setCart(res.data.cart);
        addToast(res.data.message || 'Added to cart!', 'success');
        return { success: true };
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Could not add to cart';
      addToast(msg, 'error');
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    try {
      const guestSessionId = getGuestSessionId();
      const res = await api.put('/cart/update', {
        itemId,
        quantity,
        guestSessionId: isAuthenticated ? undefined : guestSessionId
      });
      if (res.data.success) {
        setCart(res.data.cart);
      }
    } catch (error) {
      addToast('Could not update quantity', 'error');
    }
  };

  const removeItem = async (itemId) => {
    try {
      const guestSessionId = getGuestSessionId();
      const res = await api.delete(`/cart/item/${itemId}`, {
        params: isAuthenticated ? {} : { guestSessionId }
      });
      if (res.data.success) {
        setCart(res.data.cart);
        addToast('Item removed from cart', 'info');
      }
    } catch (error) {
      addToast('Could not remove item', 'error');
    }
  };

  const itemCount = (cart.items || []).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        loading,
        addToCart,
        updateQuantity,
        removeItem,
        fetchCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
