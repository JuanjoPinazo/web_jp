'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { mockDossiers } from '@/data/mock-db';
import { FileText, Calendar, ArrowRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { session } = useAuth();
  const userName = session.user?.name || 'Usuario';
  
  // Filter dossiers for current user
  const dossiers = mockDossiers.filter(d => d.userId === session.user?.id);

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-5xl font-black font-heading tracking-tight">
          Bienvenido, {userName}.
        </h1>
        <p className="text-muted text-sm font-medium">
          Aquí tienes tus dossieres de recomendaciones inteligentes.
        </p>
      </div>

      {/* Stats/Overview (Optional for SaaS feel) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Dossiers Activos', value: dossiers.length, icon: FileText, color: 'text-accent' },
          { label: 'Total Recoms.', value: dossiers.reduce((acc, d) => acc + d.recommendations.length, 0), icon: TrendingUp, color: 'text-emerald-500' },
          { label: 'Última Actualización', value: 'Hoy', icon: Calendar, color: 'text-amber-500' },
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

      {/* Dossiers Grid */}
      <div className="space-y-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted">Dossieres Disponibles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {dossiers.map((dossier) => (
            <Link 
              key={dossier.id} 
              href={`/dashboard/dossiers/${dossier.id}`}
              className="group bg-surface border border-border rounded-[2rem] p-6 md:p-8 shadow-sm hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/5 transition-all relative overflow-hidden flex flex-col gap-6 md:gap-8"
            >
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start">
                   <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase text-accent tracking-widest">{dossier.date}</span>
                      <h4 className="text-2xl font-bold tracking-tight">{dossier.title}</h4>
                   </div>
                   <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center text-muted group-hover:text-accent group-hover:bg-accent/5 transition-colors">
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                   </div>
                </div>
                <p className="text-sm text-muted leading-relaxed line-clamp-2">
                  {dossier.description}
                </p>
              </div>

              <div className="pt-6 border-t border-border flex items-center gap-4">
                 <div className="flex -space-x-3">
                    {[1, 2, 3].map(i => (
                       <div key={i} className="w-8 h-8 rounded-full border-2 border-surface bg-background flex items-center justify-center text-[10px] font-black uppercase text-accent/50">
                          {i}
                       </div>
                    ))}
                 </div>
                 <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                    {dossier.recommendations.length} Recomendaciones técnicas
                 </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
