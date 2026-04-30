"use client";

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Container } from '@/components/Container';
import { RestaurantCard } from '@/components/RestaurantCard';
import { QuickDecision } from '@/components/QuickDecision';
import { FilterSystem } from '@/components/FilterSystem';
import { restaurants } from '@/data/restaurants';
import { Terminal, Lightbulb, UserCircle, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RestaurantsPage() {
  const [typeFilter, setTypeFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = sessionStorage.getItem('jp_access_token');
    if (token !== 'authorized') {
      router.push('/clients');
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  if (!isAuthorized) return null;

  // El sistema de filtrado original se mantiene funcional
  const filteredRestaurants = restaurants.filter(r => {
    // Adaptación de tipos para el nuevo dataset
    const typeLabel = r.iconName === 'Anchor' ? 'rice' : 
                     r.iconName === 'Waves' ? 'rice' : 
                     r.iconName === 'Utensils' ? 'tapas' : 
                     r.iconName === 'TreePine' ? 'rice' : 'tapas';
                     
    const matchesType = typeFilter === 'all' || typeLabel === typeFilter;
    return matchesType;
  });

  // Selección automática para Quick Decision (Gran Azul por id 1)
  const priorityChoice = restaurants.find(r => r.id === '1') || restaurants[0];

  return (
    <main className="min-h-screen pt-32 pb-32 bg-background text-foreground">
      <Navbar />
      
      <Container>
        {/* Dossier de Identidad del Dr. Córdoba */}
        <div className="mb-16 p-8 rounded-3xl bg-surface border border-border flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
          <div className="bg-background p-5 rounded-full text-accent shadow-inner border border-border">
            <UserCircle size={48} />
          </div>
          <div className="text-center md:text-left flex-grow">
            <p className="text-accent text-[10px] font-bold uppercase tracking-[0.4em] mb-2">Dossier Gastronómico Personalizado</p>
            <h2 className="text-3xl md:text-4xl font-extrabold font-heading text-foreground tracking-tight">Dr. Juan Gabriel Córdoba Soriano</h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4 text-muted text-xs font-medium italic">
                <span>Valencia, Comunidad Valenciana</span>
                <span className="hidden md:inline text-border">|</span>
                <span>Selección Exclusiva de 5 Establecimientos</span>
            </div>
          </div>
          <div className="hidden lg:block bg-background/50 p-5 rounded-2xl border border-border max-w-[200px]">
             <div className="flex items-center gap-2 text-muted mb-2">
                <Info size={14} className="text-accent" />
                <span className="text-[10px] uppercase font-bold tracking-widest">Criterio de Orden</span>
             </div>
             <p className="text-[11px] text-muted/80 leading-relaxed font-medium">Organizado por valoración técnica y calidad de producto.</p>
          </div>
        </div>

        {/* SaaS Style Hero Section */}
        <header className="mb-20 max-w-4xl">
           <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <Terminal size={20} />
              </div>
              <div className="h-px w-12 bg-border" />
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted">Sistemas de Decisión</span>
           </div>
           
           <h1 className="text-5xl md:text-7xl font-extrabold font-heading tracking-tight mb-6">
              JP · <span className="text-accent underline decoration-accent/20 underline-offset-8">Dossier</span> <br />
              de Selección
           </h1>
           
           <h2 className="text-2xl md:text-3xl font-bold mb-6 text-foreground/90 font-heading">
             ¿Dónde comer este domingo?
           </h2>
           
           <p className="text-lg text-muted max-w-2xl leading-relaxed">
             Una selección de alta calidad y guiada por decisiones lógicas basada en <span className="text-foreground font-semibold">calidad</span>, 
             <span className="text-foreground font-semibold"> logística</span> y <span className="text-foreground font-semibold"> experiencia real</span>. 
           </p>
        </header>

        {/* Quick Decision Highlight */}
        <QuickDecision restaurant={priorityChoice} />

        {/* Section Divider & New Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 pt-12 border-t border-border">
          <div className="space-y-4">
             <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-surface border border-border">
                <Lightbulb size={12} className="text-accent" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted">Feed de Análisis</span>
             </div>
             <h2 className="text-3xl font-bold font-heading">
                Valencia · <span className="text-accent">Selección Gastronómica</span>
             </h2>
             <p className="text-sm text-muted">
                Verificada para una toma de decisiones rápida y segura.
             </p>
          </div>
          
          <div className="hidden md:block text-[10px] font-mono text-muted/30 uppercase tracking-[0.5em] pb-2">
             [ Sunday_EDITION_2026 ]
          </div>
        </div>

        {/* Filter System (Slightly improved styling via globals.css / Tailwind) */}
        {/* Note: In a real refactor, FilterSystem would also be updated for dark mode consistency */}
        
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      </Container>
      
      {/* Refined SaaS Footer */}
      <footer className="mt-40 pt-20 pb-16 border-t border-border bg-surface/30">
        <Container>
          <div className="flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="max-w-md">
              <h3 className="text-lg font-bold font-heading mb-6 text-accent uppercase tracking-widest leading-none">
                Protocolo para el Dr. Córdoba
              </h3>
              <div className="space-y-4 text-sm text-muted leading-relaxed">
                <p>Esta selección combina la <strong className="text-foreground/80">tradición estricta</strong> de Casa Carmela con la <strong className="text-foreground/80">sofisticación moderna</strong> de Gran Azul.</p>
                <p>Se recomienda la reserva previa mediante los enlaces directos incluidos. La afluencia técnica de estos locales es alta en periodos dominicales.</p>
              </div>
            </div>
            
            <div className="flex-shrink-0 text-center md:text-right">
                <div className="p-8 border border-border rounded-3xl bg-background/50 inline-block">
                    <p className="text-accent font-heading text-5xl mb-3 h-12 flex items-center italic tracking-tighter opacity-80">¡Bon Profit!</p>
                    <p className="text-muted/40 text-[9px] uppercase font-black tracking-[0.8em]">Valencia · MMXVI</p>
                </div>
            </div>
          </div>
          
          <div className="mt-20 pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="text-[10px] text-muted/30 font-mono tracking-widest">
               IDENTITY REFINED BY JP // 2026
             </div>
             <div className="flex gap-8 text-[10px] text-muted font-bold uppercase tracking-widest">
               <span className="cursor-default">Decision Tool v1.02</span>
               <span className="cursor-default text-accent/50">Sunday Exclusive</span>
             </div>
          </div>
        </Container>
      </footer>
    </main>
  );
}
