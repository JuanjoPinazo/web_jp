'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (session.status === 'unauthenticated') {
      router.push('/login');
    }
  }, [session.status, router]);

  if (session.status === 'loading') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  if (!session.user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar 
        role={session.user.role} 
        userName={`${session.user.name} ${session.user.surname}`}
      />
      
      <main className="md:pl-64 min-h-screen pb-32 md:pb-0 overflow-x-hidden">
        <div className="p-3 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
