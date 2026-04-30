import React from 'react';
import { Restaurant, IconType } from '@/data/restaurants';
import { JPScore } from '@/types/platform';
import { Anchor, Waves, Utensils, TreePine, Baby, MapPin, Phone, Globe, Star, ExternalLink, Activity, Target } from 'lucide-react';
import { Button } from './Button';

import Image from 'next/image';

const IconMap: Record<IconType, React.ReactNode> = {
  Anchor: <Anchor size={20} />,
  Waves: <Waves size={20} />,
  Utensils: <Utensils size={20} />,
  TreePine: <TreePine size={20} />,
  Baby: <Baby size={20} />,
};

export const RestaurantCard = ({ 
  restaurant, 
  jpScore 
}: { 
  restaurant: Restaurant;
  jpScore?: JPScore;
}) => {
  return (
    <div className="group overflow-hidden rounded-3xl border border-border bg-surface transition-all duration-500 hover:border-accent/40 shadow-sm hover:shadow-2xl hover:shadow-accent/5">
      {/* Image Header */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden bg-muted/20">
        <Image
          src={restaurant.imageUrl}
          alt={restaurant.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-1000 group-hover:scale-110"
          priority={restaurant.id === '1'} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
        
        {/* Rating Floating Badge */}
        <div className="absolute top-6 right-6 flex items-center gap-1.5 bg-surface/80 backdrop-blur-xl px-4 py-2 rounded-2xl border border-border/50 shadow-2xl">
          <Star size={14} className="fill-accent text-accent" />
          <span className="text-sm font-black text-foreground">{restaurant.rating}</span>
        </div>
      </div>

      {/* Header Info */}
      <div className="px-6 py-8 md:px-10 border-b border-border relative overflow-hidden">
        {/* Decorative subtle glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/5 blur-[40px] rounded-full pointer-events-none" />
        
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 bg-background rounded-2xl border border-border flex items-center justify-center text-accent shadow-sm group-hover:border-accent/40 transition-all duration-500">
            {IconMap[restaurant.iconName]}
          </div>
          <span className="text-[10px] font-black uppercase text-accent bg-accent/10 px-3 py-1.5 rounded-full border border-accent/20 tracking-widest">
            {restaurant.badge}
          </span>
        </div>
        
        <h3 className="text-3xl md:text-4xl font-black font-heading mb-2 tracking-tight leading-tight group-hover:text-accent transition-colors duration-500">{restaurant.name}</h3>
        <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] leading-none opacity-60">
          {restaurant.tagline}
        </p>
      </div>
      
      {/* Dynamic Content Sections */}
      <div className="px-6 py-8 md:px-10 space-y-10">
        {/* JP Insight Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-accent" />
              <span className="text-[10px] font-black uppercase tracking-widest text-accent">Perspectiva JP</span>
            </div>
            
            {/* JP Score Visualization */}
            <div className="flex gap-2">
               {[
                 { label: 'Q', score: jpScore?.quality || 0 },
                 { label: 'L', score: jpScore?.logistics || 0 },
                 { label: 'E', score: jpScore?.experience || 0 }
               ].map((s) => (
                 <div key={s.label} className="flex flex-col items-center">
                   <span className="text-[8px] font-black text-muted/30 mb-1">{s.label}</span>
                   <div className="w-8 h-8 rounded-xl bg-accent/5 border border-accent/10 flex items-center justify-center text-[11px] font-black text-accent shadow-sm">
                     {s.score}
                   </div>
                 </div>
               ))}
            </div>
          </div>
          <p className="text-base text-foreground font-medium leading-relaxed">
            {restaurant.specialty}
          </p>
        </section>
        
        {/* Operational Fit Section */}
        <section className="bg-background/40 rounded-3xl border border-border/50 p-6 relative overflow-hidden group/fit">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/fit:scale-110 transition-transform duration-700">
             <Target size={60} />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-accent" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Ajuste Operativo</span>
          </div>
          <p className="text-[13px] text-muted italic font-medium leading-relaxed indent-4">
            "{restaurant.kidsFactor}"
          </p>
        </section>
        
        {/* Connection Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-border/50">
          <a 
            href={restaurant.mapsUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-4 text-muted hover:text-accent transition-all group/link bg-background/30 p-3 rounded-2xl border border-transparent hover:border-accent/10"
          >
            <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center shadow-sm group-hover/link:border-accent/40 transition-colors">
              <MapPin size={16} />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[8px] font-black uppercase text-muted/40 tracking-wider">Ubicación</span>
              <span className="text-xs font-bold truncate">{restaurant.address}</span>
            </div>
            <ExternalLink size={14} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
          </a>

          <div className="flex items-center gap-4 text-muted bg-background/30 p-3 rounded-2xl border border-transparent">
            <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center shadow-sm">
              <Phone size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase text-muted/40 tracking-wider">Reservas</span>
              <span className="text-xs font-black tracking-tight">{restaurant.phone}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <a 
            href={restaurant.bookingUrl || `tel:${restaurant.phone.replace(/\s/g, '')}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button variant="primary" size="lg" className="w-full rounded-2xl py-7 font-black text-sm uppercase tracking-widest shadow-xl shadow-accent/10">
              Reservar Ahora
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
};
