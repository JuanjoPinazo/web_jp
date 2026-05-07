import { MediCRMSyncPayload, EntityType } from './types';

// Simple queue for debounce
let syncQueue: Record<string, MediCRMSyncPayload> = {};
let syncTimeout: NodeJS.Timeout | null = null;

/**
 * Notifies MediCRM about updates in JP Intelligence entities.
 * Implements a simple debounce mechanism (3-5 seconds).
 */
export async function notifyMediCRMUpdate(
  planId: string,
  userId: string,
  contextId: string,
  entityType: EntityType,
  entityId: string
) {
  // 1. Accumulate changes in the queue
  if (!syncQueue[planId]) {
    syncQueue[planId] = {
      source: "jp_intelligence",
      plan_id: planId,
      user_id: userId,
      context_id: contextId,
      updated_entities: {
        flights: [],
        hotels: [],
        documents: [],
        transfers: []
      },
      updated_at: new Date().toISOString()
    };
  }

  const payload = syncQueue[planId];
  const entities = payload.updated_entities[entityType] || [];
  if (!entities.includes(entityId)) {
    entities.push(entityId);
    payload.updated_entities[entityType] = entities;
  }
  payload.updated_at = new Date().toISOString();

  // 2. Debounce logic (3 seconds)
  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(async () => {
    const currentQueue = { ...syncQueue };
    syncQueue = {}; // Clear queue for next batch
    syncTimeout = null;

    for (const [pid, p] of Object.entries(currentQueue)) {
      await performSync(p);
    }
  }, 3000);
}

/**
 * Performs the actual POST request to MediCRM sync endpoint.
 */
async function performSync(payload: MediCRMSyncPayload) {
  console.log(`[MEDICRM PUSH START] plan_id: ${payload.plan_id}`);
  
  try {
    // We call our internal endpoint which handles the external communication and security
    const response = await fetch('/api/integrations/medicrm/push-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-integration-secret': process.env.NEXT_PUBLIC_MEDICRM_SYNC_SECRET || ''
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log(`[MEDICRM PUSH RESULT] plan_id: ${payload.plan_id}`, result);
    return result;
  } catch (error) {
    console.error(`[MEDICRM PUSH ERROR] plan_id: ${payload.plan_id}`, error);
    return { ok: false, error };
  }
}
