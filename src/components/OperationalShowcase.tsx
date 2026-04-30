'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, CheckCircle2, Plane, Hotel, Globe, 
  MapPin, Calendar, ExternalLink, ShieldCheck, 
  ChevronRight, ArrowRight, Loader2
} from 'lucide-react';

const steps = [
  {
    id: 'event',
    title: 'EuroPCR 2026',
    subtitle: 'Congreso Internacional',
    icon: Trophy,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    details: [
      { label: 'Ubicación', value: 'Palais des Congrès, París', icon: MapPin },
      { label: 'Fechas', value: '19 — 22 Mayo, 2026', icon: Calendar },
      { label: 'Web', value: 'europcr.com', icon: Globe }
    ]
  },
  {
    id: 'registration',
    title: 'Inscripción Confirmada',
    subtitle: 'Gestión Finalizada',
    icon: CheckCircle2,
    color: 'text-accent',
    bg: 'bg-accent/10',
    details: [
      { label: 'Código', value: 'PCR-2026-XP', icon: ShieldCheck },
      { label: 'Tipo', value: 'Full Access Pass', icon: CheckCircle2 }
    ]
  },
  {
    id: 'transport',
    title: 'Vuelo Programado',
    subtitle: 'Air France AF1452',
    icon: Plane,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    details: [
      { label: 'Ruta', value: 'MAD ➔ CDG (París)', icon: MapPin },
      { label: 'Asiento', value: '4A (Business)', icon: ShieldCheck }
    ]
  },
  {
    id: 'accommodation',
    title: 'Alojamiento Reservado',
    subtitle: 'Hotel Napoleon Paris',
    icon: Hotel,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    details: [
      { label: 'Distancia', value: '5 min de la sede', icon: MapPin },
      { label: 'Reserva', value: '#NAP-9921', icon: ShieldCheck }
    ]
  }
];

export function OperationalShowcase() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnalyzing(false);
      setCurrentStep(0);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (currentStep >= 0 && currentStep < steps.length - 1) {
      const nextTimer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 2500);
      return () => clearTimeout(nextTimer);
    }
  }, [currentStep]);

  return (
    <div className="w-full max-w-md relative">
      <AnimatePresence mode="wait">
        {isAnalyzing ? (
          <motion.div 
            key="analyzing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="p-12 rounded-[3rem] bg-surface/40 backdrop-blur-3xl border border-white/10 shadow-2xl flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]"
          >
            <div className="relative">
               <div className="w-20 h-20 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
               <div className="absolute inset-0 flex items-center justify-center text-accent">
                  <ShieldCheck size={32} />
               </div>
            </div>
            <div className="space-y-2">
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Analizando Contexto</p>
               <h4 className="text-xl font-bold text-white">Sincronizando Agenda Operativa...</h4>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {steps.map((step, index) => {
              const isVisible = index <= currentStep;
              if (!isVisible) return null;

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: 20, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  transition={{ 
                    duration: 0.8, 
                    ease: [0.16, 1, 0.3, 1],
                    delay: 0.1
                  }}
                  className={`p-6 rounded-[2rem] bg-surface/60 backdrop-blur-2xl border border-white/10 shadow-xl relative overflow-hidden group`}
                >
                  {/* Progress Line */}
                  {index < currentStep && (
                    <div className="absolute left-10 top-20 bottom-0 w-[1px] bg-gradient-to-b from-accent/50 to-transparent z-0" />
                  )}

                  <div className="flex gap-6 relative z-10">
                    <div className={`w-12 h-12 rounded-xl ${step.bg} ${step.color} flex items-center justify-center shrink-0 shadow-inner border border-white/5`}>
                      <step.icon size={24} />
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="text-lg font-black text-white leading-none mb-1">{step.title}</h4>
                          {index === currentStep && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-500 text-[8px] font-black uppercase tracking-widest border border-emerald-500/20"
                            >
                              Ejecutado
                            </motion.div>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{step.subtitle}</p>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                         {step.details.map((detail, dIdx) => (
                           <div key={dIdx} className="flex items-center gap-3">
                              <detail.icon size={12} className="text-accent/60" />
                              <div className="flex flex-col">
                                 <span className="text-[8px] font-black text-muted/50 uppercase tracking-tighter">{detail.label}</span>
                                 <span className="text-[11px] font-bold text-white/90">{detail.value}</span>
                              </div>
                           </div>
                         ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
