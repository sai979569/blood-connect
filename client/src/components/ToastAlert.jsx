import React from 'react';
import { Bell, X, Compass, CheckCircle2, UserCheck, AlertOctagon } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext.jsx';
import { useNavigate } from 'react-router-dom';

export const ToastAlert = () => {
  const { latestToast, dismissToast } = useNotifications();
  const navigate = useNavigate();

  if (!latestToast) return null;

  const handleClick = () => {
    if (latestToast.relatedRequestId) {
      navigate(`/requests/${latestToast.relatedRequestId}`);
    }
    dismissToast();
  };

  const getIcon = () => {
    switch (latestToast.type) {
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

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        maxWidth: '380px',
        background: '#0f172a',
        border: '1px solid rgba(220, 38, 38, 0.4)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(220, 38, 38, 0.25)',
        borderRadius: '14px',
        padding: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: latestToast.relatedRequestId ? 'pointer' : 'default',
      }}
      onClick={handleClick}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '8px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {getIcon()}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
            {latestToast.title}
          </h4>
          <button
            onClick={(e) => {
              e.stopPropagation();
              dismissToast();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            <X size={16} />
          </button>
        </div>
        <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.4 }}>
          {latestToast.message}
        </p>
        {latestToast.relatedRequestId && (
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.75rem',
              color: '#f87171',
              fontWeight: 600,
              marginTop: '6px',
            }}
          >
            View Live Radar &rarr;
          </span>
        )}
      </div>
    </div>
  );
};

export default ToastAlert;
