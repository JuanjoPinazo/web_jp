'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ChevronRight, Play, Shield, Globe, Sparkles, Navigation, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export const PremiumVideoHero = () => {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Performance: Load video only after first render and if no reduced motion
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      setShouldLoadVideo(true);
    }
  }, []);

  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section ref={containerRef} className="relative h-[100svh] w-full overflow-hidden bg-black flex flex-col items-center justify-center">
      {/* Background Video / Poster */}
      <motion.div style={{ y }} className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent z-10 hidden md:block" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] z-10" />
        
        {/* Sutil gradiente azul premium */}
        <div className="absolute inset-0 bg-accent/5 mix-blend-overlay z-10" />

        <img 
          src="/images/jpip-hero-poster.jpg" 
          alt="JP Intelligence Platform" 
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000",
            isVideoLoaded ? "opacity-0" : "opacity-100"
          )}
        />

        {shouldLoadVideo && (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/images/jpip-hero-poster.jpg"
            onLoadedData={() => setIsVideoLoaded(true)}
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000",
              isVideoLoaded ? "opacity-100" : "opacity-0"
            )}
          >
            <source src="/videos/jpip-hero.mp4" type="video/mp4" />
          </video>
        )}
      </motion.div>

      {/* Top Bar (Logos) */}
      <div className="absolute top-0 left-0 right-0 z-30 p-8 md:p-12 flex justify-between items-center w-full max-w-7xl mx-auto">
        <motion.img 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          src="/logo_jp_blanco.png" 
          alt="JP Intelligence Platform" 
          className="h-8 md:h-10 w-auto object-contain"
        />
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40 hidden sm:block">Logística por</span>
          <img src="/logo_quilpro_blanco.png" alt="Quilpro Cardio" className="h-4 md:h-5 opacity-60 grayscale hover:grayscale-0 transition-all" />
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-8 md:px-12 flex flex-col md:flex-row items-center md:items-end justify-center md:justify-between h-full pb-20 md:pb-32 gap-12">
        {/* Left Side: Copy */}
        <motion.div 
          style={{ opacity }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-col items-center md:items-start text-center md:text-left space-y-6 md:max-w-2xl"
        >
          <div className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent backdrop-blur-md"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">Experiencia EuroPCR 2026</span>
            </motion.div>
            
            <div className="space-y-2">
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-xs md:text-sm font-black text-accent uppercase tracking-[0.5em] block"
              >
                JP INTELLIGENCE PLATFORM
              </motion.span>
              <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] md:leading-[0.85]">
                Tu compañero inteligente <br className="hidden md:block" /> de viaje médico.
              </h1>
            </div>
            
            <p className="text-lg md:text-2xl font-medium text-white/60 leading-relaxed md:max-w-xl">
              Logística, hospitality, mapas, alertas y asistencia contextual en una única experiencia premium.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-4">
            <Link 
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-5 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-accent hover:text-white transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] group"
            >
              Acceder a mi planificación
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="w-full sm:w-auto px-8 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white/10 transition-all backdrop-blur-md">
              Descubrir la plataforma
            </button>
          </div>
        </motion.div>

        {/* Right Side: Capabilities Panel (Desktop Only) */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="hidden md:flex flex-col gap-4 w-80"
        >
          {[
            { label: 'Itinerario inteligente', icon: Globe, desc: 'Toda tu agenda sincronizada' },
            { label: 'Alertas en tiempo real', icon: Sparkles, desc: 'Notificaciones contextuales' },
            { label: 'Concierge personalizado', icon: Shield, desc: 'Asistencia IA 24/7' },
            { label: 'Mapas y movilidad', icon: Navigation, desc: 'Rutas y transporte VIP' }
          ].map((cap, i) => (
            <div key={i} className="p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl group hover:bg-white/10 transition-all flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                <cap.icon size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-white uppercase tracking-widest">{cap.label}</p>
                <p className="text-[9px] font-medium text-white/40 uppercase tracking-widest">{cap.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom Indicator */}
      <motion.div 
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30"
      >
        <div className="w-1 h-12 rounded-full bg-gradient-to-b from-white/20 to-transparent" />
      </motion.div>
    </section>
  );
};

export const SubHeroFeatures = () => {
  return (
    <section className="py-24 md:py-32 bg-black px-8">
      <div className="max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[10px] font-black text-accent uppercase tracking-[0.4em]"
          >
            La excelencia en el detalle
          </motion.p>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-black text-white tracking-tighter max-w-2xl mx-auto"
          >
            Una experiencia diseñada para que tú te concentres en lo importante.
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'Viaje coordinado', desc: 'Sincronización perfecta entre vuelos, hoteles y agenda científica.', icon: Globe },
            { title: 'Hospitality médico', desc: 'Gestión VIP de traslados y cenas en los mejores espacios de la ciudad.', icon: Shield },
            { title: 'IA contextual', desc: 'Asistente inteligente que conoce tu plan y responde a tus necesidades reales.', icon: Sparkles },
            { title: 'Soporte continuo', desc: 'Monitorización en tiempo real para resolver cualquier imprevisto al instante.', icon: Navigation }
          ].map((f, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-[2.5rem] bg-surface border border-border group hover:border-accent/40 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent/5 flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform">
                <f.icon size={24} />
              </div>
              <h3 className="text-lg font-black text-white tracking-tight mb-2">{f.title}</h3>
              <p className="text-sm font-medium text-muted/60 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
