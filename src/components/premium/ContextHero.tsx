'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar, Clock, ChevronRight, Bell, Plane, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextHeroProps {
  activePlan?: any;
  userName: string;
  unreadAlertsCount?: number;
  onShowAlerts?: () => void;
  airportMode?: any;
  smartDeparture?: any;
}

export const ContextHero = ({
  activePlan,
  userName,
  unreadAlertsCount = 0,
  onShowAlerts,
  airportMode,
  smartDeparture
}: ContextHeroProps) => {
  const nextContext = activePlan?.contexts;
  
  return (
    <div className="space-y-6">
      {/* Visual Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full aspect-[4/5] md:aspect-[16/9] rounded-[3rem] overflow-hidden group shadow-2xl"
      >
        <img 
          src={activePlan?.image_url || "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop"} 
          alt="Destination" 
          className="absolute inset-0 w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        
        {/* Top Overlay: Identity */}
        <div className="absolute top-8 left-8 right-8 flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.4em]">Briefing de Viaje</p>
            <h2 className="text-3xl font-black text-white tracking-tighter">{userName}</h2>
          </div>
          <button 
            onClick={onShowAlerts}
            className="relative w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white"
          >
            <Bell size={20} />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent border-2 border-white flex items-center justify-center text-[10px] font-black">
                {unreadAlertsCount}
              </span>
            )}
          </button>
        </div>

        {/* Bottom Overlay: Context */}
        <div className="absolute bottom-8 left-8 right-8">
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-white text-[10px] font-black uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {activePlan?.status?.toUpperCase() || 'ACTIVO'}
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest border border-white/10">
                <Calendar size={12} />
                EuroPCR 2026
              </div>
            </div>
            
            <div className="space-y-1">
              <h1 className="text-5xl font-black text-white tracking-tighter leading-none">
                {nextContext?.name || 'Tu Destino'}
              </h1>
              <p className="text-sm font-medium text-white/60 uppercase tracking-widest">
                Mayo 19 — 22, 2026
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Smart Contextual Briefing */}
      <AnimatePresence mode="wait">
        {airportMode ? (
          <motion.div 
            key="airport"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn("p-6 rounded-[2.5rem] border shadow-xl flex items-center justify-between", airportMode.statusColor)}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Plane size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Control Aéreo</p>
                <h3 className="text-lg font-black tracking-tight">{airportMode.statusText}</h3>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black tracking-tighter">{airportMode.diffMin} min</p>
              <p className="text-[10px] font-bold uppercase opacity-60">Para despegue</p>
            </div>
          </motion.div>
        ) : smartDeparture ? (
          <motion.div 
            key="departure"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-[2.5rem] bg-accent/5 border border-accent/20 shadow-xl flex items-center justify-between text-accent"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Zap size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Salida Inteligente</p>
                <h3 className="text-lg font-black tracking-tight">Sal en {smartDeparture.recommendedDepartureMinutes} min</h3>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full border border-accent/20 flex items-center justify-center">
              <ChevronRight size={20} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
