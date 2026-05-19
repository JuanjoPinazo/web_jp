'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthSession, User } from '@/types/platform';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  session: AuthSession;
  login: (email: string, pass: string) => Promise<boolean>;
  signUp: (email: string, pass: string, name: string, surname: string) => Promise<boolean>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AuthSession>({
    user: null,
    status: 'loading'
  });
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchProfile = useCallback(async (supabaseUser: any) => {
    if (!supabaseUser) {
      setSession({ user: null, status: 'unauthenticated' });
      return;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      // Fallback to metadata if profile fetch fails
      setSession({
        user: {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.name || 'Usuario',
          surname: supabaseUser.user_metadata?.surname || '',
          role: supabaseUser.user_metadata?.role || 'client',
          phone: supabaseUser.user_metadata?.phone || '',
        } as User,
        status: 'authenticated'
      });
      return;
    }

    setSession({
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.nombre || 'Usuario',
        surname: profile.apellidos || '',
        role: profile.role || 'client',
        phone: profile.telefono || '',
        avatar_url: profile.avatar_url,
        client_id: profile.client_id,
        temp_password: profile.temp_password,
        password_updated_at: profile.password_updated_at
      } as User,
      status: 'authenticated'
    });
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.user) {
        await fetchProfile(currentSession.user);
      }
    } catch (err) {
      console.error('Error refreshing session profile:', err);
    }
  }, [fetchProfile]);

  useEffect(() => {
    // Get initial session
    const initSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) {
           if (error.message.includes('Refresh Token') || error.message.includes('not found')) {
             throw error;
           }
        }
        await fetchProfile(currentSession?.user);
      } catch (error: unknown) {
        console.warn('Auth Initialization Error:', error instanceof Error ? error.message : String(error));
        
        // 1. Clear session locally first
        setSession({ user: null, status: 'unauthenticated' });
        
        // 2. Safely and dynamically clean up all local storage supabase auth tokens
        if (typeof window !== 'undefined') {
          try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
          } catch (storageErr) {
            console.error('Failed to clear localStorage auth tokens:', storageErr);
          }
        }
        
        // 3. Attempt network signout but handle failure gracefully so it doesn't block local cleanup
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.warn('Sign out during cleanup failed:', signOutError);
        }
      }
    };

    initSession();

    // Listen for auth changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, currentSession) => {
      if (_event === 'SIGNED_OUT' || (_event === 'TOKEN_REFRESHED' && !currentSession)) {
         setSession({ user: null, status: 'unauthenticated' });
      } else {
        fetchProfile(currentSession?.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = async (email: string, pass: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) {
        console.warn('Login failed:', error.message);
        return false;
      }
      return true;
    } catch (err: unknown) {
      console.warn('Login error:', err instanceof Error ? err.message : String(err));
      return false;
    }
  };

  const signUp = async (email: string, pass: string, name: string, surname: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            name,
            surname,
            role: 'client'
          }
        }
      });
      if (error) {
        console.warn('Signup failed:', error.message);
        return false;
      }
      return true;
    } catch (err: unknown) {
      console.warn('Signup error:', err instanceof Error ? err.message : String(err));
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out request failed:', err);
    }
    
    // Always clear local session and state
    setSession({
      user: null,
      status: 'unauthenticated'
    });
    
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch (storageErr) {
        console.error('Failed to clear localStorage auth tokens on logout:', storageErr);
      }
    }
    
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ session, login, signUp, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
