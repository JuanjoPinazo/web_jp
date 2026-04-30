'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { RecommendationCard } from './RecommendationCard';
import { Loader2, Sparkles, User, Calendar, Sparkle, Car, Utensils, Info } from 'lucide-react';

interface GroupedRecos {
  USER: any[];
  CONTEXT: any[];
  CLIENT: any[];
  TRANSPORT?: any[];
  RESTAURANTS?: any[];
}

export function GroupedRecommendationList() {
  const { session } = useAuth();
  const [recos, setRecos] = useState<GroupedRecos>({ USER: [], CONTEXT: [], CLIENT: [], TRANSPORT: [], RESTAURANTS: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session.user?.id) {
      loadRecommendations();
    }
  }, [session.user]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_recommendations', {
        target_user_id: session.user?.id
      });

      if (error) throw error;

      // Group by level and category
      const grouped = (data || []).reduce((acc: GroupedRecos, reco: any) => {
        const cat = (reco.categoria || '').toLowerCase();
        
        if (cat.includes('transporte') || cat.includes('vuelo') || cat.includes('traslado')) {
          acc.TRANSPORT!.push(reco);
        } else if (cat.includes('restaurante') || cat.includes('gastronomía') || cat.includes('cena')) {
          acc.RESTAURANTS!.push(reco);
        } else if (reco.source_level === 'USER') {
          acc.USER.push(reco);
        } else if (reco.source_level === 'CONTEXT') {
          acc.CONTEXT.push(reco);
        } else {
          acc.CLIENT.push(reco);
        }
        return acc;
      }, { USER: [], CONTEXT: [], CLIENT: [], TRANSPORT: [], RESTAURANTS: [] });

      setRecos(grouped);
    } catch (err: any) {
      console.error('Error loading recommendations:', err.message || err, err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="animate-spin text-accent" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted">Orquestando tu experiencia...</p>
      </div>
    );
  }

  const sections = [
    { key: 'USER', label: 'Tu Plan', icon: User, color: 'text-purple-500', bg: 'bg-purple-500/10', items: recos.USER },
    { key: 'CONTEXT', label: 'Tu Evento', icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-500/10', items: recos.CONTEXT },
    { key: 'TRANSPORT', label: 'Transporte', icon: Car, color: 'text-blue-500', bg: 'bg-blue-500/10', items: recos.TRANSPORT || [] },
    { key: 'RESTAURANTS', label: 'Restaurantes', icon: Utensils, color: 'text-amber-500', bg: 'bg-amber-500/10', items: recos.RESTAURANTS || [] },
    { key: 'CLIENT', label: 'Recomendaciones adicionales', icon: Sparkle, color: 'text-accent', bg: 'bg-accent/10', items: recos.CLIENT },
  ].filter(s => s.items.length > 0);

  if (sections.length === 0) {
    return (
      <div className="p-12 rounded-[3.5rem] bg-surface/50 border border-dashed border-border text-center">
        <Info size={32} className="mx-auto text-muted/20 mb-4" />
        <p className="text-muted text-sm font-medium">Todo bajo control. No hay micro-decisiones pendientes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-16 animate-in fade-in duration-700">
      {sections.map((section) => (
        <div key={section.key} className="space-y-8">
          <div className="flex items-center gap-4 px-2">
            <div className={`w-12 h-12 rounded-[1.25rem] ${section.bg} flex items-center justify-center ${section.color} border border-white/5`}>
              <section.icon size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-black font-heading tracking-tight">{section.label}</h2>
              <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">
                {section.items.length} {section.items.length === 1 ? 'opción disponible' : 'opciones disponibles'}
              </p>
            </div>
            <div className="flex-grow h-px bg-gradient-to-r from-border to-transparent ml-4 opacity-50" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {section.items.map((reco) => (
              <RecommendationCard key={reco.id} reco={reco} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
