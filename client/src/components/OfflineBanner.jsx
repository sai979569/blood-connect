import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle, CloudOff } from 'lucide-react';
import { useOffline } from '../context/OfflineContext.jsx';

export const OfflineBanner = () => {
  const {
    isOnline,
    isServerReachable,
    isSyncing,
    pendingDraftsCount,
    triggerSync,
    checkConnectivity,
    syncStatusMessage,
  } = useOffline();

  // If online, backend reachable, and no pending drafts, don't show any banner
  if (isOnline && isServerReachable && pendingDraftsCount === 0 && !syncStatusMessage) {
    return null;
  }

  // Determine appearance based on real status
  const isBrowserOffline = !isOnline;
  const isServerWaking = isOnline && !isServerReachable;

  let bgGradient = 'linear-gradient(90deg, #1e3a8a 0%, #1e40af 100%)'; // Blue: syncing
  let icon = <AlertTriangle size={18} style={{ color: '#93c5fd' }} />;
  let title = 'Offline Sync Queue: ';
  let description = `${pendingDraftsCount} offline draft(s) ready to sync.`;

  if (isBrowserOffline) {
    bgGradient = 'linear-gradient(90deg, #7f1d1d 0%, #991b1b 100%)'; // Red: browser offline
    icon = <WifiOff size={18} style={{ color: '#fca5a5' }} />;
    title = 'No Internet Connection: ';
    description = 'You are currently disconnected. Emergency requests are safely queued in local storage (IndexedDB) and will auto-sync upon reconnection.';
  } else if (isServerWaking) {
    bgGradient = 'linear-gradient(90deg, #78350f 0%, #92400e 100%)'; // Amber: server waking/unreachable
    icon = <CloudOff size={18} style={{ color: '#fde68a' }} />;
    title = 'Emergency Server Connecting: ';
    description = 'Your device is online, but the backend server is currently waking up or connecting. Emergency requests remain safely saved in IndexedDB.';
  }

  return (
    <div
      style={{
        background: bgGradient,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '10px 16px',
        color: '#ffffff',
        fontSize: '0.875rem',
        transition: 'all 0.3s ease',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 300px' }}>
          {icon}
          <span>
            <strong>{title}</strong>
            {syncStatusMessage || description}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {pendingDraftsCount > 0 && (
            <span
              style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontWeight: 600,
                fontSize: '0.8rem',
              }}
            >
              {pendingDraftsCount} queued draft{pendingDraftsCount > 1 ? 's' : ''}
            </span>
          )}

          {isServerWaking ? (
            <button
              onClick={checkConnectivity}
              className="btn btn-secondary"
              style={{
                padding: '5px 12px',
                fontSize: '0.8rem',
                background: 'rgba(255,255,255,0.15)',
                borderColor: 'rgba(255,255,255,0.2)',
                color: 'white',
              }}
            >
              <RefreshCw size={13} style={{ marginRight: '6px' }} />
              Retry Connection
            </button>
          ) : (
            <button
              onClick={triggerSync}
              disabled={isSyncing || isBrowserOffline}
              className="btn btn-secondary"
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                background: 'rgba(255,255,255,0.15)',
                borderColor: 'rgba(255,255,255,0.2)',
                color: 'white',
              }}
            >
              <RefreshCw size={14} className={isSyncing ? 'pulse-glow' : ''} style={{ marginRight: '6px' }} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineBanner;
