'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plane, Building2, Utensils, Calendar, 
  MapPin, Car, Sparkles, Star, ChevronRight,
  ShieldCheck, ArrowRightLeft, HandMetal,
  Cpu, MousePointer2, BadgeCheck, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Priority = 'flight' | 'hotel' | 'calendar' | 'transport';

export function IntelligentAnimation() {
  const [currentPriority, setCurrentPriority] = useState<Priority>('hotel');
  const [isMounted, setIsMounted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const priorities: Priority[] = ['hotel', 'calendar', 'flight', 'transport'];
    let index = 0;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        index = (index + 1) % priorities.length;
        setCurrentPriority(priorities[index]);
        setIsTransitioning(false);
      }, 1000);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  if (!isMounted) return <div className="h-[500px]" />;

  const labels = {
    calendar: { text: "Agenda Sincronizada", icon: <BadgeCheck size={10} />, status: "En tiempo real" },
    flight: { text: "Vuelo Optimizado", icon: <Zap size={10} />, status: "Ruta confirmada" },
    hotel: { text: "Selección Verificada", icon: <ShieldCheck size={10} />, status: "Decisión automática" },
    transport: { text: "Traslado Logístico", icon: <ArrowRightLeft size={10} />, status: "Eficiencia total" }
  };

  return (
    <div className="relative w-full overflow-visible">
      {/* MOBILE VIEW (< lg) */}
      <div className="lg:hidden flex flex-col gap-4 w-full max-w-sm mx-auto p-4 bg-background/50 rounded-3xl border border-white/5 shadow-inner">
        {/* System Header */}
        <div className="flex items-center justify-between px-2 mb-2">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted">Sistema: Procesando Viaje</span>
           </div>
           <Cpu size={14} className="text-accent/50" />
        </div>

        {/* PRIMARY DECISION: HOTEL (Always at top for mobile-first feel) */}
        <motion.div 
          layout
          className="relative w-full p-6 rounded-[2.5rem] bg-surface border border-accent/20 shadow-[0_20px_40px_rgba(0,0,0,0.3)] z-20"
        >
          <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-accent text-background flex items-center gap-2 shadow-xl z-30">
             <ShieldCheck size={10} />
             <span className="text-[8px] font-black uppercase whitespace-nowrap">Selección Verificada</span>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <Building2 size={24} />
             </div>
             <div>
                <h4 className="text-lg font-black">Napoleon Paris</h4>
                <div className="flex gap-0.5">
                   {[1,2,3,4,5].map(i => <Star key={i} size={8} className="fill-accent text-accent" />)}
                </div>
             </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/50 border border-white/5">
             <MapPin size={12} className="text-muted" />
             <span className="text-[10px] font-bold text-muted">Cerca de EuroPCR · Av. Friedland 40</span>
          </div>
        </motion.div>

        {/* SECONDARY FLOW ITEMS */}
        <div className="relative pl-6 space-y-3">
           {/* Connecting logic line */}
           <div className="absolute left-[11px] top-0 bottom-4 w-0.5 bg-gradient-to-b from-accent/30 to-transparent" />

           {[
             { id: 'flight', label: 'Vuelo Optimizado', title: 'AF1422 · CDG', icon: <Plane size={14} />, color: 'text-accent', status: 'confirmado' },
             { id: 'transport', label: 'Traslado Inteligente', title: 'Mercedes S-Class', icon: <Car size={14} />, color: 'text-purple-500', status: 'optimizado' },
             { id: 'calendar', label: 'Agenda Sincronizada', title: 'EuroPCR Day 1', icon: <Calendar size={14} />, color: 'text-emerald-500', status: 'sincronizado' }
           ].map((item, idx) => (
             <motion.div 
               key={item.id}
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.2 + (idx * 0.1) }}
               className="flex items-center gap-4 p-4 rounded-2xl bg-surface/40 border border-white/5 backdrop-blur-sm"
             >
               <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center bg-white/5", item.color)}>
                  {item.icon}
               </div>
               <div className="flex-grow">
                  <div className="flex items-center justify-between gap-1">
                     <span className="text-[8px] font-black uppercase text-muted tracking-wide">{item.label}</span>
                     <span className="text-[7px] font-bold uppercase text-accent/80 border border-accent/20 px-1.5 rounded-sm">{item.status}</span>
                  </div>
                  <p className="text-xs font-black">{item.title}</p>
               </div>
             </motion.div>
           ))}
        </div>
      </div>

      {/* DESKTOP VIEW (>= lg) */}
      <div className="hidden lg:flex relative w-full h-[600px] items-center justify-center bg-background/50 rounded-3xl border border-white/5 shadow-2xl">
        {/* Logic Grid & Connections (Same as before but refined) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <filter id="glow-desktop">
               <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
               <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
               </feMerge>
            </filter>
          </defs>

          {['calendar', 'flight', 'hotel', 'transport'].map((p) => {
            let d = "";
            const isActive = currentPriority === p;
            if (p === 'calendar') d = "M 400 300 Q 400 200 400 120";
            if (p === 'flight') d = "M 400 300 Q 250 300 150 300";
            if (p === 'hotel') d = "M 400 300 Q 550 300 650 300";
            if (p === 'transport') d = "M 400 300 Q 400 400 400 480";

            return (
              <g key={p}>
                <motion.path
                  d={d}
                  stroke={isActive ? "rgba(0,174,239,0.4)" : "rgba(255,255,255,0.05)"}
                  strokeWidth={isActive ? 2 : 1}
                  fill="none"
                  animate={{ stroke: isActive ? "rgba(0,174,239,0.4)" : "rgba(255,255,255,0.05)" }}
                />
                {isActive && (
                  <motion.circle r="3" fill="#00AEEF" filter="url(#glow-desktop)">
                    <animateMotion path={d} dur="2s" repeatCount="indefinite" />
                  </motion.circle>
                )}
              </g>
            );
          })}
        </svg>

        {/* Logic Core */}
        <div className="relative z-30">
          <motion.div 
            className="w-32 h-32 rounded-full bg-accent/10 border border-accent/30 backdrop-blur-3xl flex flex-col items-center justify-center"
            animate={{ scale: isTransitioning ? [1, 1.1, 1] : 1 }}
          >
            <Cpu size={32} className="text-accent mb-1" />
            <span className="text-[8px] font-black uppercase tracking-widest text-accent">Decision Core</span>
          </motion.div>
        </div>

        {/* Horizontal Decision Grid Items (Same logic as before) */}
        {/* CALENDAR */}
        <motion.div 
          animate={currentPriority === 'calendar' ? { scale: 1.1, opacity: 1, zIndex: 50 } : { scale: 0.85, opacity: 0.3, zIndex: 10 }}
          className="absolute w-72 p-6 rounded-[2.5rem] bg-surface/90 border shadow-2xl z-20"
          style={{ top: '60px', left: '50%', x: '-50%' }}
        >
          <DesktopMicroLabel active={currentPriority === 'calendar'} config={labels.calendar} />
          <div className="flex items-center gap-3 mb-2 mt-1">
             <Calendar size={16} className="text-accent" />
             <span className="text-[10px] font-black uppercase">Agenda Operativa</span>
          </div>
          <p className="text-xs font-black">Planificación EuroPCR 2026</p>
        </motion.div>

        {/* FLIGHT */}
        <motion.div 
          animate={currentPriority === 'flight' ? { scale: 1.1, opacity: 1, zIndex: 50 } : { scale: 0.85, opacity: 0.3, zIndex: 10 }}
          className="absolute w-64 p-6 rounded-[2.5rem] bg-surface/90 border shadow-2xl z-20"
          style={{ left: '40px', top: '50%', y: '-50%' }}
        >
          <DesktopMicroLabel active={currentPriority === 'flight'} config={labels.flight} />
          <div className="flex items-center gap-3 mb-2 mt-1">
             <Plane size={16} className="text-accent" />
             <span className="text-[10px] font-black uppercase">Vuelo Optimizado</span>
          </div>
          <p className="text-xs font-black">AF1422 · Madrid - París</p>
        </motion.div>

        {/* HOTEL (Primary decision highlight in radial view too) */}
        <motion.div 
          animate={currentPriority === 'hotel' ? { scale: 1.15, opacity: 1, zIndex: 50 } : { scale: 0.85, opacity: 0.3, zIndex: 10 }}
          className="absolute w-64 p-6 rounded-[2.5rem] bg-surface border-accent/20 shadow-[0_0_60px_rgba(0,174,239,0.2)] z-20"
          style={{ right: '40px', top: '50%', y: '-50%' }}
        >
          <DesktopMicroLabel active={currentPriority === 'hotel'} config={labels.hotel} />
          <div className="flex items-center gap-3 mb-4 mt-1">
             <Building2 size={24} className="text-emerald-500" />
             <h4 className="text-sm font-black uppercase">Napoleon Paris</h4>
          </div>
          <div className="flex gap-0.5"><Star key={1} size={8} className="fill-accent text-accent" /></div>
        </motion.div>

        {/* TRANSPORT */}
        <motion.div 
          animate={currentPriority === 'transport' ? { scale: 1.1, opacity: 1, zIndex: 50 } : { scale: 0.85, opacity: 0.3, zIndex: 10 }}
          className="absolute w-64 p-6 rounded-[2.5rem] bg-surface/90 border shadow-2xl z-20"
          style={{ bottom: '60px', left: '50%', x: '-50%' }}
        >
          <DesktopMicroLabel active={currentPriority === 'transport'} config={labels.transport} />
          <div className="flex items-center gap-3 mb-2 mt-1">
             <Car size={16} className="text-purple-500" />
             <span className="text-[10px] font-black uppercase">Ruta Inteligente</span>
          </div>
          <p className="text-xs font-black">Mercedes S-Class · CDG</p>
        </motion.div>
      </div>

      {/* Decision Status Indicator */}
      <AnimatePresence>
        {isTransitioning && (
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0 }}
             className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-accent text-background text-[9px] font-black uppercase tracking-[0.3em] shadow-2xl z-50"
           >
             Optimizando Decisión
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DesktopMicroLabel({ active, config }: { active: boolean, config: any }) {
  if (!active) return null;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-accent text-background flex items-center gap-2 shadow-xl z-30 ring-4 ring-background"
    >
       {config.icon}
       <span className="text-[7px] font-black uppercase whitespace-nowrap">{config.text}</span>
    </motion.div>
  );
}
