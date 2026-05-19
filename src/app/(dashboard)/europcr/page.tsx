'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, MapPin, Compass, Clock, Activity, Calendar, Star, 
  Sparkles, Phone, ArrowLeft, Shield, AlertTriangle, Car, 
  ChevronRight, ArrowUpRight, CloudRain, Users, Wifi, Info, Stethoscope
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTravelPlans, FullTravelPlan } from '@/hooks/useTravelPlans';
import { usePlanModules } from '@/hooks/usePlanModules';
import { getTravelTimelineAction } from '@/actions/travel-timeline-actions';
import { getLiveTravelStatusAction } from '@/actions/live-travel-actions';
import { getPlanRoutesAction } from '@/actions/travel-routes-actions';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import TodayMiniMap from '@/modules/live-map/components/TodayMiniMap';
import { MobilityActions } from '@/components/premium/MobilityActions';

export default function EuroPCRPage() {
  const { session } = useAuth();
  const { getMyActivePlan } = useTravelPlans();
  const { getEnabledModules } = usePlanModules();
  const router = useRouter();

  const [activePlan, setActivePlan] = useState<FullTravelPlan | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [planRoutes, setPlanRoutes] = useState<any[]>([]);
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeCategory, setActiveCategory] = useState<'palais' | 'hotel' | 'medical' | 'restaurants' | 'agenda' | 'transfers'>('palais');
  
  // Custom states for interactive features
  const [selectedStand, setSelectedStand] = useState<string | null>(null);
  const [showMobilityFor, setShowMobilityFor] = useState<{ lat: number; lng: number; name: string } | null>(null);
  
  // Geolocation
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.warn('Geolocation error:', error)
      );
    }
  }, []);

  useEffect(() => {
    const fetchPlanData = async () => {
      if (!session?.user?.id) return;
      try {
        setLoading(true);
        const { supabase } = await import('@/lib/supabase');
        const { data: contextUsers } = await supabase
          .from('context_users')
          .select('context_id, contexts(*)')
          .eq('user_id', session.user.id);

        let plan = null;
        if (contextUsers && contextUsers.length > 0) {
          const ctx = (contextUsers[0] as any).contexts;
          if (ctx) {
            plan = await getMyActivePlan(ctx.id, session.user.id);
          }
        }

        if (plan) {
          setActivePlan(plan);
          
          const routesRes = await getPlanRoutesAction(plan.id);
          if (routesRes.success) setPlanRoutes(routesRes.routes || []);
          
          const timelineRes = await getTravelTimelineAction(plan.id);
          if (timelineRes.success && timelineRes.data) {
            setTimelineEvents(timelineRes.data);
          }

          const liveRes = await getLiveTravelStatusAction(plan.id);
          if (liveRes.success && liveRes.data) {
            setLiveStatus(liveRes.data);
          }
        }
      } catch (err) {
        console.error('Error fetching plan in EuroPCR Mode:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlanData();
  }, [session, getMyActivePlan]);

  // Palais des Congrès info
  const PALAIS_COORDS = { lat: 48.8830, lng: 2.2821 };
  
  // Curated Medical Hotspots near EuroPCR
  const MEDICAL_HOTSPOTS = [
    { name: 'Puesto de Socorro EuroPCR (Hall A, Nivel 1)', desc: 'Servicios de emergencia dentro de la sede del congreso.', tel: '+33140682222', icon: Shield, address: 'Palais des Congrès de Paris' },
    { name: 'Hôpital Marmottan', desc: 'Hospital más cercano a Porte Maillot para urgencias generales.', tel: '+33145740007', icon: Stethoscope, address: '17 Rue d\'Armaillé, 75017 París' },
    { name: 'Pharmacie des Ternes (24/7)', desc: 'Farmacia abierta las 24 horas del día a 500m de la sede.', tel: '+33145741355', icon: Activity, address: '82 Avenue des Ternes, 75017 París' }
  ];

  // Curated gastronomy spots for dinner
  const CURATED_RESTAURANTS = [
    { name: 'César Restaurant', type: 'Italiano Premium', desc: 'Cenas de negocios elegantes y ambiente exclusivo cerca del congreso.', lat: 48.8778, lng: 2.2965, address: '12 Avenue de Wagram' },
    { name: 'Le Ballon des Ternes', type: 'Brasserie Francesa', desc: 'Mariscos frescos y cortes clásicos en un ambiente art-déco histórico.', lat: 48.8814, lng: 2.2882, address: '10 Rue du Général Lanrezac' },
    { name: 'Ciro\'s París', type: 'Gourmet Mediterráneo', desc: 'Comida de alta calidad perfecta para reuniones científicas post-evento.', lat: 48.8795, lng: 2.2922, address: '74 Avenue des Ternes' }
  ];

  // Active Congress Hotel Info
  const hotelInfo = useMemo(() => {
    const stay = activePlan?.hotel_stays?.[0];
    if (stay) {
      return {
        name: stay.hotel_name,
        address: stay.address || 'París, Francia',
        lat: stay.latitude || 48.8790,
        lng: stay.longitude || 2.2830
      };
    }
    // Fallback hotel popular en EuroPCR
    return {
      name: 'Hyatt Regency Paris Étoile (Hotel Sugerido)',
      address: '3 Place du Général Kœnig, 75017 París',
      lat: 48.8803, lng: 2.2863
    };
  }, [activePlan]);

  // Next action computed for map centering
  const nextAction = useMemo(() => {
    const now = new Date();
    return timelineEvents.find(e => e.datetime > now) || timelineEvents[0];
  }, [timelineEvents]);

  // Dynamic Simulated IA Alerts
  const iaAlerts = [
    {
      id: 'traffic',
      icon: Users,
      title: 'Afluencia y Demoras en Sede',
      desc: 'Tránsito denso hacia el Palais des Congrès. Más de 12,000 delegados registrándose hoy. Se recomienda entrar por el Acceso B para evitar colas de acreditación.',
      type: 'warning',
      color: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5'
    },
    {
      id: 'rain',
      icon: CloudRain,
      title: 'Previsión de Lluvia',
      desc: 'Llovizna moderada prevista en París a partir de las 18:00h. Si asistes a los cocktails de hospitalidad en Avenue de Wagram, te sugerimos pedir un Taxi G7 o usar el Metro Línea 1.',
      type: 'weather',
      color: 'border-blue-500/30 text-blue-400 bg-blue-500/5'
    },
    {
      id: 'departure',
      icon: Clock,
      title: 'Recomendación de Salida Inteligente',
      desc: 'Próxima sesión científica clave a las 13:30h en el Grand Amphithéâtre. Si sales de tu hotel, tiempo de traslado recomendado: 12 min en coche (tráfico medio) o 6 min caminando.',
      type: 'info',
      color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
    }
  ];

  const stands = [
    { name: 'Medtronic', code: 'M24', location: 'Hall Principal - Nivel 2', highlight: 'Demostración en vivo de TAVI a las 11:00h' },
    { name: 'Boston Scientific', code: 'B10', location: 'Hall Principal - Nivel 2', highlight: 'Simulador complejo de intervencionismo coronario' },
    { name: 'Abbott', code: 'A12', location: 'Nivel 1 - Pasillo Central', highlight: 'Lanzamiento de nuevas guías de presión óptica' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090A] flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted">Cargando modo operativo EuroPCR...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090A] text-foreground pb-24">
      {/* Header Premium */}
      <div className="sticky top-0 z-50 bg-[#09090A]/85 border-b border-white/5 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <button 
          onClick={() => router.push('/dashboard')}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-muted hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="text-center">
          <p className="text-[9px] font-black uppercase text-[#00D1FF] tracking-[0.25em]">OPERATIVE COMPANION</p>
          <h1 className="text-sm font-black text-white tracking-widest uppercase">EuroPCR París</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00D1FF] animate-pulse" />
          <span className="text-[8px] font-black text-[#00D1FF] tracking-widest uppercase">En Vivo</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-6 space-y-6">
        
        {/* IA Contextual Insights (Alerts) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#00D1FF]" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted">IA Contextual Insights</h3>
          </div>
          <div className="grid grid-cols-1 gap-3.5">
            {iaAlerts.map(alert => (
              <div 
                key={alert.id} 
                className={cn("p-4.5 rounded-[2rem] border backdrop-blur-md flex gap-4 text-left", alert.color)}
              >
                <div className="shrink-0 w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <alert.icon size={16} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black tracking-tight text-white">{alert.title}</h4>
                  <p className="text-[10.5px] leading-relaxed text-muted-foreground font-medium">{alert.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Mini Map */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Compass size={16} className="text-[#00D1FF]" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted">Mapa Interactivo del Congreso</h3>
            </div>
            <button 
              onClick={() => router.push('/dashboard?activeTab=map')}
              className="text-[8px] font-black uppercase tracking-widest text-accent flex items-center gap-1"
            >
              Ver en Pantalla Completa <ArrowUpRight size={10} />
            </button>
          </div>
          <div className="h-60 rounded-[2.5rem] overflow-hidden border border-white/10 relative">
            <TodayMiniMap 
              activePlan={activePlan} 
              nextAction={nextAction} 
              className="h-full w-full"
            />
          </div>
        </div>

        {/* Hotspots Categories Buttons Grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'palais', label: 'Sede S.A.', icon: Building2 },
            { id: 'hotel', label: 'Mi Hotel', icon: MapPin },
            { id: 'medical', label: 'Seguridad', icon: Shield },
            { id: 'restaurants', label: 'Restaurantes', icon: Star },
            { id: 'transfers', label: 'Transfers', icon: Car },
            { id: 'agenda', label: 'Agenda key', icon: Calendar }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id as any);
                setShowMobilityFor(null);
              }}
              className={cn(
                "p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center",
                activeCategory === cat.id 
                  ? "bg-accent/15 border-accent text-white shadow-lg shadow-accent/5" 
                  : "bg-surface/30 border-border/40 text-muted hover:bg-surface/50 hover:text-white"
              )}
            >
              <cat.icon size={16} className={activeCategory === cat.id ? "text-accent" : "text-muted-foreground"} />
              <span className="text-[8px] font-black uppercase tracking-widest leading-none">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Context Category Details Sheet */}
        <div className="p-6 rounded-[2.5rem] bg-surface border border-border shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
          
          <AnimatePresence mode="wait">
            {activeCategory === 'palais' && (
              <motion.div 
                key="palais"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5 text-left"
              >
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#00D1FF] bg-[#00D1FF]/10 px-2 py-0.5 rounded-full">Sede Principal</span>
                  <h3 className="text-lg font-black tracking-tight text-white mt-1">Palais des Congrès de París</h3>
                  <p className="text-xs text-muted">2 Place de la Porte Maillot, 75017 París</p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-subtle border border-border flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Wifi size={16} className="text-[#00D1FF]" />
                    <div className="text-left">
                      <p className="text-[8px] font-black text-muted uppercase tracking-widest">Wi-Fi EuroPCR Premium</p>
                      <p className="text-xs font-bold text-white leading-tight">EuroPCR_2026_Premium</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-muted uppercase tracking-widest">Contraseña</p>
                    <p className="text-xs font-mono font-black text-accent">PCRVIP2026</p>
                  </div>
                </div>

                {/* Stand Selector */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-muted uppercase tracking-widest">Buscador de Stands Recomendados</p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {stands.map(stand => (
                      <div 
                        key={stand.code}
                        onClick={() => setSelectedStand(selectedStand === stand.code ? null : stand.code)}
                        className={cn(
                          "p-3.5 rounded-xl border flex flex-col text-left transition-colors cursor-pointer",
                          selectedStand === stand.code 
                            ? "bg-accent/10 border-accent/40" 
                            : "bg-surface-subtle border-border/60 hover:bg-surface-subtle/85"
                        )}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-xs font-black text-white">{stand.name}</span>
                            <span className="text-[9px] text-muted ml-2">({stand.location})</span>
                          </div>
                          <span className="text-xs font-mono font-black text-accent">{stand.code}</span>
                        </div>
                        {selectedStand === stand.code && (
                          <div className="mt-2.5 pt-2 border-t border-white/5 text-[10px] text-muted-foreground font-medium animate-in fade-in duration-200">
                            📢 <strong className="text-white">Destacado:</strong> {stand.highlight}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transport to Sede */}
                <div className="pt-2">
                  <button
                    onClick={() => setShowMobilityFor({ lat: PALAIS_COORDS.lat, lng: PALAIS_COORDS.lng, name: 'Palais des Congrès de París' })}
                    className="w-full py-4.5 rounded-2xl bg-accent text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-95 active:scale-95 transition-transform shadow-lg shadow-accent/10"
                  >
                    <Car size={14} /> Cómo llegar al Palais en 1 Tap
                  </button>
                </div>
              </motion.div>
            )}

            {activeCategory === 'hotel' && (
              <motion.div 
                key="hotel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5 text-left"
              >
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#00D1FF] bg-[#00D1FF]/10 px-2 py-0.5 rounded-full">Mi Estancia</span>
                  <h3 className="text-lg font-black tracking-tight text-white mt-1">{hotelInfo.name}</h3>
                  <p className="text-xs text-muted leading-snug">{hotelInfo.address}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-surface-subtle border border-border">
                    <p className="text-[8px] font-black text-muted uppercase tracking-widest">Distancia al Palais</p>
                    <p className="text-base font-black text-white mt-0.5">350 metros</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-surface-subtle border border-border">
                    <p className="text-[8px] font-black text-muted uppercase tracking-widest">ETA Andando</p>
                    <p className="text-base font-black text-white mt-0.5">~ 4 min</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#00D1FF]/5 border border-[#00D1FF]/15">
                  <p className="text-[9px] font-black text-accent uppercase tracking-widest">Aviso del Hotel</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-medium leading-relaxed">
                    Check-in prioritario disponible presentando tu pase virtual de JP Intelligence. Desayuno servido de 06:30h a 10:00h en el lobby principal.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setShowMobilityFor({ lat: hotelInfo.lat, lng: hotelInfo.lng, name: hotelInfo.name })}
                    className="w-full py-4.5 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                  >
                    <Compass size={14} className="text-[#00D1FF]" /> Opciones de movilidad al hotel
                  </button>
                </div>
              </motion.div>
            )}

            {activeCategory === 'medical' && (
              <motion.div 
                key="medical"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 text-left"
              >
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-500/10">Seguridad Médica</span>
                  <h3 className="text-lg font-black tracking-tight text-white mt-1">Urgencias y Hotspots de Salud</h3>
                  <p className="text-xs text-muted">Contactos críticos activos durante EuroPCR en París.</p>
                </div>

                <div className="space-y-3">
                  {MEDICAL_HOTSPOTS.map((hotspot, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-surface-subtle border border-border flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                        <hotspot.icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-white leading-tight line-clamp-1">{hotspot.name}</h4>
                          <span className="text-[8px] font-semibold text-muted shrink-0">{hotspot.address.split(',')[0]}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-snug">{hotspot.desc}</p>
                        <a 
                          href={`tel:${hotspot.tel}`} 
                          className="inline-flex items-center gap-1.5 text-[9px] font-black text-red-400 uppercase tracking-widest mt-1 hover:underline"
                        >
                          <Phone size={10} /> Llamar Directo
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeCategory === 'restaurants' && (
              <motion.div 
                key="restaurants"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 text-left"
              >
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Recomendado Gastro</span>
                  <h3 className="text-lg font-black tracking-tight text-white mt-1">Restaurantes Favoritos en la Zona</h3>
                  <p className="text-xs text-muted">Selección de gastronomía cercana con soporte para reservas ejecutivas.</p>
                </div>

                <div className="space-y-3">
                  {CURATED_RESTAURANTS.map((rest, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-surface-subtle border border-border flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="text-left">
                          <h4 className="text-xs font-black text-white">{rest.name}</h4>
                          <p className="text-[8px] font-black text-accent uppercase tracking-widest mt-0.5">{rest.type} • {rest.address}</p>
                        </div>
                        <button
                          onClick={() => setShowMobilityFor({ lat: rest.lat, lng: rest.lng, name: rest.name })}
                          className="px-3 py-1.5 rounded-lg bg-accent text-white text-[8px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all flex items-center gap-1"
                        >
                          Llegar <ChevronRight size={10} />
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-snug">{rest.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeCategory === 'transfers' && (
              <motion.div 
                key="transfers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5 text-left"
              >
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#00D1FF] bg-[#00D1FF]/10 px-2 py-0.5 rounded-full">Logística</span>
                  <h3 className="text-lg font-black tracking-tight text-white mt-1">Traslados y Salidas de París</h3>
                  <p className="text-xs text-muted">Opciones de transfer ejecutivo y conectores rápidos.</p>
                </div>

                <div className="p-4.5 rounded-2xl bg-surface-subtle border border-border flex items-center justify-between gap-4">
                  <div className="text-left space-y-1">
                    <p className="text-[8px] font-black text-muted uppercase tracking-widest">¿Vuelo Próximo?</p>
                    <h4 className="text-xs font-black text-white">Activar Modo Aeropuerto</h4>
                    <p className="text-[10px] text-muted-foreground leading-tight">Control en tiempo real de puertas, terminales y maletas.</p>
                  </div>
                  <button 
                    onClick={() => router.push('/dashboard')} // switches tab to Airport
                    className="px-4 py-2.5 rounded-xl bg-accent text-white text-[9px] font-black uppercase tracking-widest shrink-0"
                  >
                    Activar
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-[8px] font-black text-muted uppercase tracking-widest">Choferes VIP EuroPCR Autorizados</p>
                  <div className="p-4 rounded-2xl bg-surface-subtle border border-border flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-xs font-black text-white">G7 Chauffeur Service VIP</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Servicio prioritario con conductores bilingües oficiales.</p>
                    </div>
                    <a 
                      href="tel:+33141275555" 
                      className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center text-accent"
                    >
                      <Phone size={14} />
                    </a>
                  </div>
                </div>
              </motion.div>
            )}

            {activeCategory === 'agenda' && (
              <motion.div 
                key="agenda"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 text-left"
              >
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#00D1FF] bg-[#00D1FF]/10 px-2 py-0.5 rounded-full">Agenda Destacada</span>
                  <h3 className="text-lg font-black tracking-tight text-white mt-1">Sesiones de Alto Valor</h3>
                  <p className="text-xs text-muted">Sesiones clave pre-agendadas y recomendadas por la delegación.</p>
                </div>

                <div className="space-y-3">
                  {[
                    { title: 'EuroPCR Scientific Keynote Address', time: '08:30h - 10:00h', room: 'Grand Amphithéâtre', speaker: 'Dr. Jean-François R.' },
                    { title: 'TAVI Live Cases Broadcast from Rouen', time: '13:30h - 15:00h', room: 'Room Blue (Level 2)', speaker: 'Complex Intervention Team' },
                    { title: 'Official Networking Cocktail Dinner', time: '20:30h - 22:30h', room: 'Palais Royal Gardens', speaker: 'Todos los delegados' }
                  ].map((evt, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-surface-subtle border border-border flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                        <Clock size={16} />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[8px] font-black text-accent uppercase tracking-widest">{evt.time} • {evt.room}</span>
                        <h4 className="text-xs font-black text-white leading-tight">{evt.title}</h4>
                        <p className="text-[10px] text-muted-foreground font-medium">{evt.speaker}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dynamic Mobility Drawer mount if requested */}
        <AnimatePresence>
          {showMobilityFor && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-[#09090A]/80 backdrop-blur-sm flex items-end justify-center p-4"
              onClick={() => setShowMobilityFor(null)}
            >
              <motion.div 
                initial={{ y: 100 }} 
                animate={{ y: 0 }} 
                exit={{ y: 100 }}
                className="bg-[#111115] border border-white/10 rounded-[3rem] w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto no-scrollbar"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-5">
                  <div className="text-left">
                    <p className="text-[8px] font-black text-accent uppercase tracking-widest">Quick Mobility Actions</p>
                    <h3 className="text-sm font-black text-white leading-tight">Opciones para: {showMobilityFor.name}</h3>
                  </div>
                  <button 
                    onClick={() => setShowMobilityFor(null)}
                    className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
                
                <MobilityActions 
                  destinationLat={showMobilityFor.lat}
                  destinationLng={showMobilityFor.lng}
                  destinationName={showMobilityFor.name}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

// Simple local X icon wrapper to avoid compilation issue if not fully imported
function X({ size, className }: { size: number; className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
