export type UserRole = 'admin' | 'client';

export interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  role: UserRole;
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
  restaurantId: string;
  jpScore: JPScore;
  personalNote: string;
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
