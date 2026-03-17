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
    <div className="group overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:border-accent/40 hover:-translate-y-1 shadow-lg hover:shadow-accent/5">
      {/* Image Header */}
      <div className="relative h-48 w-full overflow-hidden border-b border-border">
        <Image
          src={restaurant.imageUrl}
          alt={restaurant.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent" />
      </div>

      {/* Header Info */}
      <div className="p-6 border-b border-border bg-gradient-to-br from-surface to-background/50">
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 bg-background rounded-xl border border-border text-accent group-hover:scale-110 transition-transform">
            {IconMap[restaurant.iconName]}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-background px-3 py-1 rounded-full border border-border text-muted">
              {restaurant.badge}
            </span>
            <div className="flex items-center gap-1.5 bg-background px-2.5 py-1 rounded-lg border border-border">
              <Star size={12} className="fill-accent text-accent" />
              <span className="text-xs font-bold">{restaurant.rating}</span>
            </div>
          </div>
        </div>
        
        <h3 className="text-2xl font-bold font-heading mb-1">{restaurant.name}</h3>
        <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">
          {restaurant.tagline}
        </p>
      </div>
      
      {/* Dynamic Content Sections */}
      <div className="p-6 space-y-6">
        {/* JP Insight Section */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-accent" />
              <span className="text-[10px] font-black uppercase tracking-widest text-accent">Perspectiva JP</span>
            </div>
            
            {/* JP Score Visualization (Optional/Contextual) */}
            <div className="flex gap-2">
               {[
                 { label: 'Q', score: jpScore?.quality || 0 },
                 { label: 'L', score: jpScore?.logistics || 0 },
                 { label: 'E', score: jpScore?.experience || 0 }
               ].map((s) => (
                 <div key={s.label} className="flex flex-col items-center">
                   <span className="text-[7px] font-bold text-muted/50 mb-0.5">{s.label}</span>
                   <div className="w-6 h-6 rounded-md bg-accent/5 border border-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                     {s.score}
                   </div>
                 </div>
               ))}
            </div>
          </div>
          <p className="text-sm text-foreground font-medium leading-relaxed">
            {restaurant.specialty}
          </p>
        </section>
        
        {/* Operational Fit Section */}
        <section className="bg-background/50 rounded-xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target size={14} className="text-accent" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Ajuste Operativo</span>
          </div>
          <p className="text-xs text-muted italic leading-relaxed">
            "{restaurant.kidsFactor}"
          </p>
        </section>
        
        {/* Connection Details */}
        <div className="space-y-3 pt-4 border-t border-border/50">
          <a 
            href={restaurant.mapsUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-muted hover:text-accent transition-colors group/link"
          >
            <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center group-hover/link:border-accent/40">
              <MapPin size={14} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase text-muted/50 tracking-wider">Ubicación</span>
              <span className="text-[11px] font-medium truncate max-w-[180px]">{restaurant.address}</span>
            </div>
            <ExternalLink size={12} className="ml-auto opacity-0 group-hover/link:opacity-100" />
          </a>

          <div className="flex items-center gap-3 text-muted">
            <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center">
              <Phone size={14} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase text-muted/50 tracking-wider">Reservas</span>
              <span className="text-[11px] font-bold">{restaurant.phone}</span>
            </div>
          </div>

          <a 
            href={restaurant.webUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-muted hover:text-accent transition-colors group/link"
          >
            <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center group-hover/link:border-accent/40">
              <Globe size={14} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase text-muted/50 tracking-wider">Sitio Oficial</span>
              <span className="text-[11px] font-bold">{restaurant.web}</span>
            </div>
            <ExternalLink size={12} className="ml-auto opacity-0 group-hover/link:opacity-100" />
          </a>
        </div>

        <div className="flex gap-3 pt-6">
          <a 
            href={restaurant.mapsUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button variant="outline" size="sm" className="w-full">
              Detalles
            </Button>
          </a>
          <a 
            href={restaurant.bookingUrl || `tel:${restaurant.phone.replace(/\s/g, '')}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button variant="primary" size="sm" className="w-full">
              Reservar
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
};
