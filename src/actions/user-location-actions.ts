'use server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export interface UserLocation {
  id?: string;
  profile_id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  google_place_id?: string;
  is_default_departure: boolean;
  consent_given: boolean;
}

export async function getUserLocationsAction(profileId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('user_locations')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching user locations:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function saveUserLocationAction(location: UserLocation) {
  const supabase = getSupabaseAdmin();
  
  // If this is set as default, unset others first
  if (location.is_default_departure) {
    await supabase
      .from('user_locations')
      .update({ is_default_departure: false })
      .eq('profile_id', location.profile_id);
  }

  const { data, error } = await supabase
    .from('user_locations')
    .upsert(location)
    .select()
    .single();

  if (error) {
    console.error('Error saving user location:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true, data };
}

export async function deleteUserLocationAction(id: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('user_locations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting user location:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}
