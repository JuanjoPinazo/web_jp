import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface MasterHotel {
  id: string;
  name: string;
  city: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  stars?: number;
  rating?: number;
  google_place_id?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  preferred: boolean;
  created_at?: string;
  updated_at?: string;
}

export function useHotelsCatalog() {
  const [hotels, setHotels] = useState<MasterHotel[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHotels = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      let query = supabase.from('hotels').select('*').order('name');
      
      if (search) {
        query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setHotels(data || []);
      return data;
    } catch (err) {
      console.error('Error fetching hotels catalog:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const saveHotel = async (payload: Partial<MasterHotel>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hotels')
        .upsert({
          ...payload,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error saving hotel to catalog:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteHotel = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('hotels')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting hotel from catalog:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    hotels,
    loading,
    fetchHotels,
    saveHotel,
    deleteHotel
  };
}
