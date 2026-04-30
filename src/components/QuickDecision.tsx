import React from 'react';
import { Restaurant } from '@/data/restaurants';
import { Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';
import Image from 'next/image';
import Link from 'next/link';

export const QuickDecision = ({ restaurant }: { restaurant: Restaurant }) => {
  return (
    <div className="mb-16 p-1 rounded-3xl bg-gradient-to-r from-accent/20 via-border to-accent/5">
      <div className="bg-surface rounded-[calc(1.5rem-1px)] p-8 md:p-10 relative overflow-hidden group">
        {/* Decorative Background Flash */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/10 rounded-full blur-[80px] group-hover:bg-accent/15 transition-colors" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
              <Zap size={14} className="text-accent fill-accent" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase">Decisión Rápida</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-extrabold font-heading tracking-tight leading-tight">
              El equilibrio óptimo entre <br />
              <span className="text-accent underline decoration-accent/30 underline-offset-8">calidad, espacio y flexibilidad</span>
            </h2>
            
            <div className="flex items-start gap-3 p-4 rounded-xl bg-background/50 border border-border/50">
              <CheckCircle2 size={18} className="text-accent mt-0.5 shrink-0" />
              <p className="text-sm text-muted leading-relaxed">
                Recomendación prioritaria para este domingo: <strong className="text-foreground">{restaurant.name}</strong>. 
                {restaurant.specialty}. Ideal para grupos con necesidades logísticas específicas.
              </p>
            </div>
            
            <div className="pt-4 flex flex-wrap gap-4">
              <a href={restaurant.bookingUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="gap-2">
                  Reserva Prioritaria <ArrowRight size={16} />
                </Button>
              </a>
            </div>
          </div>
          
          <div className="w-full md:w-80 aspect-[4/3] md:aspect-square rounded-2xl overflow-hidden border border-border shadow-2xl relative shadow-accent/10">
             <Image
               src={restaurant.imageUrl}
               alt={restaurant.name}
               fill
               sizes="(max-width: 768px) 100vw, 320px"
               className="object-cover transition-transform duration-700 group-hover:scale-105"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

             <div className="absolute inset-0 bg-accent/10 mix-blend-overlay" />
             <div className="absolute bottom-4 left-4 z-20">
                <span className="px-3 py-1 rounded-lg bg-background/90 backdrop-blur text-[10px] font-bold text-accent border border-accent/20 uppercase tracking-widest">Unidad Seleccionada</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
