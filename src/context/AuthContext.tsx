'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthSession } from '@/types/platform';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  session: AuthSession;
  login: (email: string, pass: string) => Promise<boolean>;
  signUp: (email: string, pass: string, name: string, surname: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AuthSession>({
    user: null,
    status: 'loading'
  });
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async (supabaseUser: any) => {
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
          },
          status: 'authenticated'
        } as any);
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
          client_id: profile.client_id
        },
        status: 'authenticated'
      } as any);
    };

    // Get initial session
    const initSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) {
           if (error.message.includes('Refresh Token') || error.message.includes('not found')) {
             throw error;
           }
        }
        fetchProfile(currentSession?.user);
      } catch (error: any) {
        console.warn('Auth Initialization Error:', error.message);
        await supabase.auth.signOut();
        setSession({ user: null, status: 'unauthenticated' });
        if (typeof window !== 'undefined') {
          const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1].split('.')[0];
          localStorage.removeItem(`sb-${projectRef}-auth-token`);
        }
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, currentSession) => {
      if (_event === 'SIGNED_OUT' || (_event === 'TOKEN_REFRESHED' && !currentSession)) {
         setSession({ user: null, status: 'unauthenticated' });
      } else {
        fetchProfile(currentSession?.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
    } catch (err: any) {
      console.warn('Login error:', err.message || err);
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
    } catch (err: any) {
      console.warn('Signup error:', err.message || err);
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession({
      user: null,
      status: 'unauthenticated'
    });
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ session, login, signUp, logout }}>
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
