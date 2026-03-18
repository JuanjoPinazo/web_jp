'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { mockDossiers } from '@/data/mock-db';
import { restaurants } from '@/data/restaurants';
import { RestaurantCard } from '@/components/RestaurantCard';
import { Sparkles, MapPin, Calendar } from 'lucide-react';

export default function DashboardPage() {
  const { session } = useAuth();
  const userName = session.user?.name || 'Usuario';
  
  // Find the primary dossier for the user
  const dossier = mockDossiers.find(d => d.userId === session.user?.id);

  // Map recommendations to actual restaurant data
  const recommendedRestaurants = dossier?.recommendations.map(rec => {
    const restaurant = restaurants.find(r => r.id === rec.restaurantId);
    return {
      ...restaurant!,
      jpScore: rec.jpScore,
      personalNote: rec.personalNote
    };
  }) || [];

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-5xl font-black font-heading tracking-tight">
          Hola, {userName}.
        </h1>
        <p className="text-muted text-sm font-medium">
          Aquí tienes tu selección curada de experiencias gastronómicas en Valencia.
        </p>
      </div>

      {/* Stats/Quick Glance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Recomendaciones', value: recommendedRestaurants.length, icon: Sparkles, color: 'text-accent' },
          { label: 'Ubicación Proyectada', value: 'Valencia', icon: MapPin, color: 'text-emerald-500' },
          { label: 'Próximo Domingo', value: '17 Oct', icon: Calendar, color: 'text-amber-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-surface border border-border rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-background border border-border`}>
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

      {/* Grid de Restaurantes */}
      <div className="space-y-8">
        <div className="flex items-center gap-3">
           <div className="h-px flex-1 bg-border/50"></div>
           <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted shrink-0 px-4">Propuesta Técnica Gastronómica</h3>
           <div className="h-px flex-1 bg-border/50"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {recommendedRestaurants.map((restaurant) => (
            <RestaurantCard 
              key={restaurant.id} 
              restaurant={restaurant} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}
