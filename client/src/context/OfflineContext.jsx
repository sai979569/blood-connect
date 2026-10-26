import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import api from '../services/api.js';
import {
  saveOfflineDraft,
  getPendingDrafts,
  updateDraftStatus,
} from '../offline/db.js';
import { verifyActualOnline, syncOfflineQueue } from '../offline/syncManager.js';

const OfflineContext = createContext(null);

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isServerReachable, setIsServerReachable] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingDrafts, setPendingDrafts] = useState([]);
  const [lastSyncResult, setLastSyncResult] = useState(null);
  const [syncStatusMessage, setSyncStatusMessage] = useState('');

  const consecutiveFailuresRef = useRef(0);

  // Refresh pending drafts from IndexedDB
  const refreshPendingDrafts = useCallback(async () => {
    try {
      const drafts = await getPendingDrafts();
      setPendingDrafts(drafts || []);
    } catch (err) {
      console.warn('[OfflineContext] Could not load pending drafts from IndexedDB:', err.message);
    }
  }, []);

  // Run synchronization of queued requests
  const triggerSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatusMessage('Synchronizing offline requests with server...');

    try {
      const result = await syncOfflineQueue(api, (syncedRequest) => {
        // Dispatch custom event for real-time UI updates
        window.dispatchEvent(
          new CustomEvent('request:synced', { detail: { request: syncedRequest } })
        );
      });

      setLastSyncResult(result);
      await refreshPendingDrafts();

      if (result.status === 'success') {
        setSyncStatusMessage(`Successfully synced ${result.syncedCount} offline request(s)!`);
        setTimeout(() => setSyncStatusMessage(''), 5000);
      } else if (result.status === 'empty') {
        setSyncStatusMessage('');
      } else if (result.error) {
        setSyncStatusMessage(`Sync paused: ${result.error}. Requests remain saved in IndexedDB.`);
      }
    } catch (err) {
      console.error('[OfflineContext] Sync error:', err);
      setSyncStatusMessage('Sync error: draft retained in IndexedDB for retry.');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPendingDrafts]);

  // Periodic and event-driven health verification
  const checkConnectivity = useCallback(async () => {
    const browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setIsOnline(browserOnline);

    if (!browserOnline) {
      setIsServerReachable(false);
      return;
    }

    const health = await verifyActualOnline();
    if (health.isServerReachable) {
      consecutiveFailuresRef.current = 0;
      setIsServerReachable(true);
    } else {
      consecutiveFailuresRef.current += 1;
      // Require at least 2 consecutive failures before declaring server unreachable
      if (consecutiveFailuresRef.current >= 2) {
        setIsServerReachable(false);
      }
    }
  }, []);

  // Monitor connectivity lifecycle
  useEffect(() => {
    refreshPendingDrafts();
    checkConnectivity();

    const handleOnline = async () => {
      setIsOnline(true);
      const health = await verifyActualOnline();
      if (health.isServerReachable) {
        setIsServerReachable(true);
        consecutiveFailuresRef.current = 0;
        triggerSync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsServerReachable(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check every 30 seconds
    const interval = setInterval(async () => {
      await checkConnectivity();
      const currentDrafts = await getPendingDrafts().catch(() => []);
      if (currentDrafts.length > 0 && navigator.onLine) {
        triggerSync();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refreshPendingDrafts, triggerSync, checkConnectivity]);

  /**
   * Saves a request locally in IndexedDB when offline
   */
  const queueOfflineRequest = async (payload) => {
    const draft = await saveOfflineDraft(payload);
    await refreshPendingDrafts();
    return draft;
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isServerReachable,
        isSyncing,
        pendingDrafts,
        pendingDraftsCount: pendingDrafts.length,
        triggerSync,
        checkConnectivity,
        queueOfflineRequest,
        refreshPendingDrafts,
        lastSyncResult,
        syncStatusMessage,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => useContext(OfflineContext);
export default OfflineContext;
