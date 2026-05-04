'use client';

import React from 'react';
import { Sparkles, MapPin, Utensils, Trophy, Mic2, Coffee, Wine, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

const categories = [
  { icon: Utensils, label: 'Gastronomía', count: 'Próximamente', color: 'text-pink-400', bg: 'bg-pink-400/10' },
  { icon: Trophy, label: 'Actividades', count: 'Próximamente', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  { icon: Mic2, label: 'Eventos', count: 'Próximamente', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { icon: Coffee, label: 'Cafés & Trabajo', count: 'Próximamente', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { icon: Wine, label: 'Vida Nocturna', count: 'Próximamente', color: 'text-red-400', bg: 'bg-red-400/10' },
  { icon: Globe, label: 'Cultura', count: 'Próximamente', color: 'text-blue-400', bg: 'bg-blue-400/10' },
];

export default function DiscoverPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-12 pb-24 px-4 md:px-0">
      {/* Header */}
      <header className="space-y-4 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest">
          <Sparkles size={12} />
          JP Concierge
        </div>
        <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tight text-foreground leading-none">
          Descubrir.
        </h1>
        <p className="text-muted font-medium text-base max-w-lg">
          Tu asistente inteligente selecciona las mejores experiencias del destino adaptadas a tu agenda y preferencias.
        </p>
      </header>

      {/* Coming Soon Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden p-10 md:p-14 rounded-[3rem] bg-gradient-to-br from-accent/10 via-surface to-surface border border-accent/20 shadow-xl text-center"
      >
        <div className="absolute -top-10 -right-10 text-accent/5">
          <Sparkles size={200} />
        </div>
        <div className="relative z-10 space-y-6">
          <div className="w-20 h-20 rounded-[2rem] bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mx-auto">
            <MapPin size={40} />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black text-accent uppercase tracking-[0.4em]">En Desarrollo</p>
            <h2 className="text-3xl md:text-4xl font-black font-heading text-foreground tracking-tight">
              Próximamente disponible
            </h2>
            <p className="text-muted font-medium text-sm max-w-md mx-auto leading-relaxed">
              Estamos preparando una experiencia de descubrimiento única, con recomendaciones curadas por IA para cada destino de tu viaje.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Categories preview */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted ml-2">Categorías que llegarán</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((cat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="p-6 rounded-[2rem] bg-surface border border-border shadow-sm space-y-4 opacity-60 select-none"
            >
              <div className={`p-3 rounded-xl w-fit ${cat.bg} ${cat.color}`}>
                <cat.icon size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-foreground">{cat.label}</p>
                <p className="text-[10px] text-muted font-bold">{cat.count}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
