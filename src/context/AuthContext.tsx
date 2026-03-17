'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthSession } from '@/types/platform';
import { mockUsers } from '@/data/mock-db';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  session: AuthSession;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AuthSession>({
    user: null,
    status: 'loading'
  });
  const router = useRouter();

  // Load session from localStorage for mock persistence
  useEffect(() => {
    const savedUser = localStorage.getItem('jp_user');
    if (savedUser) {
      setSession({
        user: JSON.parse(savedUser),
        status: 'authenticated'
      });
    } else {
      setSession({
        user: null,
        status: 'unauthenticated'
      });
    }
  }, []);

  const login = async (email: string, pass: string) => {
    // Mock login
    const user = mockUsers.find(u => u.email === email && u.password === pass);
    if (user) {
      localStorage.setItem('jp_user', JSON.stringify(user));
      setSession({
        user,
        status: 'authenticated'
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('jp_user');
    setSession({
      user: null,
      status: 'unauthenticated'
    });
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
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
