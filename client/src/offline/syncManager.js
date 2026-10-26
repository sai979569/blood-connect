import { getPendingDrafts, removeDraft, updateDraftStatus } from './db.js';

let isSyncRunning = false;

/**
 * Validates actual connectivity by pinging the backend health endpoint
 */
export const verifyActualOnline = async () => {
  if (!navigator.onLine) return false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const healthUrl = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '') + '/api/v1/health';
    const res = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch (err) {
    return false;
  }
};

/**
 * Replays all pending drafts stored in IndexedDB against the server
 */
export const syncOfflineQueue = async (apiClient, onDraftSynced = null) => {
  if (isSyncRunning) return;
  isSyncRunning = true;

  try {
    const isOnline = await verifyActualOnline();
    if (!isOnline) {
      console.log('[SyncManager] Cannot sync: backend not reachable.');
      isSyncRunning = false;
      return { syncedCount: 0, error: 'Offline' };
    }

    const pendingDrafts = await getPendingDrafts();
    if (pendingDrafts.length === 0) {
      isSyncRunning = false;
      return { syncedCount: 0 };
    }

    console.log(`[SyncManager] Found ${pendingDrafts.length} pending draft(s). Synchronizing...`);

    let syncedCount = 0;

    for (const draft of pendingDrafts) {
      try {
        await updateDraftStatus(draft.idempotencyKey, 'syncing');

        // Post to server using idempotencyKey
        const response = await apiClient.post('/api/v1/requests', draft.payload);

        if (response.data && response.data.success) {
          console.log(
            `[SyncManager] Draft ${draft.idempotencyKey} synchronized successfully! Server Request ID: ${response.data.request._id}`
          );
          await removeDraft(draft.idempotencyKey);
          syncedCount++;

          if (onDraftSynced) {
            onDraftSynced(response.data.request, draft.idempotencyKey);
          }
        }
      } catch (err) {
        console.error(`[SyncManager] Failed syncing draft ${draft.idempotencyKey}:`, err.message);
        await updateDraftStatus(
          draft.idempotencyKey,
          'waiting_for_connection',
          err.response?.data?.message || err.message
        );
      }
    }

    isSyncRunning = false;
    return { syncedCount };
  } catch (err) {
    console.error('[SyncManager] Sync cycle error:', err);
    isSyncRunning = false;
    return { syncedCount: 0, error: err.message };
  }
};

export default {
  verifyActualOnline,
  syncOfflineQueue,
};
