'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { mockDossiers } from '@/data/mock-db';
import { restaurants } from '@/data/restaurants';
import { RestaurantCard } from '@/components/RestaurantCard';
import { ArrowLeft, Share2, Printer, MapPin, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/Button';

export default function DossierPage() {
  const params = useParams();
  const router = useRouter();
  const dossierId = params.id as string;
  const dossier = mockDossiers.find(d => d.id === dossierId);

  if (!dossier) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h4 className="text-2xl font-black mb-4 uppercase tracking-widest text-muted">Dossier no encontrado</h4>
        <Button onClick={() => router.push('/dashboard')}>Regresar al panel Principal</Button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Navigation Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <button 
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-muted hover:text-accent font-bold text-[10px] uppercase tracking-[0.3em] transition-all group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Regresar a mis Dossiers
        </button>
        
        <div className="flex gap-4">
           <button className="p-3 bg-surface border border-border rounded-xl text-muted hover:text-accent hover:border-accent/40 transition-all flex items-center justify-center">
              <Share2 size={18} />
           </button>
           <button className="p-3 bg-surface border border-border rounded-xl text-muted hover:text-accent hover:border-accent/40 transition-all flex items-center justify-center">
              <Printer size={18} />
           </button>
        </div>
      </div>

      {/* Hero Header */}
      <header className="p-10 rounded-[3rem] bg-gradient-to-br from-surface to-background/50 border border-border flex flex-col items-center justify-center text-center gap-6 shadow-2xl shadow-accent/5 overflow-hidden relative">
         {/* Background Decoration */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
         
         <div className="flex flex-col items-center gap-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest shadow-inner">
               <Calendar size={12} />
               Publicado: {dossier.date}
            </div>
            <h1 className="text-3xl md:text-5xl font-black font-heading tracking-tighter leading-tight max-w-4xl">
              {dossier.title}
            </h1>
            <p className="text-base text-muted max-w-2xl leading-relaxed">
              {dossier.description}
            </p>
         </div>
         
         <div className="flex flex-wrap justify-center gap-8 pt-6 border-t border-border w-full max-w-3xl">
            <div className="flex flex-col items-center gap-1">
               <span className="text-[10px] font-bold text-muted uppercase tracking-widest opacity-50">Localidades</span>
               <div className="flex items-center gap-2 font-black text-sm uppercase tracking-tight text-foreground">
                  <MapPin size={14} className="text-accent" />
                  Valencia
               </div>
            </div>
            <div className="flex flex-col items-center gap-1">
               <span className="text-[10px] font-bold text-muted uppercase tracking-widest opacity-50">Tipo</span>
               <div className="flex items-center gap-2 font-black text-sm uppercase tracking-tight text-foreground">
                  <FileText size={14} className="text-accent" />
                  Dossier Gastronómico
               </div>
            </div>
         </div>
      </header>

      {/* Recommendations Grid */}
      <div className="space-y-12">
        <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-accent text-center">Selección Estratégica</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {dossier.recommendations.map((rec) => {
            const restaurant = restaurants.find(r => r.id === rec.restaurantId);
            if (!restaurant) return null;
            return (
              <RestaurantCard key={rec.id} restaurant={restaurant} jpScore={rec.jpScore} />
            );
          })}
        </div>
      </div>
    </div>
  );
}
