'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Loader2, Menu } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (session.status === 'unauthenticated') {
      router.push('/login');
    }
  }, [session.status, router]);

  // Close sidebar on route change (optional but good practice)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [router]);

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
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <main className="lg:pl-64 min-h-screen">
        {/* Mobile Header Trigger */}
        <div className="lg:hidden p-4 border-b border-border bg-surface/50 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-background font-black text-sm">JP</div>
              <span className="font-bold text-xs uppercase tracking-tight">Platform</span>
           </div>
           <button 
             onClick={() => setIsSidebarOpen(true)}
             className="p-2 rounded-xl bg-surface border border-border text-muted hover:text-foreground transition-colors"
           >
             <Menu size={20} />
           </button>
        </div>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
