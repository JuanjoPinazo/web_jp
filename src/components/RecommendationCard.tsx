'use client';

import React from 'react';
import { Star, MapPin, ChevronRight, User, Calendar, Building, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Recommendation } from '@/types/platform';

interface RecommendationCardProps {
  reco: any; // Using any for RPC response compatibility
  className?: string;
}

export function RecommendationCard({ reco, className }: RecommendationCardProps) {
  const getSourceIcon = (level: string) => {
    switch (level) {
      case 'USER': return <User size={12} className="text-purple-500" />;
      case 'CONTEXT': return <Calendar size={12} className="text-emerald-500" />;
      case 'CLIENT': return <Building size={12} className="text-blue-500" />;
      default: return <Sparkles size={12} className="text-accent" />;
    }
  };

  const getSourceLabel = (level: string) => {
    switch (level) {
      case 'USER': return 'Personalizado';
      case 'CONTEXT': return 'Evento';
      case 'CLIENT': return 'General';
      default: return 'Global';
    }
  };

  return (
    <div className={cn(
      "group relative p-6 rounded-[2rem] bg-surface border border-border hover:border-accent/40 transition-all duration-500 overflow-hidden flex flex-col gap-4",
      className
    )}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold font-heading tracking-tight text-foreground group-hover:text-accent transition-colors">
              {reco.title}
            </h3>
            {reco.rating && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-black">
                <Star size={10} fill="currentColor" />
                {reco.rating}
              </span>
            )}
          </div>
          <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">{reco.categoria}</p>
        </div>
        
        <div className={cn(
          "px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5",
          reco.source_level === 'USER' ? "bg-purple-500/10 border-purple-500/20 text-purple-500" :
          reco.source_level === 'CONTEXT' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
          "bg-blue-500/10 border-blue-500/20 text-blue-500"
        )}>
          {getSourceIcon(reco.source_level)}
          {getSourceLabel(reco.source_level)}
        </div>
      </div>

      <p className="text-xs text-muted/80 leading-relaxed line-clamp-2">
        {reco.descripcion || "Sin descripción disponible para esta recomendación."}
      </p>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-surface bg-background flex items-center justify-center overflow-hidden">
                <img src={`https://i.pravatar.cc/100?u=${reco.id}${i}`} alt="" className="w-full h-full object-cover grayscale opacity-60" />
              </div>
            ))}
          </div>
          <span className="text-[10px] text-muted font-bold">+12 interesados</span>
        </div>
        
        <button className="p-2 rounded-xl bg-background border border-border text-muted group-hover:text-accent group-hover:border-accent/40 transition-all">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Background Subtle Glow */}
      <div className={cn(
        "absolute -right-10 -bottom-10 w-32 h-32 blur-[60px] opacity-0 group-hover:opacity-20 transition-all duration-700 rounded-full pointer-events-none",
        reco.source_level === 'USER' ? "bg-purple-500" :
        reco.source_level === 'CONTEXT' ? "bg-emerald-500" :
        "bg-blue-500"
      )} />
    </div>
  );
}
