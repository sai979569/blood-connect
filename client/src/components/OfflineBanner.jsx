import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useOffline } from '../context/OfflineContext.jsx';

export const OfflineBanner = () => {
  const { isOnline, isSyncing, pendingDraftsCount, triggerSync } = useOffline();

  if (isOnline && pendingDraftsCount === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: !isOnline
          ? 'linear-gradient(90deg, #7f1d1d 0%, #991b1b 100%)'
          : 'linear-gradient(90deg, #1e3a8a 0%, #1e40af 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '10px 16px',
        color: '#ffffff',
        fontSize: '0.875rem',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!isOnline ? (
            <WifiOff size={18} style={{ color: '#fca5a5' }} />
          ) : (
            <AlertTriangle size={18} style={{ color: '#93c5fd' }} />
          )}
          <span>
            {!isOnline ? (
              <strong>Offline Mode Active: </strong>
            ) : (
              <strong>Synchronization in Progress: </strong>
            )}
            {!isOnline
              ? 'You are currently disconnected. Requests are safely queued in local storage (IndexedDB) and will auto-sync upon reconnection.'
              : `${pendingDraftsCount} offline draft(s) ready to sync.`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {pendingDraftsCount > 0 && (
            <span
              style={{
                background: 'rgba(0,0,0,0.25)',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontWeight: 600,
                fontSize: '0.8rem',
              }}
            >
              {pendingDraftsCount} queued draft{pendingDraftsCount > 1 ? 's' : ''}
            </span>
          )}

          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className="btn btn-secondary"
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              background: 'rgba(255,255,255,0.15)',
              borderColor: 'rgba(255,255,255,0.2)',
              color: 'white',
            }}
          >
            <RefreshCw size={14} className={isSyncing ? 'pulse-glow' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfflineBanner;
