export interface MediCRMSyncPayload {
  source: "jp_intelligence";
  plan_id: string;
  user_id: string;
  context_id: string;
  updated_entities: {
    flights?: string[];
    hotels?: string[];
    documents?: string[];
    transfers?: string[];
  };
  updated_at: string;
}

export type EntityType = 'flights' | 'hotels' | 'documents' | 'transfers';
