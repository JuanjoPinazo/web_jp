'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Building2, Utensils, Car, Navigation, ExternalLink, CalendarRange, Hotel } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MapLocationType = 'hotel' | 'congress' | 'restaurant' | 'hospitality' | 'transfer';

export interface MapLocation {
  id: string;
  type: MapLocationType;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  extra?: string; // e.g. "Check-in: 15:00", "Recogida: 09:00"
}

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: MapLocation[];
  contextName?: string;
  contextLocation?: string;
}

const typeConfig: Record<MapLocationType, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
  hotel:       { icon: Building2,    color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Hotel' },
  congress:    { icon: CalendarRange, color: 'text-blue-500',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   label: 'Sede del Congreso' },
  restaurant:  { icon: Utensils,     color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'Restaurante' },
  hospitality: { icon: Utensils,     color: 'text-accent',     bg: 'bg-accent/10',     border: 'border-accent/20',     label: 'Evento VIP' },
  transfer:    { icon: Car,          color: 'text-amber-500',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  label: 'Traslado' },
};

const TYPE_ORDER: MapLocationType[] = ['congress', 'hotel', 'hospitality', 'restaurant', 'transfer'];

export function MapModal({ isOpen, onClose, locations, contextName, contextLocation }: MapModalProps) {
  const areaQuery = contextLocation || contextName || '';

  const openArea = () => {
    if (areaQuery) {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(areaQuery)}`);
    }
  };

  const navigateTo = (loc: MapLocation) => {
    const dest =
      loc.lat && loc.lng
        ? `${loc.lat},${loc.lng}`
        : encodeURIComponent(`${loc.name}${loc.address ? ' ' + loc.address : ''}`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`);
  };

  const totalCount = locations.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[101] bg-surface border-t border-border rounded-t-[2.5rem] shadow-2xl max-h-[92vh] flex flex-col md:max-w-md md:left-auto md:right-0 md:top-0 md:h-full md:rounded-l-[2.5rem] md:rounded-tr-none md:border-l md:border-t-0"
          >
            {/* Drag handle (mobile) */}
            <div className="md:hidden flex justify-center py-4 flex-shrink-0">
              <div className="w-12 h-1.5 bg-border rounded-full" />
            </div>

            {/* Header */}
            <div className="flex justify-between items-start px-8 pt-2 pb-6 border-b border-border/50 flex-shrink-0">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">Mapa de la Estancia</p>
                <h3 className="text-2xl font-black text-foreground tracking-tight leading-tight">
                  {contextName || 'Mis Ubicaciones'}
                </h3>
                <p className="text-xs text-muted font-medium">
                  {totalCount} {totalCount === 1 ? 'ubicación' : 'ubicaciones'}
                  {contextLocation && ` · ${contextLocation}`}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-3 rounded-2xl bg-surface-subtle border border-border text-foreground/60 hover:text-foreground transition-all active:scale-95 flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 pb-12">

              {/* CTA: explorar la zona */}
              {areaQuery && (
                <button
                  onClick={openArea}
                  className="w-full flex items-center justify-between p-5 rounded-[1.5rem] bg-accent text-white shadow-lg shadow-accent/20 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                      <MapPin size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black">Explorar la zona</p>
                      <p className="text-[10px] opacity-80 uppercase tracking-widest font-bold">
                        {contextLocation || contextName}
                      </p>
                    </div>
                  </div>
                  <ExternalLink size={16} className="opacity-70 flex-shrink-0" />
                </button>
              )}

              {/* Locations grouped by type */}
              {TYPE_ORDER.map(type => {
                const locs = locations.filter(l => l.type === type);
                if (locs.length === 0) return null;
                const cfg = typeConfig[type];

                return (
                  <div key={type} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                        {cfg.label}{locs.length > 1 ? 's' : ''}
                      </p>
                      <div className="flex-1 h-px bg-border/50" />
                    </div>

                    {locs.map(loc => (
                      <div
                        key={loc.id}
                        className={cn(
                          'p-5 rounded-[1.5rem] bg-surface-subtle border transition-colors',
                          cfg.border
                        )}
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg, cfg.color)}>
                            <cfg.icon size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-foreground leading-tight">{loc.name}</p>
                            {loc.address && (
                              <p className="text-[10px] text-muted mt-1 leading-relaxed line-clamp-2">{loc.address}</p>
                            )}
                            {loc.extra && (
                              <p className="text-[9px] text-muted/60 mt-1 uppercase tracking-wide font-bold">{loc.extra}</p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => navigateTo(loc)}
                          className={cn(
                            'w-full py-3 rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] border',
                            cfg.color, cfg.bg, cfg.border
                          )}
                        >
                          <Navigation size={12} /> Cómo llegar
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}

              {locations.length === 0 && (
                <div className="text-center py-16 space-y-3">
                  <MapPin size={40} className="text-muted/20 mx-auto" />
                  <p className="text-sm text-muted font-medium">Sin ubicaciones configuradas.</p>
                  <p className="text-xs text-muted/60">Tu coordinador añadirá las ubicaciones pronto.</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
