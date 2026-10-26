import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    const defaultBackendUrl = isLocalhost
      ? window.location.origin
      : 'https://blood-connect-api.onrender.com';

    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '')
      : defaultBackendUrl;
    const socketInstance = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected to server! Socket ID:', socketInstance.id);
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
      setConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      setConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [isAuthenticated, token]);

  const joinRequestRoom = (requestId) => {
    if (socket && connected && requestId) {
      socket.emit('join:request', requestId);
    }
  };

  const leaveRequestRoom = (requestId) => {
    if (socket && connected && requestId) {
      socket.emit('leave:request', requestId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, connected, joinRequestRoom, leaveRequestRoom }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
export default SocketContext;
