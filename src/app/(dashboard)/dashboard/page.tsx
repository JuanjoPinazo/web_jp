'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTravelPlans, FullTravelPlan } from '@/hooks/useTravelPlans';
import { 
  Building2, 
  MapPin, 
  CheckCircle2, 
  Plane, 
  Car, 
  Utensils, 
  Milestone,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Loader2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OutcomeDrawer } from '@/components/OutcomeDrawer';
import { OutcomeTimeline } from '@/components/OutcomeTimeline';

export default function DashboardPage() {
  const { session } = useAuth();
  const { getMyActivePlan, loading } = useTravelPlans();
  const userName = session.user?.name || 'Usuario';
  
  const [activePlan, setActivePlan] = useState<FullTravelPlan | null>(null);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    // In a real app with multiple contexts, we'd get the active context_id from a selector or URL.
    // For now, we will fetch the context from session or assume they have one active plan.
    // However, getMyActivePlan requires contextId. We will fetch the first context they belong to.
    const loadData = async () => {
      if (!session?.user) return;
      const { supabase } = await import('@/lib/supabase');
      const { data: contexts } = await supabase
        .from('context_users')
        .select('context_id')
        .eq('user_id', session.user.id)
        .limit(1);

      if (contexts && contexts.length > 0) {
        const plan = await getMyActivePlan(contexts[0].context_id);
        setActivePlan(plan);
      }
    };
    loadData();
  }, [session]);

  const outcomeCards = useMemo(() => {
    if (!activePlan) return [];
    const cards: any[] = [];

    activePlan.flights.forEach((f, i) => {
      cards.push({
        id: `flight-${f.id}`,
        title: `Vuelo ${f.type === 'salida' ? 'Ida' : 'Vuelta'}`,
        status: 'Vuelo confirmado',
        icon: Plane,
        actionType: 'flight',
        payload: f,
        details: {
          hora: `${new Date(f.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (Salida)`,
          ubicacion: f.origin || 'N/A',
          estado: 'Confirmado',
          observaciones: `${f.flight_number || ''} | Destino: ${f.destination || 'N/A'} | Ref: ${f.booking_reference || 'N/A'}`
        }
      });
    });

    activePlan.hotels.forEach((h, i) => {
      cards.push({
        id: `hotel-${h.id}`,
        title: 'Alojamiento',
        status: 'Hotel confirmado',
        icon: Building2,
        actionType: 'hotel',
        payload: h,
        details: {
          hora: `${new Date(h.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (Check-in)`,
          ubicacion: h.hotel_name,
          estado: 'Confirmado',
          observaciones: `Ref: ${h.booking_reference || 'N/A'}. ${h.notes || ''}`
        }
      });
    });

    activePlan.transfers.forEach((t, i) => {
      cards.push({
        id: `transfer-${t.id}`,
        title: 'Traslado',
        status: 'Vehículo coordinado',
        icon: Car,
        actionType: 'transfer',
        payload: t,
        details: {
          hora: `${new Date(t.pickup_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (Recogida)`,
          ubicacion: t.pickup_location,
          estado: 'Asignado',
          observaciones: `Destino: ${t.dropoff_location}. Chófer: ${t.driver_name || 'Pendiente'}. Vehículo: ${t.vehicle || 'Estándar'}`
        }
      });
    });

    activePlan.restaurants.forEach((r, i) => {
      cards.push({
        id: `restaurant-${r.id}`,
        title: 'Gastronomía',
        status: 'Mesa reservada',
        icon: Utensils,
        actionType: 'restaurant',
        payload: r,
        details: {
          hora: new Date(r.reservation_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          ubicacion: r.restaurant_name,
          estado: 'Reservado',
          observaciones: `A nombre de: ${r.reservation_name || userName}. ${r.notes || ''}`
        }
      });
    });

    activePlan.documents.forEach((d, i) => {
      cards.push({
        id: `doc-${d.id}`,
        title: 'Documento',
        status: d.title,
        icon: FileText,
        actionType: 'document',
        payload: d,
        details: {
          hora: 'Disponible',
          ubicacion: 'Nube',
          estado: 'Accesible',
          observaciones: 'Puedes descargar este documento para tu viaje.'
        }
      });
    });

    return cards;
  }, [activePlan, userName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-accent" size={40} />
      </div>
    );
  }

  if (!activePlan) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-4 animate-pulse">
          <Milestone size={40} />
        </div>
        <h1 className="text-4xl md:text-5xl font-black font-heading tracking-tight text-white">Planificación en proceso.</h1>
        <p className="text-lg text-muted max-w-md">Estamos confeccionando tu logística. Recibirás una notificación cuando tu plan de viaje esté organizado y verificado.</p>
      </div>
    );
  }

  const mainHotel = activePlan.hotels[0];

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-32">
      {/* 1. HEADER (CONCIERGE STYLE) */}
      <header className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-accent">Tu logística operativa</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tight text-white leading-[0.9]">
            Hola, {userName}.
          </h1>
          <p className="text-xl md:text-2xl font-bold text-white/60 font-heading">
            Evento Activo
          </p>
        </div>
        
        <div className="flex items-center gap-4 text-muted">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest ">Planificación organizada</span>
            </div>
        </div>
      </header>

      {/* 2. MAIN DECISION CARD (PRIMARY FOCUS) */}
      {mainHotel && (
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted">Alojamiento Confirmado</h3>
             <div className="flex items-center gap-1.5 text-[10px] font-black text-accent uppercase tracking-widest">
                <ShieldCheck size={12} />
                Validado para tu operativa
             </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative group p-8 md:p-10 rounded-[3.5rem] bg-surface border border-white/10 shadow-2xl overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[80px] rounded-full group-hover:bg-accent/10 transition-all duration-1000" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div className="space-y-8 relative z-10">
                <div className="flex items-center gap-4">
                   <div className="w-16 h-16 rounded-[1.75rem] bg-accent/10 flex items-center justify-center text-accent shadow-inner border border-accent/20">
                      <Building2 size={32} />
                   </div>
                   <div>
                      <h2 className="text-3xl font-black text-white">{mainHotel.hotel_name}</h2>
                      <p className="text-xs font-bold text-accent uppercase tracking-widest mt-1">Check-in Programado</p>
                   </div>
                </div>

                <div className="space-y-4">
                   {[
                     `Check-in: ${new Date(mainHotel.check_in).toLocaleDateString()}`,
                     `Check-out: ${new Date(mainHotel.check_out).toLocaleDateString()}`,
                     `Ref: ${mainHotel.booking_reference || 'Confirmada'}`
                   ].map((text, i) => (
                     <div key={i} className="flex items-center gap-3 text-white/80">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        <span className="text-sm font-semibold">{text}</span>
                     </div>
                   ))}
                </div>

                <button 
                  onClick={() => setShowTimeline(!showTimeline)}
                  className="w-full md:w-auto px-8 py-4 rounded-[1.5rem] bg-white text-black font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-accent hover:text-white transition-all group/btn active:scale-95"
                >
                   {showTimeline ? 'Ocultar Itinerario' : 'Ver tu itinerario completo'}
                   {showTimeline ? <ChevronDown size={18} /> : <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />}
                </button>
              </div>

              <div className="relative aspect-square md:aspect-auto md:h-full rounded-[2.5rem] overflow-hidden border border-white/5">
                 <img 
                   src="https://images.unsplash.com/photo-1551882547-ff43c69e5cf2?auto=format&fit=crop&q=80&w=800" 
                   alt={mainHotel.hotel_name}
                   className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                 <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center text-white">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Ubicación</p>
                       <p className="text-sm font-bold truncate max-w-[200px]">{mainHotel.address || 'Dirección en sistema'}</p>
                    </div>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mainHotel.hotel_name + ' ' + (mainHotel.address||''))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 hover:bg-accent transition-colors"
                    >
                       <MapPin size={18} />
                    </a>
                 </div>
              </div>
            </div>
          </motion.div>

          {/* 6. EXPANDABLE DETAILS (TIMELINE) */}
          <AnimatePresence>
            {showTimeline && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-surface/30 rounded-[3rem] border border-white/5"
              >
                <div className="p-8 md:p-12">
                  <OutcomeTimeline plan={activePlan} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* 4. HORIZONTAL PLAN SECTION (CAROUSEL) */}
      <section className="space-y-8">
        <div className="flex items-center justify-between px-2">
           <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted">Operativa Coordinada</h3>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide snap-x">
          {outcomeCards.map((card) => (
            <button
              key={card.id}
              onClick={() => setSelectedCard(card)}
              className="flex-shrink-0 w-44 snap-center p-6 rounded-[2.25rem] bg-surface/50 border border-white/5 hover:border-accent/40 transition-all text-left space-y-6 group"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-muted group-hover:text-accent group-hover:bg-accent/10 transition-colors">
                <card.icon size={22} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted truncate">{card.title}</p>
                <p className="text-sm font-bold text-white/90 leading-tight line-clamp-2">{card.status}</p>
              </div>
              <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-500">
                  <CheckCircle2 size={10} />
                  Confirmado
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 5. SYSTEM STATE BLOCK */}
      <section className="relative p-10 rounded-[3rem] bg-surface/20 border border-dashed border-white/10 text-center space-y-4">
        <div className="flex flex-col items-center gap-2">
            <h3 className="text-2xl font-black text-white">Todo bajo control</h3>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs">
              Puedes centrarte en tu evento. Nosotros hemos coordinado el resto.
            </p>
        </div>
        {activePlan.support_phone && (
          <div className="pt-4">
            <a href={`tel:${activePlan.support_phone}`} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent/10 text-accent font-bold text-sm hover:bg-accent hover:text-white transition-colors">
              Contactar Soporte
            </a>
          </div>
        )}
      </section>

      {/* Outcome Drawer / Bottom Sheet */}
      <OutcomeDrawer 
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        card={selectedCard}
      />
    </div>
  );
}
