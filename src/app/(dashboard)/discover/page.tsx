'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Sparkles, MapPin, Utensils, Trophy, Mic2, Coffee, Wine, Globe,
  Navigation, Phone, ExternalLink, Clock, Star, Building2, Car
} from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTravelPlans, FullTravelPlan } from '@/hooks/useTravelPlans';

const GOOGLE_MAPS_CATEGORIES = [
  {
    id: 'gastronomy',
    icon: Utensils,
    label: 'Gastronomía',
    query: 'restaurantes',
    color: 'text-pink-400',
    bg: 'bg-pink-400/10',
    border: 'border-pink-400/20',
  },
  {
    id: 'activities',
    icon: Trophy,
    label: 'Actividades',
    query: 'actividades turísticas',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
  },
  {
    id: 'coffee',
    icon: Coffee,
    label: 'Cafés & Coworking',
    query: 'cafeterías coworking',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
  },
  {
    id: 'nightlife',
    icon: Wine,
    label: 'Vida Nocturna',
    query: 'bares cocteles',
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/20',
  },
  {
    id: 'culture',
    icon: Globe,
    label: 'Cultura & Museos',
    query: 'museos monumentos',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
  },
  {
    id: 'transport',
    icon: Car,
    label: 'Transporte',
    query: 'taxi transporte urbano',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/20',
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function DiscoverPage() {
  const { session } = useAuth();
  const { getMyActivePlan } = useTravelPlans();
  const [activePlan, setActivePlan] = useState<FullTravelPlan | null>(null);
  const [contextLocation, setContextLocation] = useState<string>('');
  const [contextName, setContextName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!session?.user?.id) return;
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: contextUsers } = await supabase
          .from('context_users')
          .select('context_id, contexts(*)')
          .eq('user_id', session.user!.id);

        if (contextUsers && contextUsers.length > 0) {
          const ctx = (contextUsers[0] as any).contexts;
          if (ctx) {
            setContextLocation(ctx.location || ctx.city || '');
            setContextName(ctx.name || '');
            const plan = await getMyActivePlan(ctx.id);
            setActivePlan(plan);
          }
        }
      } catch (err) {
        console.error('Error loading discover data:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session, getMyActivePlan]);

  // Recommended restaurants from the plan (type: 'recommended')
  const recommendedRestaurants = useMemo(() => {
    return activePlan?.restaurants.filter(r => r.type === 'recommended' && !r.deleted_at) ?? [];
  }, [activePlan]);

  const openInMaps = (category: typeof GOOGLE_MAPS_CATEGORIES[0]) => {
    const location = contextLocation || contextName;
    if (location) {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(category.query + ' ' + location)}`);
    } else {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(category.query)}`);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-2xl mx-auto space-y-10 pb-28 px-4 md:px-0"
    >
      {/* Header */}
      <motion.header variants={itemVariants} className="space-y-3 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest">
          <Sparkles size={12} />
          JP Concierge
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-none">
          Descubrir.
        </h1>
        <p className="text-muted font-medium text-sm max-w-lg leading-relaxed">
          {contextLocation
            ? `Explora lo mejor de ${contextLocation} adaptado a tu agenda y preferencias.`
            : 'Explora experiencias curadas para tu destino.'}
        </p>
      </motion.header>

      {/* Location banner */}
      {contextLocation && (
        <motion.div variants={itemVariants} className="flex items-center gap-3 p-5 rounded-[1.5rem] bg-accent/5 border border-accent/20">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
            <MapPin size={18} />
          </div>
          <div className="flex-1">
            <p className="text-[9px] font-black text-accent uppercase tracking-widest mb-0.5">Destino activo</p>
            <p className="text-sm font-black text-foreground">{contextName}</p>
            <p className="text-xs text-muted">{contextLocation}</p>
          </div>
          <button
            onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(contextLocation)}`)}
            className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent active:scale-90 transition-transform"
          >
            <ExternalLink size={14} />
          </button>
        </motion.div>
      )}

      {/* Curated restaurants from plan (if any) */}
      {recommendedRestaurants.length > 0 && (
        <motion.section variants={itemVariants} className="space-y-4">
          <div className="flex items-center gap-3 px-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">Selección curada para ti</p>
            <div className="flex-1 h-px bg-accent/20" />
          </div>
          <div className="space-y-3">
            {recommendedRestaurants.map(r => (
              <div
                key={r.id}
                className="p-5 rounded-[1.5rem] bg-surface border border-border flex items-center gap-4 group hover:border-orange-400/30 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-orange-400/10 flex items-center justify-center text-orange-400 group-hover:bg-orange-400 group-hover:text-white transition-all flex-shrink-0">
                  <Utensils size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-foreground leading-tight">{r.restaurant_name}</p>
                  {r.notes && <p className="text-[10px] text-muted mt-0.5 font-medium leading-relaxed">{r.notes}</p>}
                  {r.address && <p className="text-[10px] text-muted/60 mt-0.5 truncate">{r.address}</p>}
                </div>
                {r.address && (
                  <button
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(r.restaurant_name + ' ' + (r.address || ''))}`)}
                    className="w-9 h-9 rounded-xl bg-orange-400/10 flex items-center justify-center text-orange-400 active:scale-90 transition-transform flex-shrink-0"
                  >
                    <Navigation size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Explore by category */}
      <motion.section variants={itemVariants} className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted">Explorar por categoría</p>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {GOOGLE_MAPS_CATEGORIES.map((cat, i) => (
            <motion.button
              key={cat.id}
              variants={itemVariants}
              onClick={() => openInMaps(cat)}
              className={`p-5 rounded-[1.5rem] bg-surface border text-left space-y-3 transition-all active:scale-[0.97] hover:shadow-sm group ${cat.border} hover:border-current`}
            >
              <div className={`p-2.5 rounded-xl w-fit ${cat.bg} ${cat.color} group-hover:scale-110 transition-transform`}>
                <cat.icon size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-foreground leading-tight">{cat.label}</p>
                <p className={`text-[10px] font-bold mt-0.5 flex items-center gap-1 ${cat.color}`}>
                  <ExternalLink size={9} />
                  {contextLocation ? `en ${contextLocation}` : 'Ver en Maps'}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* Useful contacts for the destination */}
      {contextLocation && (
        <motion.section variants={itemVariants} className="space-y-4">
          <div className="flex items-center gap-3 px-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted">Servicios útiles</p>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid grid-cols-1 gap-3">
            {[
              { label: 'Farmacia de guardia', query: 'farmacia guardia', icon: '💊', color: 'text-red-400' },
              { label: 'Clínica / Urgencias', query: 'hospital urgencias', icon: '🏥', color: 'text-rose-400' },
              { label: 'Supermercado', query: 'supermercado', icon: '🛒', color: 'text-emerald-400' },
              { label: 'Cajero automático', query: 'cajero ATM banco', icon: '💳', color: 'text-blue-400' },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(item.query + ' ' + contextLocation)}`)}
                className="flex items-center gap-4 p-4 rounded-2xl bg-surface border border-border hover:border-border/80 transition-all group active:scale-[0.98] text-left"
              >
                <span className="text-xl w-9 h-9 flex items-center justify-center bg-surface-subtle rounded-xl">{item.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-black text-foreground">{item.label}</p>
                  <p className={`text-[10px] font-bold ${item.color}`}>Cerca de {contextLocation}</p>
                </div>
                <Navigation size={14} className="text-muted group-hover:text-foreground transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>
        </motion.section>
      )}

      {/* Empty state if no context */}
      {!loading && !contextLocation && (
        <motion.div
          variants={itemVariants}
          className="text-center py-16 space-y-4 rounded-[2.5rem] bg-surface border border-border"
        >
          <div className="w-16 h-16 rounded-[1.5rem] bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mx-auto">
            <Sparkles size={28} />
          </div>
          <div className="space-y-2 px-8">
            <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">Sin congreso activo</p>
            <h2 className="text-xl font-black text-foreground">
              Las recomendaciones aparecerán aquí
            </h2>
            <p className="text-sm text-muted leading-relaxed max-w-xs mx-auto">
              Cuando tengas un congreso asignado, descubrirás restaurantes, actividades y lugares de interés en el destino.
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
