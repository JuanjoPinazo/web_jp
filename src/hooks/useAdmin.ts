'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/platform';

export const useAdmin = () => {
  const { session } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session.status === 'unauthenticated') {
      router.push('/login');
    } else if (session.status === 'authenticated' && session.user) {
      if (session.user.role === 'admin') {
        setIsAdmin(true);
        setLoading(false);
      } else {
        setIsAdmin(false);
        setLoading(false);
        router.push('/dashboard');
      }
    }
  }, [session, router]);

  const getUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, context_users(context_id)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Map database columns to interface properties
      const mappedUsers = (data || []).map((u: any) => ({
        ...u,
        name: u.nombre || '',
        surname: u.apellidos || '',
        phone: u.telefono || ''
      }));
      
      return mappedUsers as User[];
    } catch (err) {
      console.warn('Error fetching users, returning empty array:', err);
      return [];
    }
  }, []);

  const updateUserRole = useCallback(async (userId: string, role: 'admin' | 'client') => {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);
    if (error) throw error;
  }, []);

  const getClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*, hospitals(name), departments(name)')
        .order('name');
      
      if (error) {
        console.warn("⚠️ Database query for 'clients' failed. Attempting basic fallback.", error.message);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('clients')
          .select('*')
          .order('name');
        
        if (fallbackError) {
          console.error("❌ Critical: Basic fallback for 'clients' also failed.", fallbackError.message);
          throw fallbackError;
        }
        return fallbackData;
      }
      return data;
    } catch (err: any) {
      console.warn('Error in getClients:', err.message || err);
      throw err;
    }
  }, []);

  const getHospitals = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .order('name');
      
      if (error) {
        if (error.message.includes('hospitals')) {
          console.warn("⚠️ Table 'hospitals' missing. Returning empty array.");
          return [];
        }
        throw error;
      }
      return data;
    } catch (err: any) {
      console.warn('Error in getHospitals:', err.message || err);
      return []; // Silently fail for UI stability
    }
  }, []);

  const createClient = useCallback(async (name: string, domain?: string, hospital_id?: string, department_id?: string) => {
    // Attempt with all columns
    const { data, error } = await supabase
      .from('clients')
      .insert({ name, domain, hospital_id, department_id })
      .select()
      .single();
    
    if (error) {
      console.warn("⚠️ Full client creation failed, trying basic insert.", error.message);
      // Fallback: basic insert
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('clients')
        .insert({ name })
        .select()
        .single();
      
      if (fallbackError) {
        console.error("❌ Critical: Basic client creation also failed.", fallbackError.message);
        throw fallbackError;
      }
      return fallbackData;
    }
    return data;
  }, []);

  const updateClient = useCallback(async (id: string, payload: any) => {
    const { data, error } = await supabase
      .from('clients')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.warn("⚠️ Full client update failed, trying name-only update.", error.message);
      // Fallback: only update name if it exists in payload
      const basicPayload = payload.name ? { name: payload.name } : {};
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('clients')
        .update(basicPayload)
        .eq('id', id)
        .select()
        .single();
      
      if (fallbackError) {
        console.error("❌ Critical: Basic client update also failed.", fallbackError.message);
        throw fallbackError;
      }
      return fallbackData;
    }
    return data;
  }, []);

  const deleteClient = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }, []);

  const getContexts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('contexts')
        .select('*, context_clients(client_id, clients(name))')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn("⚠️ Database query for 'contexts' failed. Attempting basic fallback.", error.message);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('contexts')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (fallbackError) {
          console.error("❌ Critical: Basic fallback for 'contexts' also failed.", fallbackError.message);
          throw fallbackError;
        }
        return fallbackData;
      }
      return data;
    } catch (err: any) {
      console.warn('Error in getContexts:', err.message || err);
      throw err;
    }
  }, []);

  const createContext = useCallback(async (payload: { name: string, type: string, location?: string, description?: string, start_date?: string, end_date?: string }) => {
    const { data, error } = await supabase
      .from('contexts')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }, []);

  const updateContext = useCallback(async (id: string, payload: any) => {
    const { data, error } = await supabase
      .from('contexts')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }, []);

  const deleteContext = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('contexts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }, []);

  const assignUserToContext = useCallback(async (user_id: string, context_id: string) => {
    const { error } = await supabase
      .from('context_users')
      .insert({ user_id, context_id });
    if (error) throw error;
  }, []);

  const assignClientToContext = useCallback(async (client_id: string, context_id: string) => {
    const { error } = await supabase
      .from('context_clients')
      .insert({ client_id, context_id });
    if (error) throw error;
  }, []);

  const removeClientFromContext = useCallback(async (client_id: string, context_id: string) => {
    const { error } = await supabase
      .from('context_clients')
      .delete()
      .eq('client_id', client_id)
      .eq('context_id', context_id);
    if (error) throw error;
  }, []);

  const updateUserClient = useCallback(async (user_id: string, client_id: string | null) => {
    const { error } = await supabase
      .from('profiles')
      .update({ client_id })
      .eq('id', user_id);
    if (error) throw error;
  }, []);

  return {
    isAdmin,
    loading: loading || session.status === 'loading',
    getUsers,
    updateUserRole,
    getHospitals,
    getClients,
    createClient,
    getContexts,
    createContext,
    assignUserToContext,
    assignClientToContext,
    removeClientFromContext,
    updateUserClient,
    updateClient,
    deleteClient,
    updateContext,
    deleteContext
  };
};
