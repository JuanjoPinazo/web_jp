'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, AppWindow, Clock, ShieldCheck, ChevronRight, Search, Cpu, CheckCircle2, ArrowRight, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from './Button';

const features = [
  {
    title: "Decisión basada en contexto",
    description: "El sistema interpreta el contexto completo: agenda, ubicación, disponibilidad y preferencias históricas para cada decisión.",
    icon: Sparkles,
    color: "text-accent",
    bg: "bg-accent/10"
  },
  {
    title: "Optimización automática",
    description: "Monitoriza disponibilidad y rutas en segundo plano, ajustando cada decisión para mantener siempre la mejor opción posible.",
    icon: Zap,
    color: "text-amber-500",
    bg: "bg-amber-500/10"
  },
  {
    title: "Conectado a tu operativa",
    description: "Integración directa con tus calendarios, CRM y proveedores. Toda la información sincronizada en un único flujo sin duplicidades.",
    icon: AppWindow,
    color: "text-purple-500",
    bg: "bg-purple-500/10"
  },
  {
    title: "Resultado inmediato",
    description: "No se proponen opciones. Se ejecuta directamente la mejor solución disponible y se presenta el resultado final listo para su uso.",
    icon: Clock,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10"
  }
];

const steps = [
  { title: "Detecta necesidad", desc: "Evento, viaje o solicitud", icon: Search },
  { title: "Analiza contexto", desc: "Histórico y disponibilidad", icon: Cpu },
  { title: "Ejecuta decisiones", desc: "Automáticamente", icon: Zap },
  { title: "Presenta resultado", desc: "Listo para su uso", icon: CheckCircle2 }
];

export function Features() {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,174,239,0.03)_0,transparent_70%)] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border">
             <ShieldCheck size={12} className="text-accent" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Potencia Operativa</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black font-heading tracking-tight">
            Logística <span className="text-accent underline decoration-accent/20 underline-offset-8">Sin Decisiones Pendientes</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-32">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -8 }}
              className="group relative p-8 rounded-[2.5rem] bg-surface/50 backdrop-blur-3xl border border-white/5 hover:border-accent/30 hover:bg-surface/80 transition-all duration-500"
            >
              {/* Card Glow Effect */}
              <div className="absolute inset-0 rounded-[2.5rem] bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity blur-2xl pointer-events-none" />
              
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-transform duration-500 group-hover:scale-110",
                feature.bg, feature.color
              )}>
                <feature.icon size={28} />
              </div>

              <h3 className="text-xl font-black mb-4 group-hover:text-accent transition-colors">
                {feature.title}
              </h3>
              
              <p className="text-sm text-muted leading-relaxed mb-6">
                {feature.description}
              </p>

              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                 Ver más <ChevronRight size={12} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* How it works section */}
        <div className="py-20 border-t border-border/50">
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
              <div className="lg:col-span-4 space-y-6">
                 <h3 className="text-4xl font-black font-heading leading-tight">¿Cómo funciona?</h3>
                 <p className="text-muted text-lg leading-relaxed">
                    JP Intelligence no es una herramienta de gestión. Es una <strong>capa de decisión</strong> que se sitúa sobre tu operativa existente.
                 </p>
                 <p className="text-muted text-lg leading-relaxed">
                    Analiza, prioriza y ejecuta automáticamente cada necesidad logística para eliminar fricción.
                 </p>
              </div>
              <div className="lg:col-span-8">
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {steps.map((step, i) => (
                      <div key={i} className="relative group">
                         <div className="p-6 rounded-[2rem] bg-surface border border-border group-hover:border-accent/40 transition-all h-full flex flex-col gap-4">
                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                               <step.icon size={20} />
                            </div>
                            <div>
                               <p className="text-xs font-black uppercase tracking-widest text-accent mb-1">Paso {i+1}</p>
                               <h4 className="text-sm font-bold text-foreground">{step.title}</h4>
                               <p className="text-[11px] text-muted mt-1">{step.desc}</p>
                            </div>
                         </div>
                         {i < 3 && (
                           <div className="hidden md:block absolute top-1/2 -right-4 translate-x-1/2 -translate-y-1/2 z-20 text-border">
                              <ArrowRight size={20} />
                           </div>
                         )}
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>

        {/* Short About / Authority section */}
        <div className="mt-32 p-12 md:p-20 rounded-[4rem] bg-accent/5 border border-accent/10 relative overflow-hidden group">
           <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-accent/10 blur-[100px] rounded-full group-hover:scale-150 transition-transform duration-1000" />
           
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
              <div className="space-y-8">
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                    <History size={14} className="text-accent" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Evolución Natural</span>
                 </div>
                 <h3 className="text-4xl md:text-5xl font-black font-heading leading-tight text-foreground">
                    Más de 27 años <br /> junto a equipos clínicos.
                 </h3>
                 <p className="text-muted text-lg leading-relaxed">
                    Nuestra experiencia en el ámbito cardiovascular nos ha permitido entender una realidad clave: la carga operativa fuera del hospital impacta directamente en el rendimiento.
                 </p>
                 <Link href="/about">
                    <Button variant="outline" className="rounded-xl px-8 border-accent/20 text-accent hover:bg-accent/10 gap-2">
                       Nuestra Filosofía
                       <ChevronRight size={16} />
                    </Button>
                 </Link>
              </div>
              <div className="bg-surface/50 backdrop-blur-xl border border-border p-8 md:p-12 rounded-[3rem] shadow-2xl">
                 <p className="text-lg md:text-xl font-bold leading-relaxed text-foreground/90 italic">
                    "Desde Quilpro Cardio hemos asumido históricamente la gestión completa de congresos y logística. JP Intelligence es la evolución natural: un sistema diseñado para convertir esa carga en decisiones automáticas."
                 </p>
              </div>
           </div>
        </div>
      </div>
    </section>
  );
}
