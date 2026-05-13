import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface MasterRestaurant {
  id: string;
  name: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  cuisine_type?: string;
  google_place_id?: string;
  latitude?: number;
  longitude?: number;
  preferred: boolean;
  rating?: number;
  price_level?: number;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

export function useRestaurantsCatalog() {
  const [restaurants, setRestaurants] = useState<MasterRestaurant[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRestaurants = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      let query = supabase.from('restaurants_master').select('*').order('name');
      
      if (search) {
        query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,cuisine_type.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRestaurants(data || []);
      return data;
    } catch (err) {
      console.error('Error fetching restaurants catalog:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const saveRestaurant = async (payload: Partial<MasterRestaurant>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurants_master')
        .upsert({
          ...payload,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error saving restaurant to catalog:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteRestaurant = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('restaurants_master')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting restaurant from catalog:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    restaurants,
    loading,
    fetchRestaurants,
    saveRestaurant,
    deleteRestaurant
  };
}
