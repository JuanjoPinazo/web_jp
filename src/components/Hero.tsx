'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Building2, ChevronRight, MapPin, ShieldCheck, CheckCircle2 
} from 'lucide-react';
import { Button } from './Button';
import { OperationalShowcase } from './OperationalShowcase';

export function Hero() {

  return (
    <section className="relative min-h-[95vh] flex items-center pt-20 pb-20 lg:pb-32 overflow-hidden bg-background font-sans">
      {/* Critical Overlay for Readability */}
      <div className="absolute inset-0 z-10 pointer-events-none" 
           style={{
             background: 'linear-gradient(to right, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.6) 40%, rgba(10,10,10,0.2) 70%, transparent 100%)'
           }} 
      />

      {/* Hero Background Image with Animation */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img 
          src="/images/hero-operational.png" 
          alt="Operational Intelligence" 
          className="w-full h-full object-cover opacity-60 hero-image"
        />

        {/* Intel Motion Overlay (Subtle Lines) */}
        <div className="absolute inset-0 z-10 overflow-hidden opacity-30">
          <div className="intel-line top-[20%] left-[-10%] opacity-20" style={{ animationDelay: '0s' }} />
          <div className="intel-line top-[45%] left-[-30%] opacity-10" style={{ animationDelay: '2s' }} />
          <div className="intel-line top-[70%] left-[-20%] opacity-15" style={{ animationDelay: '4.5s' }} />
          <div className="intel-line top-[15%] left-[-40%] opacity-5" style={{ animationDelay: '6s' }} />
        </div>
      </div>

      <div className="container mx-auto px-6 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          
          {/* Left Column (Text) */}
          <div className="lg:col-span-6 space-y-10 animate-in fade-in slide-in-from-left-4 duration-1000">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                <ShieldCheck size={14} className="text-accent" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">JP Intelligence v2.0</span>
              </div>
              
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black font-heading leading-[0.9] tracking-tighter text-white">
                Operativa resuelta.<br />
                <span 
                  style={{ 
                    color: '#00D1FF', 
                    textShadow: '0 0 30px rgba(0, 209, 255, 0.4)',
                    fontWeight: 600
                  }}
                  className="italic"
                >
                  Sin decisiones pendientes<span className="text-white not-italic">.</span>
                </span>
              </h1>
              
              <div className="space-y-6 max-w-xl">
                <p className="text-xl md:text-3xl font-bold text-white/90 font-heading leading-tight">
                  Viajes, eventos y logística ejecutados automáticamente para tu equipo.
                </p>
              </div>

              <div className="flex flex-wrap gap-4 pt-6">
                 <Link href="/login">
                    <Button size="lg" className="h-16 px-12 rounded-[1.5rem] gap-3 text-base font-black shadow-2xl shadow-accent/20 uppercase tracking-widest transition-all hover:scale-105 active:scale-95 group">
                      Acceder al Sistema
                      <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </Button>
                 </Link>
              </div>
            </div>
          </div>

          {/* Right Column (Visual Showcase) */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end">
             <OperationalShowcase />
          </div>

        </div>
      </div>

      {/* Decorative Blurs */}
      <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-accent/10 blur-[150px] rounded-full pointer-events-none" />
    </section>
  );
}
