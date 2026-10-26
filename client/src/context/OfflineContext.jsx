import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api.js';
import {
  saveOfflineDraft,
  getPendingDrafts,
  updateDraftStatus,
} from '../offline/db.js';
import { verifyActualOnline, syncOfflineQueue } from '../offline/syncManager.js';

const OfflineContext = createContext(null);

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingDrafts, setPendingDrafts] = useState([]);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  // Refresh pending drafts from IndexedDB
  const refreshPendingDrafts = useCallback(async () => {
    try {
      const drafts = await getPendingDrafts();
      setPendingDrafts(drafts);
    } catch (err) {
      console.warn('[OfflineContext] Could not load pending drafts:', err.message);
    }
  }, []);

  // Run synchronization
  const triggerSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      const result = await syncOfflineQueue(api, (syncedRequest) => {
        // Dispatch custom event for UI updates
        window.dispatchEvent(
          new CustomEvent('request:synced', { detail: { request: syncedRequest } })
        );
      });
      setLastSyncResult(result);
      await refreshPendingDrafts();
    } catch (err) {
      console.error('[OfflineContext] Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPendingDrafts]);

  // Monitor connectivity
  useEffect(() => {
    refreshPendingDrafts();

    const handleStatusChange = async () => {
      const actuallyOnline = await verifyActualOnline();
      setIsOnline(actuallyOnline);
      if (actuallyOnline) {
        triggerSync();
      }
    };

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', () => setIsOnline(false));

    // Periodic ping every 25 seconds
    const interval = setInterval(async () => {
      const onlineNow = await verifyActualOnline();
      setIsOnline(onlineNow);
      if (onlineNow && pendingDrafts.length > 0) {
        triggerSync();
      }
    }, 25000);

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', () => setIsOnline(false));
      clearInterval(interval);
    };
  }, [refreshPendingDrafts, triggerSync, pendingDrafts.length]);

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
        isSyncing,
        pendingDrafts,
        pendingDraftsCount: pendingDrafts.length,
        triggerSync,
        queueOfflineRequest,
        refreshPendingDrafts,
        lastSyncResult,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => useContext(OfflineContext);
export default OfflineContext;
