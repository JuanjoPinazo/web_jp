'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { mockCases } from '@/data/mock-db';
import { Briefcase, Calendar, ArrowRight, TrendingUp, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { session } = useAuth();
  const userName = session.user?.name || 'Usuario';
  
  // Filter cases for current user
  const cases = mockCases.filter(c => c.userId === session.user?.id);

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-5xl font-black font-heading tracking-tight">
          Bienvenido, {userName}.
        </h1>
        <p className="text-muted text-sm font-medium">
          Organización inteligente y perspectiva estratégica para tus casos activos.
        </p>
      </div>

      {/* Stats/Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Casos Activos', value: cases.length, icon: Briefcase, color: 'text-accent' },
          { label: 'Eventos Próximos', value: cases.reduce((acc, c) => acc + (c.items?.length || 0), 0), icon: Calendar, color: 'text-emerald-500' },
          { label: 'Ubicación Actual', value: 'Valencia', icon: MapPin, color: 'text-amber-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-surface border border-border rounded-3xl p-6 shadow-sm hover:border-accent/30 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-background border border-border transition-colors group-hover:bg-accent group-hover:text-background`}>
                <stat.icon size={20} className={stat.color} />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black">{stat.value}</span>
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Cases Grid */}
      <div className="space-y-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted">Casos en Gestión</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {cases.map((c) => (
            <Link 
              key={c.id} 
              href={`/dashboard/cases/${c.id}`}
              className="group bg-surface border border-border rounded-[2rem] p-6 md:p-8 shadow-sm hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/5 transition-all relative overflow-hidden flex flex-col gap-6 md:gap-8"
            >
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start">
                   <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase text-accent tracking-widest">{c.type}</span>
                      <h4 className="text-2xl font-bold tracking-tight">{c.title}</h4>
                   </div>
                   <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center text-muted group-hover:text-accent group-hover:bg-accent/5 transition-colors">
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                   </div>
                </div>
                <p className="text-sm text-muted leading-relaxed line-clamp-2">
                  {c.description}
                </p>
              </div>

              <div className="pt-6 border-t border-border flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-muted" />
                    <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                      {c.startDate} - {c.endDate}
                    </span>
                 </div>
                 <span className="text-[10px] font-bold text-accent uppercase tracking-widest bg-accent/5 px-3 py-1 rounded-full border border-accent/10">
                    {c.items?.length || 0} items
                 </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
