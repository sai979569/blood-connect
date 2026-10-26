import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  Compass,
  UserCheck,
  AlertOctagon,
  Check,
  Clock,
  Layers,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext.jsx';

export const NotificationsPage = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    browserPermission,
    requestBrowserPermission,
  } = useNotifications();
  const navigate = useNavigate();

  const getIcon = (type) => {
    switch (type) {
      case 'radius_expanded':
        return <Compass size={20} style={{ color: '#60a5fa' }} />;
      case 'donor_response':
        return <CheckCircle2 size={20} style={{ color: '#34d399' }} />;
      case 'contact_shared':
        return <UserCheck size={20} style={{ color: '#a78bfa' }} />;
      default:
        return <AlertOctagon size={20} style={{ color: '#f87171' }} />;
    }
  };

  const handleNotificationClick = (item) => {
    if (!item.isRead) {
      markAsRead(item._id);
    }
    if (item.relatedRequestId) {
      navigate(`/requests/${item.relatedRequestId}`);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '30px 20px' }}>
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bell size={22} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Notification Center</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              {unreadCount > 0 ? `${unreadCount} unread alert(s)` : 'All alerts caught up'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {browserPermission === 'default' && (
            <button
              onClick={requestBrowserPermission}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.8rem', color: '#60a5fa' }}
            >
              <Bell size={14} />
              Enable Browser Alerts
            </button>
          )}

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.8rem' }}
            >
              <Check size={14} />
              Mark All as Read
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Bell size={40} style={{ color: '#475569', margin: '0 auto 12px' }} />
          <h3>No Notifications Yet</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '6px' }}>
            You will receive instant alerts here when blood requests are matched or updated.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notifications.map((item) => (
            <div
              key={item._id}
              onClick={() => handleNotificationClick(item)}
              className="glass-card"
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                cursor: item.relatedRequestId ? 'pointer' : 'default',
                background: item.isRead ? 'rgba(30, 41, 59, 0.4)' : 'rgba(30, 41, 59, 0.85)',
                borderColor: item.isRead ? 'rgba(255, 255, 255, 0.05)' : 'rgba(239, 68, 68, 0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '10px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {getIcon(item.type)}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: item.isRead ? 600 : 800, color: '#f8fafc' }}>
                    {item.title}
                  </h4>
                  <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
                    {new Date(item.createdAt).toLocaleDateString()} at{' '}
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </span>
                </div>

                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.4 }}>
                  {item.message}
                </p>

                {item.relatedRequestId && (
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '0.75rem',
                      color: '#f87171',
                      fontWeight: 700,
                      marginTop: '6px',
                    }}
                  >
                    View Live Radar &rarr;
                  </span>
                )}
              </div>

              {!item.isRead && (
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    marginTop: '6px',
                  }}
                  title="Unread"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
