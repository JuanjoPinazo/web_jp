import React from 'react';
import { GroupedRecommendationList } from '@/components/GroupedRecommendationList';
import { Sparkles, LayoutDashboard } from 'lucide-react';

export default function RecommendationTestPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-12 py-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest mb-4">
            <Sparkles size={12} />
            Inteligencia Estratégica
          </div>
          <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tight">Tu Selección.</h1>
          <p className="text-muted text-sm font-medium uppercase tracking-[0.2em]">Prioridad de capas: Usuario {'>'} Evento {'>'} Cliente</p>
        </div>
        
        <div className="hidden md:flex flex-col items-end gap-1">
          <span className="text-[10px] font-mono text-muted/30 uppercase tracking-[0.5em]">[ ALPHA_V2_2026 ]</span>
          <div className="h-px w-32 bg-gradient-to-l from-border to-transparent" />
        </div>
      </header>

      <GroupedRecommendationList />

      {/* Explicación Técnica */}
      <div className="mt-32 p-12 rounded-[3.5rem] bg-surface border border-border relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <LayoutDashboard size={120} />
         </div>
         <div className="relative z-10 space-y-6">
            <h4 className="font-black uppercase tracking-[0.3em] text-[10px] text-accent">Protocolo de Segmentación Técnica</h4>
            <div className="grid md:grid-cols-2 gap-12">
               <p className="text-sm text-muted leading-relaxed font-medium">
                  Nuestro motor de recomendaciones ejecuta un <code>UNION</code> ponderado en tiempo real. 
                  Primero se extraen los hitos específicos configurados para tu identificador único (Nivel 1), 
                  seguidos de los contextos vinculados a tus eventos activos (Nivel 2), y finalmente 
                  las directrices globales de tu organización (Nivel 3).
               </p>
               <div className="space-y-4">
                  {[
                    { l: 'Nivel 1', t: 'Preferencia Directa' },
                    { l: 'Nivel 2', t: 'Contexto de Viaje' },
                    { l: 'Nivel 3', t: 'Cultura Corporativa' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                       <span className="text-[10px] font-black text-accent w-16">{item.l}</span>
                       <div className="h-0.5 flex-grow bg-border/50" />
                       <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{item.t}</span>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
