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
  ArrowLeftRight,
  User
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

    // 1. Sort flights to assign Ida/Vuelta correctly. Only show VERIFIED flights to client.
    const sortedFlights = [...activePlan.flights]
      .filter(f => f.is_verified)
      .sort((a, b) => new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime());
    
    const formatRawTime = (dateStr: string) => {
      if (!dateStr) return '';
      const timePart = dateStr.split('T')[1];
      return timePart ? timePart.substring(0, 5) : '';
    };

    sortedFlights.forEach((f, idx) => {
      const flightDoc = activePlan.documents.find(d => d.related_entity === 'flight' && d.related_entity_id === f.id);
      const depDate = new Date(f.departure_time);
      const arrDate = f.arrival_time ? new Date(f.arrival_time) : null;
      
      // Relative time (Salida en X días)
      const diffDays = Math.ceil((depDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      const timeLabel = diffDays > 0 ? `Salida en ${diffDays} ${diffDays === 1 ? 'día' : 'días'}` : 'Salida hoy';

      cards.push({
        id: `flight-${f.id}`,
        title: f.type === 'return' ? 'Vuelo de Vuelta' : 'Vuelo de Ida',
        status: `${f.departure_location || 'MAD'} ➔ ${f.arrival_location || 'CDG'}`,
        icon: Plane,
        actionType: 'flight',
        payload: { ...f, voucher_url: flightDoc?.file_url },
        details: {
          hora: `${formatRawTime(f.departure_time)}${f.arrival_time ? ` ➔ ${formatRawTime(f.arrival_time)}` : ''}`,
          ubicacion: `${depDate.toLocaleDateString('es-ES', {weekday: 'short', day: 'numeric', month: 'long'})}`,
          estado: 'Confirmado',
          observaciones: `${f.airline || ''} ${f.flight_number || ''} | Reserva: ${f.reservation_code || 'S/R'}${f.seat ? ` | Asiento: ${f.seat}` : ''}${f.baggage_info ? ` | ${f.baggage_info}` : ' | Equipaje incluido'}`
        }
      });
    });

    activePlan.hotels.forEach((h) => {
      const hotelDoc = activePlan.documents.find(d => d.related_entity === 'hotel' && d.related_entity_id === h.id);
      cards.push({
        id: `hotel-${h.id}`,
        title: 'Alojamiento',
        status: h.hotel_name,
        icon: Building2,
        actionType: 'hotel',
        payload: { ...h, voucher_url: hotelDoc?.file_url },
        details: {
          hora: `${new Date(h.check_in).toLocaleDateString('es-ES', {day: '2-digit', month: 'short'})} ➔ ${new Date(h.check_out).toLocaleDateString('es-ES', {day: '2-digit', month: 'short'})}`,
          ubicacion: h.address || h.hotel_name,
          estado: 'Confirmado',
          observaciones: `Ref: ${h.confirmation_number || 'Confirmada'}${h.room_type ? ` | Hab: ${h.room_type}` : ''}`
        }
      });
    });

    activePlan.transfers.forEach((t) => {
      cards.push({
        id: `transfer-${t.id}`,
        title: 'Traslado Privado',
        status: t.pickup_location,
        icon: Car,
        actionType: 'transfer',
        payload: t,
        details: {
          hora: `${new Date(t.pickup_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (Recogida)`,
          ubicacion: t.pickup_location,
          estado: 'Programado',
          observaciones: `Destino: ${t.dropoff_location}. Chófer: ${t.driver_name || 'Asignado'}.`
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

    // Removed general document cards from here to avoid duplication
    // They are now exclusively shown in the "Documentación Oficial" section

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
    <div className="max-w-3xl mx-auto space-y-12 pb-24 px-4 md:px-0">
      {/* 1. HEADER CONCIERGE */}
      <header className="space-y-6 pt-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-black font-heading tracking-tight text-foreground leading-none">
              Hola, {userName.split(' ')[0]}.
            </h1>
            <p className="text-base md:text-lg font-medium text-muted">
              {selectedContext?.name || 'Tu próximo evento'} · {selectedContext?.location || 'Destino'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <CheckCircle2 size={12} />
              <span className="text-[10px] font-black uppercase tracking-widest">Planificación completa</span>
            </div>
            <p className="text-[10px] font-black text-muted uppercase tracking-widest">
              {selectedContext?.start_date ? new Date(selectedContext.start_date).toLocaleDateString([], {day:'2-digit', month:'short'}) : '19-22 May'}
            </p>
          </div>
        </div>
      </header>

      {/* 2. CONTROL PANEL SUMMARY */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { 
            label: 'Vuelos Confirmados', 
            count: activePlan?.flights.filter(f => f.is_verified).length || 0, 
            icon: Plane, 
            color: 'text-purple-400',
            status: activePlan?.flights.some(f => f.is_verified) ? 'Confirmado' : 'Pendiente'
          },
          { 
            label: 'Hotel Gestionado', 
            count: activePlan?.hotels.length || 0, 
            icon: Building2, 
            color: 'text-emerald-400',
            status: activePlan?.hotels.length ? 'Confirmado' : 'Pendiente'
          },
          { 
            label: 'Traslados Listos', 
            count: activePlan?.transfers.length || 0, 
            icon: Car, 
            color: 'text-amber-400',
            status: activePlan?.transfers.length ? 'Programado' : 'Pendiente'
          }
        ].map((stat, i) => (
          <div key={i} className="p-5 md:p-6 rounded-3xl bg-surface border border-border shadow-sm flex items-center gap-5 md:gap-6 group hover:shadow-md transition-all">
             <div className={`p-3 md:p-4 rounded-2xl bg-surface-subtle ${stat.color} group-hover:scale-110 transition-transform`}>
               <stat.icon size={24} />
             </div>
             <div>
               <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">{stat.label}</p>
               <div className="flex items-baseline gap-2">
                 <p className="text-2xl font-black text-foreground">{stat.count}</p>
                 <span className="text-[8px] font-black uppercase text-accent tracking-widest">{stat.status}</span>
               </div>
             </div>
          </div>
        ))}
      </section>

      {/* 3. ALOJAMIENTO CONFIRMADO (BLOQUE PRINCIPAL) */}
      {activePlan?.hotels[0] && (
        <section className="relative group cursor-pointer" onClick={() => setSelectedCard(outcomeCards.find(c => c.actionType === 'hotel'))}>
          <div className="absolute inset-0 bg-accent/10 blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity rounded-[3rem]" />
          <div className="relative p-8 md:p-10 rounded-[3rem] bg-gradient-to-br from-surface to-surface-subtle border border-border shadow-xl overflow-hidden">
             <div className="absolute top-0 right-0 p-8 text-accent/10">
               <Building2 size={80} />
             </div>
             
             <div className="space-y-8 relative z-10">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-accent uppercase tracking-[0.4em]">Alojamiento Confirmado</p>
                  <h2 className="text-3xl md:text-4xl font-black font-heading text-foreground tracking-tight">{activePlan.hotels[0].hotel_name}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <div className="flex items-center gap-3 text-foreground/80 text-sm font-bold">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        Ubicación óptima
                      </div>
                      <div className="flex items-center gap-3 text-foreground/80 text-sm font-bold">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        Check-in gestionado
                      </div>
                      <div className="flex items-center gap-3 text-foreground/80 text-sm font-bold">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        A 5 min del congreso
                      </div>
                   </div>
                   <div className="flex items-end md:justify-end">
                      <button className="w-full md:w-auto px-6 py-3 rounded-xl bg-surface border border-border text-[10px] font-black uppercase tracking-widest text-foreground hover:bg-surface-subtle transition-all">
                        Ver Detalles
                      </button>
                   </div>
                </div>
             </div>
          </div>
        </section>
      )}

      {/* 3. RESULTADOS COORDINADOS (HORIZONTAL CARDS) */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted ml-2">Resultados Coordinados</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           {[
             { label: 'Vuelo', icon: Plane, status: activePlan?.flights.some(f => f.is_verified) ? 'Confirmado' : 'Pendiente', color: 'text-purple-400' },
             { label: 'Traslado', icon: Car, status: activePlan?.transfers.length ? 'Programado' : 'Pendiente', color: 'text-amber-400' },
             { label: 'Cena', icon: Utensils, status: activePlan?.restaurants.length ? 'Reservada' : 'Pendiente', color: 'text-pink-400' },
             { label: 'Congreso', icon: Trophy, status: 'Acceso VIP', color: 'text-emerald-400' }
           ].map((item, i) => (
             <div key={i} className="p-6 rounded-[2rem] bg-surface border border-border shadow-sm space-y-4">
                <div className={`p-3 rounded-xl bg-surface-subtle w-fit ${item.color}`}>
                   <item.icon size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted uppercase tracking-widest">{item.label}</p>
                  <p className="text-xs font-bold text-foreground">{item.status}</p>
                </div>
             </div>
           ))}
        </div>
      </section>

      {/* 4. TIMELINE (LA ESPINA DEL VIAJE) */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted ml-2">Tu Itinerario Operativo</h3>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="p-6 md:p-12 rounded-[3rem] bg-surface border border-border shadow-sm">
           <OutcomeTimeline plan={activePlan} />
        </div>
      </section>

      {/* 5. DOCUMENTACIÓN */}
      {activePlan?.documents && activePlan.documents.length > 0 && (
        <section className="space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted ml-2">Documentos Oficiales</h3>
          <div className="space-y-3">
            {activePlan.documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-5 md:p-6 rounded-3xl bg-surface border border-border shadow-sm group hover:border-accent/30 transition-all">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="p-3 rounded-xl bg-surface-subtle text-accent shrink-0">
                    <FileText size={20} />
                  </div>
                  <p className="text-sm font-bold text-foreground truncate">{doc.title}</p>
                </div>
                <a 
                  href={doc.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 md:px-5 py-2.5 rounded-xl bg-surface border border-border text-[9px] font-black uppercase tracking-widest text-foreground hover:bg-accent hover:text-white transition-all shadow-sm shrink-0"
                >
                  Descargar
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. SOPORTE CONCIERGE */}
      {activePlan?.logistic_contact && (
        <section className="p-8 md:p-10 rounded-[3rem] bg-gradient-to-br from-accent/10 to-surface border border-accent/20 shadow-xl">
           <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 md:w-20 md:h-20 rounded-[1.5rem] md:rounded-[2rem] bg-accent/10 border border-accent/20 p-1 overflow-hidden relative">
                    {activePlan?.logistic_contact.avatar_url ? (
                      <img 
                        src={activePlan.logistic_contact.avatar_url} 
                        alt={activePlan.logistic_contact.name} 
                        className="w-full h-full object-cover rounded-[1.3rem] md:rounded-[1.8rem] grayscale hover:grayscale-0 transition-all duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full bg-accent/5 flex items-center justify-center text-accent/40 rounded-[1.3rem] md:rounded-[1.8rem]">
                        <User size={32} />
                      </div>
                    )}
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-accent uppercase tracking-[0.4em]">Tu Coordinador</p>
                    <h4 className="text-2xl md:text-3xl font-black font-heading text-foreground">{activePlan?.logistic_contact.name}</h4>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
                      {activePlan?.logistic_contact.role} {activePlan?.logistic_contact.company && `· ${activePlan.logistic_contact.company}`}
                    </p>
                 </div>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                 {activePlan?.logistic_contact.phone && (
                   <a href={`tel:${activePlan.logistic_contact.phone}`} className="flex-1 md:flex-none px-6 md:px-8 py-4 rounded-2xl bg-surface border border-border text-[10px] font-black uppercase tracking-widest text-foreground text-center hover:bg-surface-subtle transition-all shadow-sm">Llamar</a>
                 )}
                 {activePlan?.logistic_contact.whatsapp && (
                   <a href={`https://wa.me/${activePlan.logistic_contact.whatsapp.replace(/\+/g, '')}`} className="flex-1 md:flex-none px-6 md:px-8 py-4 rounded-2xl bg-accent text-white text-[10px] font-black uppercase tracking-widest text-center hover:scale-105 transition-all shadow-xl shadow-accent/20">WhatsApp</a>
                 )}
                 {activePlan?.logistic_contact.email && !activePlan.logistic_contact.whatsapp && (
                    <a href={`mailto:${activePlan.logistic_contact.email}`} className="flex-1 md:flex-none px-6 md:px-8 py-4 rounded-2xl bg-accent text-white text-[10px] font-black uppercase tracking-widest text-center hover:scale-105 transition-all shadow-xl shadow-accent/20">Email</a>
                 )}
              </div>
           </div>
        </section>
      )}

      {/* 7. BLOQUE TODO BAJO CONTROL */}
      <footer className="pt-8 pb-12 text-center space-y-6">
         <div className="inline-flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
               <ShieldCheck size={32} />
            </div>
            <div className="space-y-1">
               <h3 className="text-2xl font-black font-heading text-foreground uppercase tracking-tight">Todo bajo control</h3>
               <p className="text-sm font-medium text-muted">No tienes que hacer nada más. Disfruta del evento.</p>
            </div>
         </div>
         <div className="pt-10">
            <p className="text-[9px] font-black text-muted/40 uppercase tracking-[0.5em]">JP Intelligence Concierge Edition</p>
         </div>
      </footer>

      <OutcomeDrawer 
        isOpen={!!selectedCard}
        card={selectedCard} 
        onClose={() => setSelectedCard(null)} 
      />
    </div>
  );
}
