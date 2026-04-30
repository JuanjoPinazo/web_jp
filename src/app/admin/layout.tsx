'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { AdminNav } from '@/components/AdminNav';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (session.status === 'unauthenticated') {
      router.push('/admin/login');
    } else if (session.status === 'authenticated' && session.user?.role !== 'admin') {
      router.push('/');
    }
  }, [session, router]);

  if (session.status === 'loading' || (session.status === 'authenticated' && session.user?.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center gap-4">
        <Loader2 className="animate-spin text-accent" size={40} />
        <div className="space-y-1">
          <p className="font-heading font-bold text-xl">Verificando Credenciales</p>
          <p className="text-muted text-sm">Validando nivel de acceso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AdminNav />
      
      <main className="flex-1 md:ml-64 min-h-screen p-4 md:p-12 pb-32 md:pb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
