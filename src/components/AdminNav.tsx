'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Building2, 
  Calendar, 
  Sparkles, 
  Users, 
  LayoutDashboard, 
  ArrowLeft, 
  Settings,
  Clock,
  MapPin,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';

const adminLinks = [
  { href: '/admin', label: 'Inicio', icon: LayoutDashboard },
  { href: '/admin/clients', label: 'Clientes', icon: Building2 },
  { href: '/admin/contexts', label: 'Eventos', icon: Calendar },
  { href: '/admin/recommendations', label: 'Recomendaciones', icon: Sparkles },
  { href: '/admin/plans', label: 'Logística', icon: MapPin },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-surface border-r border-border flex-col p-6 z-50">
        <div className="mb-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Logo className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black font-heading tracking-tight uppercase">Admin.</span>
            <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em]">Management</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5">
          <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-4 ml-4">Main Menu</p>
          {adminLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
            
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 group relative overflow-hidden",
                  isActive 
                    ? "bg-accent text-background shadow-lg shadow-accent/25" 
                    : "text-muted hover:bg-accent/5 hover:text-foreground"
                )}
              >
                <Icon size={18} className={cn("relative z-10 transition-colors duration-300", isActive ? "text-background" : "text-muted group-hover:text-accent")} />
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
          
          <div className="pt-6">
            <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-4 ml-4">System</p>
            {[
              { href: '/admin/requests', label: 'Solicitudes', icon: Clock },
              { href: '/admin/catalogs', label: 'Catálogos', icon: Database },
            ].map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 group",
                    isActive ? "bg-accent/10 text-accent" : "text-muted hover:bg-accent/5 hover:text-foreground"
                  )}
                >
                  <Icon size={18} />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="pt-6 border-t border-border space-y-2">
          <Link 
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-muted hover:bg-accent/5 transition-all group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Volver a la App
          </Link>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-muted hover:bg-red-500/5 hover:text-red-500 transition-all opacity-60">
            <Settings size={18} />
            Configuración
          </button>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-8 pt-2">
        <div className="bg-surface/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-around p-2 relative overflow-hidden">
          {/* Subtle Glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-accent/5 pointer-events-none" />
          
          {adminLinks.map((item) => {
            const Icon = item.icon;
            // The user wants Clients, Events, Recos, Users on mobile.
            // Dashboard is '/' or '/admin'.
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className="relative flex flex-col items-center justify-center py-2 px-3 transition-all duration-300 active:scale-90"
              >
                {isActive && (
                  <div className="absolute inset-x-1 inset-y-1 bg-accent/10 rounded-2xl animate-in zoom-in-95 duration-300" />
                )}
                
                <div className={cn(
                  "relative z-10 transition-all duration-300 flex flex-col items-center gap-1",
                  isActive ? "text-accent scale-110" : "text-muted/60"
                )}>
                  <Icon 
                    size={22} 
                    strokeWidth={isActive ? 2.5 : 2} 
                  />
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-[0.15em] transition-all",
                    isActive ? "opacity-100" : "opacity-0 h-0"
                  )}>
                    {item.label === 'Inicio' ? 'Admin' : item.label.slice(0, 8)}
                  </span>
                </div>
                {isActive && (
                  <div className="absolute -bottom-1.5 w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_12px_rgba(var(--accent-rgb),0.8)]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
