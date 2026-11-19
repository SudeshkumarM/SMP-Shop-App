import axios from 'axios';

const backendOrigin = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');

const api = axios.create({
  baseURL: backendOrigin ? `${backendOrigin}/api` : '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smp_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If token expired or unauthorized
    if (error.response && error.response.status === 401) {
      // Don't auto-redirect if checking auth or on login page
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        // Optional token clearance
      }
    }
    return Promise.reject(error);
  }
);

export default api;
