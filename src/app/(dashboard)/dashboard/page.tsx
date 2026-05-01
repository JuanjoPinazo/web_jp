'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
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
  FileText,
  Calendar,
  Trophy,
  ArrowLeftRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OutcomeDrawer } from '@/components/OutcomeDrawer';
import { OutcomeTimeline } from '@/components/OutcomeTimeline';

export default function DashboardPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { getMyActivePlan, loading: planLoading } = useTravelPlans();
  const userName = session.user?.name || 'Usuario';
  
  const [availableContexts, setAvailableContexts] = useState<any[]>([]);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<FullTravelPlan | null>(null);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContexts = async () => {
      if (!session?.user) return;
      
      const { supabase } = await import('@/lib/supabase');

      // Safety Check: If user is authenticated but might need to set a password
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      // If user has no identities (common in fresh invites) or was never confirmed
      if (authUser && !authUser.last_sign_in_at && authUser.app_metadata?.provider === 'email') {
        router.push('/set-password');
        return;
      }

      try {
        setLoading(true);
        // Fetch contexts the user is assigned to
        const { data: contexts, error } = await supabase
          .from('context_users')
          .select('context_id, contexts(*)')
          .eq('user_id', session.user.id);

        if (error) throw error;

        if (contexts && contexts.length > 0) {
          const list = contexts.map((c: any) => c.contexts).filter(Boolean);
          setAvailableContexts(list);
          if (list.length > 0) {
            setSelectedContextId((list[0] as any).id);
          }
        }
      } catch (err) {
        console.error('Error loading contexts:', err);
      } finally {
        setLoading(false);
      }
    };
    loadContexts();
  }, [session]);

  useEffect(() => {
    const loadPlan = async () => {
      if (!selectedContextId) return;
      const plan = await getMyActivePlan(selectedContextId);
      setActivePlan(plan);
    };
    loadPlan();
  }, [selectedContextId, getMyActivePlan]);

  const selectedContext = useMemo(() => {
    return availableContexts.find(c => c.id === selectedContextId);
  }, [availableContexts, selectedContextId]);

  const outcomeCards = useMemo(() => {
    if (!activePlan) return [];
    const cards: any[] = [];

    activePlan.flights.forEach((f) => {
      cards.push({
        id: `flight-${f.id}`,
        title: `Vuelo ${f.type === 'salida' ? 'Ida' : 'Vuelta'}`,
        status: f.airline ? `${f.airline} ${f.flight_number || ''}` : 'Vuelo confirmado',
        icon: Plane,
        actionType: 'flight',
        payload: f,
        details: {
          hora: `${new Date(f.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (Salida)`,
          ubicacion: f.origin || 'N/A',
          estado: f.status === 'confirmed' ? 'Confirmado' : 'Pendiente',
          observaciones: `Destino: ${f.destination || 'N/A'} | Ref: ${f.booking_reference || 'Sin ref.'}${f.terminal ? ` | Terminal: ${f.terminal}` : ''}`
        }
      });
    });

    activePlan.hotels.forEach((h) => {
      cards.push({
        id: `hotel-${h.id}`,
        title: 'Alojamiento',
        status: h.hotel_name,
        icon: Building2,
        actionType: 'hotel',
        payload: h,
        details: {
          hora: `${new Date(h.check_in).toLocaleDateString([], {day: '2-digit', month: 'short'})} (Check-in)`,
          ubicacion: h.hotel_name,
          estado: 'Reservado',
          observaciones: `Ref: ${h.booking_reference || 'Confirmado'}${h.room_type ? ` | Hab: ${h.room_type}` : ''}. ${h.notes || ''}`
        }
      });
    });

    activePlan.transfers.forEach((t) => {
      cards.push({
        id: `transfer-${t.id}`,
        title: 'Traslado',
        status: t.pickup_location,
        icon: Car,
        actionType: 'transfer',
        payload: t,
        details: {
          hora: `${new Date(t.pickup_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (Recogida)`,
          ubicacion: t.pickup_location,
          estado: 'Coordinado',
          observaciones: `Destino: ${t.dropoff_location}. Chófer: ${t.driver_name || 'Personal Asignado'}${t.driver_phone ? ` (${t.driver_phone})` : ''}.`
        }
      });
    });

    activePlan.restaurants.forEach((r) => {
      cards.push({
        id: `restaurant-${r.id}`,
        title: 'Gastronomía',
        status: r.restaurant_name,
        icon: Utensils,
        actionType: 'restaurant',
        payload: r,
        details: {
          hora: new Date(r.reservation_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          ubicacion: r.restaurant_name,
          estado: 'Reservado',
          observaciones: `Mesa para ${r.reservation_name || userName}. ${r.notes || ''}`
        }
      });
    });

    activePlan.documents.forEach((d) => {
      cards.push({
        id: `doc-${d.id}`,
        title: 'Dossier Digital',
        status: d.title,
        icon: FileText,
        actionType: 'document',
        payload: d,
        details: {
          hora: 'Digital',
          ubicacion: 'Área Privada',
          estado: 'Disponible',
          observaciones: 'Documentación oficial lista para su descarga.'
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

  return (
    <div className="space-y-10 pb-20 px-4 md:px-0">
      {/* Dynamic Header & Context Selector */}
      <header className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
              <ShieldCheck size={12} className="text-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Área Privada</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tight text-white leading-none">
              Hola, {userName.split(' ')[0]}.
            </h1>
          </div>

          {/* Event Selector for Multiple Events */}
          {availableContexts.length > 1 && (
            <div className="relative group">
              <div className="absolute inset-0 bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <div className="relative flex items-center gap-4 bg-surface border border-white/10 p-2 rounded-2xl">
                 <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                   <ArrowLeftRight size={20} />
                 </div>
                 <select 
                   value={selectedContextId || ''} 
                   onChange={(e) => setSelectedContextId(e.target.value)}
                   className="bg-transparent border-none text-xs font-black uppercase tracking-widest outline-none pr-8 cursor-pointer text-white"
                 >
                   {availableContexts.map(ctx => (
                     <option key={ctx.id} value={ctx.id} className="bg-surface">{ctx.name}</option>
                   ))}
                 </select>
              </div>
            </div>
          )}
        </div>

        {/* Selected Event Context Card */}
        {selectedContext && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-accent/20 to-transparent border border-accent/20 overflow-hidden group"
          >
             {/* Decorative Background Elements */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-[80px] -mr-32 -mt-32 rounded-full" />
             
             <div className="relative flex flex-col md:flex-row gap-8 justify-between items-start md:items-center">
                <div className="flex gap-6 items-center">
                   <div className="w-16 h-16 rounded-2xl bg-accent text-background flex items-center justify-center shadow-2xl shadow-accent/20 group-hover:scale-110 transition-transform duration-500">
                      <Trophy size={32} />
                   </div>
                   <div className="space-y-1">
                      <h2 className="text-2xl md:text-3xl font-black font-heading tracking-tight text-white">{selectedContext.name}</h2>
                      <div className="flex flex-wrap items-center gap-4 text-muted">
                         <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                            <MapPin size={14} className="text-accent" />
                            {selectedContext.location || 'París, Francia'}
                         </div>
                         <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                            <Calendar size={14} className="text-accent" />
                            {selectedContext.start_date ? new Date(selectedContext.start_date).toLocaleDateString() : 'Mayo 2026'}
                         </div>
                      </div>
                   </div>
                </div>
                <button 
                  onClick={() => setShowTimeline(true)}
                  className="w-full md:w-auto px-8 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent/40 transition-all flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest group"
                >
                   Ver Itinerario Completo
                   <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
             </div>
          </motion.div>
        )}
      </header>

      {/* Plans Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
           <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted ml-2">Logística Resolutiva</h3>
           {activePlan?.status === 'confirmed' && (
             <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                <CheckCircle2 size={12} />
                Plan Confirmado
             </div>
           )}
        </div>

        {planLoading ? (
           <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-accent" size={32} />
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Sincronizando Dossier...</p>
           </div>
        ) : outcomeCards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {outcomeCards.map((card, i) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className="group relative cursor-pointer"
              >
                <div className="absolute inset-0 bg-accent/20 blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-[2rem]" />
                <div className="relative p-8 rounded-[2.5rem] bg-surface border border-border group-hover:border-accent/40 transition-all duration-500 h-full flex flex-col justify-between space-y-8 overflow-hidden shadow-sm">
                   {/* Card Header */}
                   <div className="flex justify-between items-start">
                      <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-border group-hover:border-accent/30 text-muted group-hover:text-accent transition-all group-hover:scale-110 duration-500">
                         <card.icon size={24} />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                         <span className="text-[10px] font-black text-accent uppercase tracking-widest">{card.details.estado}</span>
                         <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      </div>
                   </div>

                   {/* Card Body */}
                   <div className="space-y-1">
                      <h3 className="text-xl font-bold font-heading group-hover:text-white transition-colors">{card.title}</h3>
                      <p className="text-xs text-muted font-medium group-hover:text-muted/80 transition-colors">{card.status}</p>
                   </div>

                   {/* Card Footer */}
                   <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                      <div className="space-y-1">
                         <p className="text-[10px] font-black text-muted uppercase tracking-widest">{card.details.hora}</p>
                         <p className="text-xs font-bold text-white/90">{card.details.ubicacion}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-[#0a0a0a] border border-border flex items-center justify-center text-muted group-hover:text-accent group-hover:border-accent/30 transition-all">
                         <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-16 rounded-[3rem] bg-surface/50 border-2 border-dashed border-border flex flex-col items-center text-center gap-6">
             <div className="w-20 h-20 rounded-3xl bg-muted/10 flex items-center justify-center text-muted">
                <Milestone size={40} />
             </div>
             <div className="space-y-2">
                <h4 className="text-2xl font-black font-heading text-white">Sin logística activa</h4>
                <p className="text-sm text-muted max-w-sm mx-auto">
                   Actualmente no tienes un plan logístico asignado para este evento. Contacta con soporte si esperabas ver información aquí.
                </p>
             </div>
          </div>
        )}
      </div>

      {/* RECODS BLOCK (Placeholder or small entry) */}
      <div className="pt-10 border-t border-white/5">
         <div className="flex flex-col md:flex-row gap-8 items-center bg-[#0a0a0a]/50 p-10 rounded-[3rem] border border-white/5">
            <div className="flex-1 space-y-4">
               <h3 className="text-2xl font-black font-heading text-white tracking-tight uppercase">Dossier de Experiencias</h3>
               <p className="text-sm text-muted leading-relaxed">
                  Basado en tu agenda en <strong>{selectedContext?.name || 'el evento'}</strong>, hemos preparado una selección exclusiva de gastronomía y ocio para optimizar tu tiempo libre.
               </p>
            </div>
            <button className="px-10 py-5 rounded-2xl bg-accent text-background font-black text-sm uppercase tracking-widest shadow-2xl shadow-accent/20 hover:scale-105 transition-all">
               Descubrir Dossier
            </button>
         </div>
      </div>

      <OutcomeDrawer 
        isOpen={!!selectedCard}
        card={selectedCard} 
        onClose={() => setSelectedCard(null)} 
      />

      <AnimatePresence>
        {showTimeline && (
          <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTimeline(false)}
              className="absolute inset-0 bg-background/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-surface border border-white/10 rounded-t-[3rem] md:rounded-[3.5rem] p-8 md:p-12 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
               <div className="flex justify-between items-center mb-10 shrink-0">
                  <div className="space-y-1">
                    <h3 className="text-3xl font-black font-heading text-white uppercase tracking-tighter">Itinerario Operativo</h3>
                    <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">Resolución Integral</p>
                  </div>
                  <button 
                    onClick={() => setShowTimeline(false)}
                    className="p-3 rounded-full bg-background border border-border text-muted hover:text-white"
                  >
                    <ChevronDown size={28} />
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                  <OutcomeTimeline plan={activePlan} />
               </div>

               <div className="pt-8 border-t border-white/5 mt-4 text-center shrink-0">
                  <p className="text-[10px] font-black text-muted uppercase tracking-widest">Soporte Concierge 24/7 activado para este evento</p>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
