export interface SupportRequest {
  id: string;
  plan_id?: string;
  profile_id: string;
  coordinator_id?: string | null;
  type: string;
  title: string;
  message?: string;
  status: 'open' | 'resolved';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  related_entity?: string;
  related_entity_id?: string;
  created_at: string;
  resolved_at?: string | null;
  metadata?: any;
  // Joins
  profiles?: {
    id: string;
    nombre: string;
    apellidos: string;
    email: string;
    telefono?: string;
    avatar_url?: string | null;
  } | null;
  logistic_contacts?: {
    id: string;
    name: string;
    role: string;
    phone: string;
    whatsapp?: string;
    email?: string;
    avatar_url?: string;
  } | null;
}

export interface SupportRequestInput {
  plan_id?: string;
  profile_id: string;
  coordinator_id?: string | null;
  type: string;
  title: string;
  message?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  related_entity?: string;
  related_entity_id?: string;
  metadata?: any;
}

export interface CoordinatorDetails {
  id: string;
  name: string;
  role: string;
  phone: string;
  whatsapp: string;
  email: string;
  avatar_url?: string;
}
