'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface Profile {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  avatar_url?: string | null;
  updated_at?: string;
}

export const useUser = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (session.status === 'authenticated' && session.user) {
      fetchProfile();
    } else if (session.status === 'unauthenticated') {
      setLoading(false);
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user?.id)
        .single();

      if (error) {
        // If profile doesn't exist, we might want to create it or just return mock based on session
        console.warn('Profile not found in Supabase, using session data.');
        setProfile({
          id: session.user?.id || '',
          name: session.user?.name || '',
          surname: session.user?.surname || '',
          email: session.user?.email || '',
          phone: session.user?.phone || '',
        });
      } else {
        setProfile({
          id: data.id,
          name: data.nombre || '',
          surname: data.apellidos || '',
          email: data.email || '',
          phone: data.telefono || '',
          avatar_url: data.avatar_url || null,
          updated_at: data.updated_at
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      setLoading(true);
      setSuccess(false);
      setError(null);

      const dbPayload: any = {};

      if (updates.name !== undefined) dbPayload.nombre = updates.name;
      if (updates.surname !== undefined) dbPayload.apellidos = updates.surname;
      if (updates.phone !== undefined) dbPayload.telefono = updates.phone;
      if (updates.email !== undefined) dbPayload.email = updates.email;

      // Only send updated_at if we want to force it from client, 
      // but it's better to let the DB handle it via trigger.
      // For now, let's remove it to avoid the "column not found" error 
      // until the user runs the SQL migration.
      // dbPayload.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('profiles')
        .update(dbPayload)
        .eq('id', session.user?.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updates } : null);
      setSuccess(true);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    user: session.user,
    profile,
    loading: loading || session.status === 'loading',
    error,
    success,
    updateProfile,
    refreshProfile: fetchProfile,
  };
};
