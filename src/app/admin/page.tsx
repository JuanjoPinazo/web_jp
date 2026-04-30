'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Building2, 
  Users, 
  Calendar, 
  Sparkles, 
  ArrowUpRight, 
  Plus, 
  LayoutDashboard,
  Clock
} from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [stats, setStats] = useState([
    { label: 'clientes', value: '0', icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10', href: '/admin/clients' },
    { label: 'usuarios', value: '0', icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10', href: '/admin/users' },
    { label: 'contextos', value: '0', icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-500/10', href: '/admin/contexts' },
    { label: 'recomendaciones', value: '0', icon: Sparkles, color: 'text-accent', bg: 'bg-accent/10', href: '/admin/recommendations' },
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          { count: clientsCount },
          { count: usersCount },
          { count: contextsCount },
          { count: recosCount }
        ] = await Promise.all([
          supabase.from('clients').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('contexts').select('*', { count: 'exact', head: true }),
          supabase.from('recommendations').select('*', { count: 'exact', head: true }),
        ]);

        setStats(prev => [
          { ...prev[0], value: (clientsCount || 0).toString() },
          { ...prev[1], value: (usersCount || 0).toString() },
          { ...prev[2], value: (contextsCount || 0).toString() },
          { ...prev[3], value: (recosCount || 0).toString() },
        ]);
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-1 h-12 bg-accent rounded-full hidden md:block" />
        <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tight">Consola.</h1>
        <p className="text-muted text-xs font-bold uppercase tracking-[0.4em] opacity-70">JP Intelligence Management System</p>
      </header>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Link 
              key={i} 
              href={stat.href}
              className="group p-6 rounded-[2.5rem] bg-surface/50 backdrop-blur-sm border border-border shadow-sm hover:border-accent/30 hover:bg-surface transition-all active:scale-95 flex flex-col justify-between min-h-[180px]"
            >
              <div className="flex justify-between items-start">
                <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center transition-transform group-hover:scale-110 duration-500`}>
                  <Icon size={24} />
                </div>
                <div className="p-2 rounded-full bg-muted/5 group-hover:bg-accent/10 transition-colors">
                  <ArrowUpRight size={16} className="text-muted group-hover:text-accent transition-colors" />
                </div>
              </div>
              <div className="space-y-1 mt-4">
                <p className="text-4xl font-black font-heading tracking-tight">{stat.value}</p>
                <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">{stat.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Quick Actions Container */}
        <div className="lg:col-span-8 flex flex-col gap-6">
           <div className="p-8 md:p-10 rounded-[3.5rem] bg-surface border border-border overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[80px] rounded-full group-hover:bg-accent/10 transition-all duration-1000" />
              
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-black font-heading flex items-center gap-3">
                   <LayoutDashboard className="text-accent" size={28} />
                   Accesos Rápidos
                </h3>
                <div className="px-4 py-1.5 rounded-full bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest">
                  Operativo
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {[
                   { label: 'Nueva Recomendación', href: '/admin/recommendations', icon: Sparkles, desc: 'Generar contenido para usuarios' },
                   { label: 'Revisar Solicitudes', href: '/admin/requests', icon: Clock, desc: 'Pendientes de aprobación' },
                   { label: 'Registrar Cliente', href: '/admin/clients', icon: Building2, desc: 'Alta de nuevas instituciones' },
                   { label: 'Gestión de Usuarios', href: '/admin/users', icon: Users, desc: 'Panel de control de acceso' },
                 ].map((action, i) => (
                   <Link 
                     key={i} 
                     href={action.href}
                     className="p-6 rounded-3xl bg-background border border-border hover:border-accent/30 hover:bg-accent/[0.02] hover:shadow-xl hover:shadow-accent/5 transition-all flex items-start gap-4 active:scale-[0.98] group/item"
                   >
                     <div className="w-12 h-12 rounded-2xl bg-muted/5 flex items-center justify-center text-accent group-hover/item:bg-accent group-hover/item:text-background transition-all duration-500">
                        <action.icon size={22} />
                     </div>
                     <div className="space-y-1">
                        <p className="text-sm font-bold group-hover/item:text-accent transition-colors">{action.label}</p>
                        <p className="text-[10px] text-muted font-medium leading-relaxed">{action.desc}</p>
                     </div>
                   </Link>
                 ))}
              </div>
           </div>
        </div>

        {/* Sidebar Mini-section for Recent Activity / Info */}
        <div className="lg:col-span-4 space-y-6">
           <div className="p-10 rounded-[3.5rem] bg-accent text-background text-center flex flex-col items-center justify-center gap-6 shadow-2xl shadow-accent/20 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-16 h-16 rounded-[2rem] bg-background text-accent flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform duration-500">
                 <Sparkles size={32} />
              </div>
              <div className="space-y-2 relative z-10">
                 <p className="text-xl font-black uppercase tracking-tight">JP Admin v2.0</p>
                 <div className="flex items-center justify-center gap-2">
                   <div className="w-2 h-2 bg-background rounded-full animate-pulse" />
                   <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] opacity-80">Engine: Online</p>
                 </div>
              </div>
           </div>
           
           <div className="p-8 rounded-[3.5rem] bg-surface border border-border space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted border-b border-border pb-4 flex items-center justify-between">
                Estado del Sistema
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              </h4>
              <div className="space-y-5">
                 <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                       <span>Multitenancy</span>
                       <span className="text-accent">ACTIVE</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted/10 rounded-full overflow-hidden">
                       <div className="h-full w-[90%] bg-accent rounded-full" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                       <span>Smart Priority</span>
                       <span className="text-emerald-500">OPTIMIZED</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted/10 rounded-full overflow-hidden">
                       <div className="h-full w-[100%] bg-emerald-500 rounded-full" />
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
