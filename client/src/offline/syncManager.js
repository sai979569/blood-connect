import { getPendingDrafts, removeDraft, updateDraftStatus } from './db.js';
import { HEALTH_CHECK_URL } from '../config/apiConfig.js';

let isSyncRunning = false;

/**
 * Resolves the centralized health check URL
 */
export const getHealthUrl = () => HEALTH_CHECK_URL;

/**
 * Checks connectivity by distinguishing browser network status from backend health
 * @returns {Promise<{ isOnline: boolean, isServerReachable: boolean, reason?: string, data?: any }>}
 */
export const verifyActualOnline = async () => {
  // 1. First check if device has physical network connection
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { isOnline: false, isServerReachable: false, reason: 'browser_offline' };
  }

  // 2. Ping backend health check with an adequate timeout for cloud cold-starts
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const healthUrl = getHealthUrl();
    const res = await fetch(healthUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && (data.status === 'ok' || data.service?.includes('Blood Connect'))) {
        return { isOnline: true, isServerReachable: true, data };
      }
    }

    return { isOnline: true, isServerReachable: false, reason: 'server_not_ok' };
  } catch (err) {
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isServerReachable: false,
      reason: err.name === 'AbortError' ? 'timeout' : 'network_error',
    };
  }
};

/**
 * Replays all pending drafts stored in IndexedDB against the server
 */
export const syncOfflineQueue = async (apiClient, onDraftSynced = null) => {
  if (isSyncRunning) {
    return { syncedCount: 0, status: 'already_running' };
  }
  isSyncRunning = true;

  try {
    const health = await verifyActualOnline();
    if (!health.isOnline || !health.isServerReachable) {
      console.warn('[SyncManager] Cannot sync: backend not reachable currently.', health.reason);
      isSyncRunning = false;
      return {
        syncedCount: 0,
        status: 'unreachable',
        error: health.reason === 'browser_offline' ? 'No internet connection' : 'Emergency server not reachable',
      };
    }

    const pendingDrafts = await getPendingDrafts();
    if (pendingDrafts.length === 0) {
      isSyncRunning = false;
      return { syncedCount: 0, status: 'empty', message: 'No pending drafts to sync' };
    }

    console.log(`[SyncManager] Found ${pendingDrafts.length} pending draft(s). Synchronizing...`);

    let syncedCount = 0;
    const errors = [];

    for (const draft of pendingDrafts) {
      try {
        await updateDraftStatus(draft.idempotencyKey, 'syncing');

        // Post to server using idempotencyKey (baseURL already includes /api/v1)
        const response = await apiClient.post('/requests', draft.payload);

        if (response.data && response.data.success) {
          console.log(
            `[SyncManager] Draft ${draft.idempotencyKey} synchronized successfully! Server Request ID: ${response.data.request?._id}`
          );
          await removeDraft(draft.idempotencyKey);
          syncedCount++;

          if (onDraftSynced) {
            onDraftSynced(response.data.request, draft.idempotencyKey);
          }
        } else {
          throw new Error(response.data?.message || 'Server rejected synchronization');
        }
      } catch (err) {
        console.error(`[SyncManager] Failed syncing draft ${draft.idempotencyKey}:`, err.message);
        errors.push({ key: draft.idempotencyKey, error: err.response?.data?.message || err.message });
        await updateDraftStatus(
          draft.idempotencyKey,
          'waiting_for_connection',
          err.response?.data?.message || err.message
        );
      }
    }

    isSyncRunning = false;
    return {
      syncedCount,
      total: pendingDrafts.length,
      errors,
      status: syncedCount > 0 ? 'success' : 'failed',
    };
  } catch (err) {
    console.error('[SyncManager] Sync cycle error:', err);
    isSyncRunning = false;
    return { syncedCount: 0, status: 'error', error: err.message };
  }
};

export default {
  getHealthUrl,
  verifyActualOnline,
  syncOfflineQueue,
};
