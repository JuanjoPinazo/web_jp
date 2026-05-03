export type UserRole = 'admin' | 'client';

export interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  role: UserRole;
  client_id?: string;
  context_users?: { context_id: string }[];
  clients?: any;
  onboarding_status?: 'draft' | 'invited' | 'active';
  invitation_sent_at?: string;
  avatar_url?: string;
  password?: string; // Only for mock auth
}

export interface JPScore {
  quality: number;    // 1-10
  logistics: number;  // 1-10
  experience: number; // 1-10
}

export type CaseType = 'travel' | 'congress' | 'leisure';
export type CaseItemType = 'flight' | 'hotel' | 'restaurant' | 'event';

export interface CaseItem {
  id: string;
  caseId: string;
  type: CaseItemType;
  title: string;
  description: string;
  date: string;
}

export interface Case {
  id: string;
  userId: string;
  title: string;
  type: CaseType;
  description: string;
  startDate: string;
  endDate: string;
  items?: CaseItem[];
  aiRecommendations?: string;
}

export interface Recommendation {
  id: string;
  title?: string;
  categoria?: string;
  rating?: number;
  descripcion?: string;
  imagen_url?: string;
  activo?: boolean;
  client_id?: string | null;
  context_id?: string | null;
  user_id?: string | null;
  tags?: string[];
  created_at?: string;
  restaurantId?: string; // Legacy
  jpScore?: JPScore;      // Legacy
  personalNote?: string;  // Legacy
}

export interface Dossier {
  id: string;
  userId: string;
  title: string;
  description: string;
  date: string;
  recommendations: Recommendation[];
}

// Global Types for Auth
export interface AuthSession {
  user: User | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
}
