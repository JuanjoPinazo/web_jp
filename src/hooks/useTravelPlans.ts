'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { notifyMediCRMUpdate } from '@/lib/integrations/medicrm-sync/client';
import { EntityType } from '@/lib/integrations/medicrm-sync/types';

export interface LogisticContact {
  id: string;
  name: string;
  role?: string;
  company?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  avatar_url?: string;
  is_default: boolean;
  created_at: string;
}

export interface TravelPlan {
  id: string;
  user_id: string;
  context_id: string;
  support_phone?: string;
  logistic_contact_id?: string;
  status: string;
  source: string;
  external_source?: string;
  external_id?: string;
  last_updated_at?: string;
  last_updated_by?: string;
  created_at?: string;
  deleted_at?: string | null;
}

export interface Flight {
  id: string;
  plan_id: string;
  flight_number?: string;
  departure_location: string;
  arrival_location: string;
  departure_time: string;
  arrival_time: string;
  departure_terminal?: string;
  arrival_terminal?: string;
  duration_minutes?: number;
  distance_km?: number;
  checkin_deadline?: string;
  terminal?: string; // Legacy
  booking_reference?: string;
  reservation_code?: string;
  passengers?: string;
  baggage_info?: string;
  provider?: string;
  type?: string;
  airline?: string;
  seat?: string;
  gate?: string;
  boarding_group?: string;
  check_in_url?: string;
  check_in_info?: string;
  manage_url?: string;
  notes?: string;
  status: string;
  source: string;
  is_verified: boolean;
  external_id?: string;
  last_updated_at?: string;
  last_updated_by?: string;
  deleted_at?: string | null;
}

export interface Hotel {
  id: string;
  plan_id: string;
  hotel_name: string;
  address?: string;
  check_in: string;
  check_out: string;
  booking_reference?: string;
  confirmation_number?: string;
  traveler_name?: string;
  pin_code?: string;
  breakfast_included?: boolean;
  cancellation_policy?: string;
  provider?: string;
  phone?: string;
  map_url?: string;
  voucher_url?: string;
  check_in_url?: string;
  manage_url?: string;
  notes?: string;
  room_type?: string;
  status: string;
  source: string;
  external_id?: string;
  last_updated_at?: string;
  last_updated_by?: string;
  deleted_at?: string | null;
}

export interface HotelStay {
  id: string;
  plan_id: string;
  hotel_id?: string;
  guest_name: string;
  guest_email?: string;
  hotel_name: string;
  address?: string;
  phone?: string;
  check_in: string;
  check_out: string;
  check_in_time?: string;
  check_out_time?: string;
  nights?: number;
  adults?: number;
  room_type?: string;
  room_group_id?: string;
  booking_reference: string;
  breakfast_included?: boolean;
  cancellation_policy?: string;
  notes?: string;
  document_id?: string;
  status: string;
  source: string;
  external_id?: string;
  last_updated_at?: string;
  last_updated_by?: string;
  deleted_at?: string | null;
  created_at: string;
}

export interface Transfer {
  id: string;
  plan_id: string;
  type: string; // airport_to_hotel, hotel_to_airport, etc.
  pickup_datetime: string;
  pickup_location: string;
  dropoff_location: string;
  passenger_name?: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_type?: string;
  company_name?: string;
  booking_reference?: string;
  notes?: string;
  status: 'planned' | 'confirmed' | 'cancelled';
  visible_to_client: boolean;
  related_flight_id?: string;
  related_hotel_id?: string;
  related_hospitality_id?: string;
  source: string;
  external_id?: string;
  last_updated_at?: string;
  last_updated_by?: string;
  deleted_at?: string | null;
  created_at: string;
}

export interface Restaurant {
  id: string;
  plan_id: string;
  reservation_time: string;
  restaurant_name: string;
  address?: string;
  reservation_name?: string;
  type?: 'reserved' | 'recommended';
  notes?: string;
  status: string;
  source: string;
  external_id?: string;
  last_updated_at?: string;
  last_updated_by?: string;
  deleted_at?: string | null;
}

export interface Document {
  id: string;
  plan_id: string;
  document_type?: string;
  display_title?: string;
  title: string;
  file_url: string;
  description?: string;
  related_entity?: string;
  related_entity_id?: string;
  related_flight_id?: string;
  related_hotel_stay_id?: string;
  related_transfer_id?: string;
  passenger_name?: string;
  booking_reference?: string;
  seat_assignment?: string;
  boarding_group?: string;
  qr_code?: string;
  qr_raw_payload?: string;
  visible_to_client: boolean;
  notes?: string;
  status: string;
  source: string;
  external_id?: string;
  last_updated_at?: string;
  last_updated_by?: string;
  deleted_at?: string | null;
  created_at: string;
}

export interface HospitalityAttendee {
  id: string;
  event_id: string;
  contact_id?: string;
  profile_id?: string;
  guest_name?: string;
  guest_email?: string;
  attendance_status: 'confirmed' | 'pending' | 'declined';
  dietary_restrictions?: string;
  transport_required: boolean;
  notes?: string;
  deleted_at?: string | null;
}

export interface HospitalityEvent {
  id: string;
  plan_id: string;
  type: 'dinner' | 'lunch' | 'meeting' | 'experience';
  title: string;
  description?: string;
  venue_name?: string;
  venue_address?: string;
  venue_lat?: number;
  venue_lng?: number;
  start_datetime: string;
  end_datetime?: string;
  dress_code?: string;
  notes?: string;
  contact_name?: string;
  contact_phone?: string;
  reservation_name?: string;
  reservation_code?: string;
  menu_type?: string;
  private_room: boolean;
  visible_to_client: boolean;
  status: 'planned' | 'confirmed' | 'cancelled';
  attendees?: HospitalityAttendee[];
  image_url?: string;
  created_at: string;
  deleted_at?: string | null;
}

export interface Registration {
  id: string;
  plan_id: string;
  status: string;
  registration_code?: string;
  document_url?: string;
  notes?: string;
  source: string;
  last_updated_at?: string;
  last_updated_by?: string;
  deleted_at?: string | null;
}

export interface FullTravelPlan extends TravelPlan {
  flights: Flight[];
  hotels: Hotel[];         // legacy: travel_hotels
  hotel_stays: HotelStay[]; // primary: hotel_stays
  transfers: Transfer[];
  restaurants: Restaurant[];
  hospitality_events: HospitalityEvent[];
  documents: Document[];
  registrations: Registration[];
  profiles?: any;
  contexts?: any;
  logistic_contact?: LogisticContact;
}

export const useTravelPlans = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);

  const triggerMediCRMSync = useCallback(async (planId: string, table: string, entityId: string) => {
    try {
      // Map table names to standard entities
      const tableToEntity: Record<string, EntityType> = {
        'travel_flights': 'flights',
        'hotel_stays': 'hotels',
        'travel_documents': 'documents',
        'travel_transfers': 'transfers'
      };

      const entityType = tableToEntity[table];
      if (!entityType) return;

      // Get plan details for the payload
      const { data: plan } = await supabase
        .from('contact_travel_plans')
        .select('user_id, context_id')
        .eq('id', planId)
        .single();
        
      if (plan) {
        notifyMediCRMUpdate(planId, plan.user_id, plan.context_id, entityType, entityId);
      }
    } catch (err) {
      console.error('Error triggering MediCRM sync:', err);
    }
  }, []);

  // --- CLIENT ACTIONS ---
  
  // Fetches the full plan for the logged-in user and a specific context
  const getMyActivePlan = useCallback(async (contextId: string): Promise<FullTravelPlan | null> => {
    if (!session?.user?.id || !contextId) return null;
    
    try {
      setLoading(true);
      const { data: plan, error: planError } = await supabase
        .from('contact_travel_plans')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('context_id', contextId)
        .is('deleted_at', null)
        .single();
        
      if (planError || !plan) {
        if (planError?.code !== 'PGRST116') console.warn(planError);
        return null;
      }

      // Fetch related items
      const [flights, hotels, hotelStays, transfers, restaurants, hospitality, invitedEvents, docs, regs] = await Promise.all([
        supabase.from('travel_flights').select('*').eq('plan_id', plan.id).is('deleted_at', null).order('departure_time'),
        supabase.from('travel_hotels').select('*').eq('plan_id', plan.id).is('deleted_at', null).order('check_in'),
        supabase.from('hotel_stays').select('*').eq('plan_id', plan.id).is('deleted_at', null).order('check_in'),
        supabase.from('travel_transfers').select('*').eq('plan_id', plan.id).is('deleted_at', null).order('pickup_time'),
        supabase.from('travel_restaurants').select('*').eq('plan_id', plan.id).is('deleted_at', null).order('reservation_time'),
        supabase.from('hospitality_events').select('*, hospitality_event_attendees(*)').eq('plan_id', plan.id).is('deleted_at', null).order('start_datetime'),
        supabase.from('hospitality_event_attendees').select('event_id, hospitality_events(*, hospitality_event_attendees(*))').eq('profile_id', session.user.id).is('deleted_at', null),
        supabase.from('travel_documents').select('*').eq('plan_id', plan.id).is('deleted_at', null),
        supabase.from('travel_registrations').select('*').eq('plan_id', plan.id).is('deleted_at', null)
      ]);

      // Fetch Logistic Contact
      let coordinator = null;
      try {
        if (plan.logistic_contact_id) {
          const { data } = await supabase.from('logistic_contacts').select('*').eq('id', plan.logistic_contact_id).single();
          coordinator = data;
        }
        
        if (!coordinator) {
          const { data } = await supabase.from('logistic_contacts').select('*').eq('is_default', true).limit(1).maybeSingle();
          coordinator = data;
        }
      } catch (err) {
        console.warn('Logistic contacts table not ready or accessible:', err);
      }

      return {
        ...plan,
        flights: flights.data || [],
        hotels: hotels.data || [],
        hotel_stays: hotelStays.data || [],
        transfers: (transfers.data || []).map((t: any) => ({
          ...t,
          type: t.type || t.transfer_type,
          pickup_datetime: t.pickup_datetime || t.pickup_time
        })),
        restaurants: restaurants.data || [],
        hospitality_events: [
          ...(hospitality.data || []),
          ...((invitedEvents.data || [])
            .map((ie: any) => ie.hospitality_events)
            .filter((he: any) => he && !hospitality.data?.some(h => h.id === he.id)))
        ],
        documents: docs.data || [],
        registrations: regs.data || [],
        logistic_contact: coordinator
      };
    } catch (err) {
      console.error('Error fetching travel plan:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [session]);

  // --- ADMIN ACTIONS ---
  
  const getAdminPlanForUser = useCallback(async (userId: string, contextId: string): Promise<FullTravelPlan | null> => {
    try {
      setLoading(true);
      const { data: plan, error: planError } = await supabase
        .from('contact_travel_plans')
        .select(`
          *,
          profiles:user_id (nombre, apellidos, email, avatar_url),
          contexts:context_id (name)
        `)
        .eq('user_id', userId)
        .eq('context_id', contextId)
        .is('deleted_at', null)
        .single();
        
      if (planError || !plan) {
        if (planError?.code !== 'PGRST116') console.warn(planError);
        return null;
      }

      const [flights, hotels, hotelStays, transfers, restaurants, hospitality, invitedEvents, docs, regs] = await Promise.all([
        supabase.from('travel_flights').select('*').eq('plan_id', plan.id).is('deleted_at', null).order('departure_time'),
        supabase.from('travel_hotels').select('*').eq('plan_id', plan.id).is('deleted_at', null).order('check_in'),
        supabase.from('hotel_stays').select('*').eq('plan_id', plan.id).is('deleted_at', null).order('check_in'),
        supabase.from('travel_transfers').select('*').eq('plan_id', plan.id).is('deleted_at', null).order('pickup_time'),
        supabase.from('travel_restaurants').select('*').eq('plan_id', plan.id).is('deleted_at', null).order('reservation_time'),
        supabase.from('hospitality_events').select(`
          *,
          attendees:hospitality_event_attendees(
            *,
            profiles:profile_id(nombre, apellidos)
          )
        `).eq('plan_id', plan.id).is('deleted_at', null).order('start_datetime'),
        supabase.from('hospitality_event_attendees').select('event_id, hospitality_events(*, hospitality_event_attendees(*, profiles:profile_id(nombre, apellidos)))').eq('profile_id', plan.user_id).is('deleted_at', null),
        supabase.from('travel_documents').select('*').eq('plan_id', plan.id).is('deleted_at', null),
        supabase.from('travel_registrations').select('*').eq('plan_id', plan.id).is('deleted_at', null)
      ]);
      
      // Fetch Logistic Contact
      let coordinator = null;
      try {
        if (plan.logistic_contact_id) {
          const { data } = await supabase.from('logistic_contacts').select('*').eq('id', plan.logistic_contact_id).single();
          coordinator = data;
        }
        
        if (!coordinator) {
          const { data } = await supabase.from('logistic_contacts').select('*').eq('is_default', true).limit(1).maybeSingle();
          coordinator = data;
        }
      } catch (err) {
        console.warn('Logistic contacts table not ready or accessible:', err);
      }

      return {
        ...plan,
        flights: flights.data || [],
        hotels: hotels.data || [],
        hotel_stays: hotelStays.data || [],
        transfers: (transfers.data || []).map((t: any) => ({
          ...t,
          type: t.type || t.transfer_type,
          pickup_datetime: t.pickup_datetime || t.pickup_time
        })),
        restaurants: restaurants.data || [],
        hospitality_events: [
          ...(hospitality.data || []),
          ...((invitedEvents.data || [])
            .map((ie: any) => ie.hospitality_events)
            .filter((he: any) => he && !hospitality.data?.some(h => h.id === he.id)))
        ],
        documents: docs.data || [],
        registrations: regs.data || [],
        logistic_contact: coordinator
      };
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createOrUpdatePlan = async (userId: string, contextId: string, supportPhone?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('contact_travel_plans')
      .upsert({ 
        user_id: userId, 
        context_id: contextId, 
        support_phone: supportPhone,
        last_updated_by: user?.id,
        source: 'manual'
      }, { onConflict: 'user_id,context_id' })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  };

  const saveItem = async (table: string, payload: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (table !== 'logistic_contacts' && !payload.plan_id) {
      console.warn(`[saveItem] Warning: plan_id is missing for table ${table}`, payload);
    }

    let finalPayload = { ...payload };
    
    // Normalize for transfers
    if (table === 'travel_transfers') {
      if (finalPayload.type) finalPayload.transfer_type = finalPayload.type;
      if (finalPayload.pickup_datetime) finalPayload.pickup_time = finalPayload.pickup_datetime;
    }
    
    const { data, error } = await supabase
      .from(table)
      .upsert({
        ...finalPayload,
        last_updated_by: user?.id,
        last_updated_at: new Date().toISOString(),
        source: payload.source || 'manual'
      })
      .select()
      .single();
    if (error) throw error;
    
    // Trigger sync
    if (data.plan_id) {
      triggerMediCRMSync(data.plan_id, table, data.id);
    }

    return data;
  };

  const deleteItem = async (table: string, id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Soft delete as requested
    const { error } = await supabase
      .from(table)
      .update({ 
        deleted_at: new Date().toISOString(),
        last_updated_by: user?.id 
      })
      .eq('id', id);
    if (error) throw error;

    // Trigger sync for deleted item (we need to know the plan_id)
    // For now we try to fetch it before it's "deleted" or use the id to find it
    const { data: item } = await supabase.from(table).select('plan_id').eq('id', id).maybeSingle();
    if (item?.plan_id) {
      triggerMediCRMSync(item.plan_id, table, id);
    }
  };

  const saveTravelDocument = async (payload: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('travel_documents')
      .upsert({
        ...payload,
        last_updated_by: user?.id,
        last_updated_at: new Date().toISOString(),
        source: payload.source || 'manual'
      })
      .select()
      .single();
    if (error) throw error;
    
    // Trigger sync
    if (data.plan_id) {
      triggerMediCRMSync(data.plan_id, 'travel_documents', data.id);
    }

    return data;
  };

  const getLogisticContacts = useCallback(async () => {
    const { data, error } = await supabase.from('logistic_contacts').select('*').order('name');
    if (error) {
      console.error('Supabase error fetching logistic_contacts:', error);
      throw error;
    }
    return data;
  }, []);

  const saveLogisticContact = async (payload: any) => {
    const { data, error } = await supabase
      .from('logistic_contacts')
      .upsert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  // Dedicated function for hospitality_event_attendees.
  // Uses only the columns that actually exist in the table (no source / last_updated_by).
  const saveAttendee = async (payload: {
    id?: string;
    event_id: string;
    profile_id?: string | null;
    guest_name?: string;
    guest_email?: string;
    attendance_status: 'pending' | 'confirmed' | 'declined';
    dietary_restrictions?: string;
    transport_required?: boolean;
    notes?: string;
  }) => {
    const { data, error } = await supabase
      .from('hospitality_event_attendees')
      .upsert({
        ...payload,
        last_updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  // After saving an attendee, reload the full list for a given event so the UI is always in sync.
  const getEventAttendees = async (eventId: string) => {
    const { data, error } = await supabase
      .from('hospitality_event_attendees')
      .select('*, profiles:profile_id(nombre, apellidos, email, avatar_url)')
      .eq('event_id', eventId)
      .is('deleted_at', null)
      .order('created_at');
    if (error) throw error;
    return data ?? [];
  };

  // Soft-delete for attendees (no last_updated_by column in that table).
  const deleteAttendee = async (id: string) => {
    const { error } = await supabase
      .from('hospitality_event_attendees')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  };

  // Fetch all events for a given context (useful for linking)
  const getContextEvents = useCallback(async (contextId: string) => {
    // We need to find all plans in this context to get their events
    const { data: plans } = await supabase.from('contact_travel_plans').select('id').eq('context_id', contextId);
    const planIds = (plans || []).map(p => p.id);
    
    if (planIds.length === 0) return [];

    const { data, error } = await supabase
      .from('hospitality_events')
      .select(`
        *,
        attendees:hospitality_event_attendees(
          *,
          profiles:profile_id(nombre, apellidos, email)
        ),
        plan:contact_travel_plans(
          id,
          profiles:user_id(nombre, apellidos)
        )
      `)
      .in('plan_id', planIds)
      .is('deleted_at', null)
      .order('start_datetime');
    
    if (error) throw error;
    return data || [];
  }, []);

  return {
    loading,
    getMyActivePlan,
    getAdminPlanForUser,
    createOrUpdatePlan,
    saveItem,
    deleteItem,
    saveTravelDocument,
    getLogisticContacts,
    saveLogisticContact,
    saveAttendee,
    getEventAttendees,
    deleteAttendee,
    getContextEvents,
  };
};
