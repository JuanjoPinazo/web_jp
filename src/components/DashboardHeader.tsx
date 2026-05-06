'use client';

import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import Link from 'next/link';

export const DashboardHeader = () => {
  const { logout, session } = useAuth();
  const { confirm } = useDialog();

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Cerrar sesión',
      message: '¿Estás seguro de que deseas cerrar la sesión actual?',
      type: 'warning',
      confirmText: 'Cerrar sesión'
    });
    if (ok) logout();
  };

  const initials = `${session.user?.name?.[0] || ''}${session.user?.surname?.[0] || ''}`.toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 pt-[calc(1rem+env(safe-area-inset-top))] pb-4 px-6 mb-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Mobile Logo / Placeholder for brand info if needed */}
        <div className="md:hidden flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-black text-xs">JP</div>
           <span className="font-bold text-xs tracking-tight">Intelligence</span>
        </div>

        <div className="hidden md:block" />

        <div className="flex items-center gap-4">
          <Link 
            href="/profile"
            className="flex items-center gap-3 px-3 py-1.5 rounded-full border border-border bg-surface hover:border-accent/30 transition-all group"
          >
            <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-accent text-[8px] font-black uppercase">
              {initials}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-foreground hidden sm:block">
              {session.user?.name}
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="p-2.5 rounded-full border border-border bg-surface text-muted hover:text-red-400 hover:border-red-400/30 transition-all shadow-sm"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
