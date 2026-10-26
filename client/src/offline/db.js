import { openDB } from 'idb';

const DB_NAME = 'blood_connect_offline_db';
const DB_VERSION = 1;

export const initOfflineDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Offline requests queue
      if (!db.objectStoreNames.contains('drafts')) {
        const store = db.createObjectStore('drafts', { keyPath: 'idempotencyKey' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Offline cached requests for viewing when offline
      if (!db.objectStoreNames.contains('cached_requests')) {
        db.createObjectStore('cached_requests', { keyPath: '_id' });
      }
    },
  });
};

/**
 * Saves a blood request draft to IndexedDB
 */
export const saveOfflineDraft = async (requestPayload) => {
  const db = await initOfflineDB();
  const idempotencyKey =
    requestPayload.idempotencyKey ||
    `offline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const draft = {
    idempotencyKey,
    payload: {
      ...requestPayload,
      idempotencyKey,
    },
    status: 'waiting_for_connection',
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  await db.put('drafts', draft);
  console.log('[IndexedDB] Saved offline request draft:', idempotencyKey);
  return draft;
};

/**
 * Retrieves all pending offline drafts
 */
export const getPendingDrafts = async () => {
  const db = await initOfflineDB();
  const tx = db.transaction('drafts', 'readonly');
  const store = tx.objectStore('drafts');
  const drafts = await store.getAll();
  return drafts.filter((d) => d.status !== 'synced');
};

/**
 * Removes a synced draft
 */
export const removeDraft = async (idempotencyKey) => {
  const db = await initOfflineDB();
  await db.delete('drafts', idempotencyKey);
};

/**
 * Updates draft status
 */
export const updateDraftStatus = async (idempotencyKey, status, errorMessage = null) => {
  const db = await initOfflineDB();
  const tx = db.transaction('drafts', 'readwrite');
  const store = tx.objectStore('drafts');
  const draft = await store.get(idempotencyKey);
  if (draft) {
    draft.status = status;
    draft.updatedAt = new Date().toISOString();
    if (errorMessage) draft.errorMessage = errorMessage;
    draft.retryCount = (draft.retryCount || 0) + 1;
    await store.put(draft);
  }
};

export default {
  saveOfflineDraft,
  getPendingDrafts,
  removeDraft,
  updateDraftStatus,
};
