'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface TravelPlan {
  id: string;
  user_id: string;
  context_id: string;
  support_phone?: string;
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
  terminal?: string;
  booking_reference?: string;
  reservation_code?: string;
  passengers?: string;
  baggage_info?: string;
  provider?: string;
  type?: string;
  airline?: string;
  seat?: string;
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

export interface Transfer {
  id: string;
  plan_id: string;
  transfer_type?: string;
  pickup_time: string;
  pickup_location: string;
  dropoff_location: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_info?: string;
  booking_reference?: string;
  notes?: string;
  status: string;
  source: string;
  external_id?: string;
  last_updated_at?: string;
  last_updated_by?: string;
  deleted_at?: string | null;
}

export interface Restaurant {
  id: string;
  plan_id: string;
  reservation_time: string;
  restaurant_name: string;
  address?: string;
  reservation_name?: string;
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
  title: string;
  file_url: string;
  related_entity?: string;
  related_entity_id?: string;
  notes?: string;
  status: string;
  source: string;
  external_id?: string;
  last_updated_at?: string;
  last_updated_by?: string;
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
  hotels: Hotel[];
  transfers: Transfer[];
  restaurants: Restaurant[];
  documents: Document[];
  registrations: Registration[];
  profiles?: any;
  contexts?: any;
}

export const useTravelPlans = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);

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
      const [flights, hotels, transfers, restaurants, docs, regs] = await Promise.all([
        supabase.from('travel_flights').select('*').eq('plan_id', plan.id).is('deleted_at', null).order('departure_time'),
        supabase.from('travel_hotels').select('*').eq('plan_id', plan.id).is('deleted_at', null).order('check_in'),
        supabase.from('travel_transfers').select('*').eq('plan_id', plan.id).is('deleted_at', null).order('pickup_time'),
        supabase.from('travel_restaurants').select('*').eq('plan_id', plan.id).is('deleted_at', null).order('reservation_time'),
        supabase.from('travel_documents').select('*').eq('plan_id', plan.id).is('deleted_at', null),
        supabase.from('travel_registrations').select('*').eq('plan_id', plan.id).is('deleted_at', null)
      ]);

      return {
        ...plan,
        flights: flights.data || [],
        hotels: hotels.data || [],
        transfers: transfers.data || [],
        restaurants: restaurants.data || [],
        documents: docs.data || [],
        registrations: regs.data || []
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
        .select('*')
        .eq('user_id', userId)
        .eq('context_id', contextId)
        .is('deleted_at', null)
        .single();
        
      if (planError || !plan) {
        if (planError?.code !== 'PGRST116') console.warn(planError);
        return null;
      }

      const [flights, hotels, transfers, restaurants, docs, regs] = await Promise.all([
        supabase.from('travel_flights').select('*').eq('plan_id', plan.id).is('deleted_at', null).order('departure_time'),
        supabase.from('travel_hotels').select('*').eq('plan_id', plan.id).is('deleted_at', null).order('check_in'),
        supabase.from('travel_transfers').select('*').eq('plan_id', plan.id).is('deleted_at', null).order('pickup_time'),
        supabase.from('travel_restaurants').select('*').eq('plan_id', plan.id).is('deleted_at', null).order('reservation_time'),
        supabase.from('travel_documents').select('*').eq('plan_id', plan.id).is('deleted_at', null),
        supabase.from('travel_registrations').select('*').eq('plan_id', plan.id).is('deleted_at', null)
      ]);

      return {
        ...plan,
        flights: flights.data || [],
        hotels: hotels.data || [],
        transfers: transfers.data || [],
        restaurants: restaurants.data || [],
        documents: docs.data || [],
        registrations: regs.data || []
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
    
    const { data, error } = await supabase
      .from(table)
      .upsert({
        ...payload,
        last_updated_by: user?.id,
        last_updated_at: new Date().toISOString(),
        source: payload.source || 'manual'
      })
      .select()
      .single();
    if (error) throw error;
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
    return data;
  };

  return {
    loading,
    getMyActivePlan,
    getAdminPlanForUser,
    createOrUpdatePlan,
    saveItem,
    deleteItem,
    saveTravelDocument
  };
};
