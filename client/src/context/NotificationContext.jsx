import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api.js';
import { useAuth } from './AuthContext.jsx';
import { useSocket } from './SocketContext.jsx';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestToast, setLatestToast] = useState(null);
  const [browserPermission, setBrowserPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.warn('[NotificationContext] Failed fetching notifications:', err.message);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Request browser desktop notification permission
  const requestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setBrowserPermission(permission);
        return permission;
      } catch (err) {
        console.warn('[NotificationContext] Notification permission request error:', err.message);
        return 'denied';
      }
    }
    return 'denied';
  };

  // Real-time notification listener via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      console.log('[NotificationContext] Real-time notification received:', notification.title);

      setNotifications((prev) => {
        // Prevent duplicate entries in state
        if (prev.some((n) => n._id === notification._id)) {
          return prev;
        }
        return [notification, ...prev];
      });

      setUnreadCount((prev) => prev + 1);

      // Display live in-app toast notification
      setLatestToast(notification);
      setTimeout(() => {
        setLatestToast((current) => (current?._id === notification._id ? null : current));
      }, 7000);

      // Display system/browser desktop notification if permitted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const browserNotice = new Notification(notification.title || 'Blood Connect Alert', {
            body: notification.message || '',
            icon: '/icons/icon-192x192.png',
            tag: notification._id || `notice-${Date.now()}`,
          });

          browserNotice.onclick = () => {
            window.focus();
            if (notification.relatedRequestId) {
              window.location.href = `/requests/${notification.relatedRequestId}`;
            }
          };
        } catch (pushErr) {
          console.warn('[NotificationContext] Desktop notification error:', pushErr.message);
        }
      }
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[NotificationContext] Mark read error:', err.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[NotificationContext] Mark all read error:', err.message);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        latestToast,
        browserPermission,
        requestBrowserPermission,
        dismissToast: () => setLatestToast(null),
        markAsRead,
        markAllAsRead,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
export default NotificationContext;
