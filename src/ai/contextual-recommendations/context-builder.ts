import { supabase } from '@/lib/supabase';
import { UserTravelContext } from './types';

/**
 * Builds a clean and safe travel context for a user and plan
 */
export async function buildUserTravelContext(planId: string, profileId: string, client?: any): Promise<UserTravelContext> {
  const db = client || supabase;
  
  // Fetch everything in parallel
  const [planRes, hotelStaysRes, hospitalityRes, flightsRes, savedPlacesRes] = await Promise.all([
    db
      .from('contact_travel_plans')
      .select('*, contexts(*)')
      .eq('id', planId)
      .single(),
    db
      .from('hotel_stays')
      .select('*')
      .eq('plan_id', planId)
      .is('deleted_at', null),
    db
      .from('hospitality_events')
      .select('*')
      .eq('plan_id', planId)
      .is('deleted_at', null),
    db
      .from('travel_flights')
      .select('*')
      .eq('plan_id', planId)
      .is('deleted_at', null),
    db
      .from('saved_places')
      .select('*')
      .eq('plan_id', planId)
  ]);

  const plan = planRes.data;
  const hotelStay = hotelStaysRes.data?.[0];
  const congress = plan?.contexts;

  return {
    profile_id: profileId,
    plan_id: planId,
    hotel: hotelStay ? {
      name: hotelStay.hotel_name,
      address: hotelStay.address || '',
      latitude: hotelStay.latitude || 0,
      longitude: hotelStay.longitude || 0
    } : undefined,
    event: congress ? {
      name: congress.name,
      address: congress.address || '',
      latitude: congress.latitude || 0,
      longitude: congress.longitude || 0
    } : undefined,
    agenda_items: [], // Future: combine all time-based events
    flights: flightsRes.data || [],
    hospitality_events: hospitalityRes.data || [],
    mobility_preferences: ['taxi', 'walking'], // Default for now
    time_window_minutes: 120 // Default window
  };
}
