import { io } from 'socket.io-client';

const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

const defaultSocketUrl = isLocalhost ? 'http://localhost:5000' : (typeof window !== 'undefined' ? window.location.origin : '');
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_BACKEND_URL || defaultSocketUrl;

// In Vercel serverless deployments without a dedicated WebSocket URL, disable aggressive reconnection polling
const isServerlessDeploy = typeof window !== 'undefined' && (
  window.location.hostname.endsWith('.vercel.app') ||
  (!import.meta.env.VITE_SOCKET_URL && !import.meta.env.VITE_BACKEND_URL && !isLocalhost)
);

export const socket = io(SOCKET_URL, {
  autoConnect: !isServerlessDeploy,
  reconnection: !isServerlessDeploy,
  reconnectionAttempts: isServerlessDeploy ? 1 : 5,
  reconnectionDelay: 2000,
  transports: ['websocket', 'polling'],
  timeout: 5000
});

export default socket;
