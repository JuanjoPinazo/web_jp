'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useTravelPlans, FullTravelPlan } from '@/hooks/useTravelPlans';
import { usePlanModules } from '@/hooks/usePlanModules';
import { 
  Building2, 
  MapPin, 
  CheckCircle2, 
  Plane, 
  Car, 
  Utensils, 
  Coffee,
  Milestone,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Loader2,
  FileText,
  Calendar,
  Trophy,
  ArrowLeftRight,
  User,
  QrCode,
  Maximize2,
  X,
  Clock,
  Smartphone,
  Phone,
  Mail
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { OutcomeDrawer } from '@/components/OutcomeDrawer';
import { OutcomeTimeline } from '@/components/OutcomeTimeline';

export default function DashboardPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { getMyActivePlan, loading: planLoading } = useTravelPlans();
  const { getEnabledModules } = usePlanModules();
  const userName = session.user?.name || 'Usuario';
  
  const [availableContexts, setAvailableContexts] = useState<any[]>([]);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<FullTravelPlan | null>(null);
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({});
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [selectedQR, setSelectedQR] = useState<any>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContexts = async () => {
      if (!session?.user) return;
      
      const { supabase } = await import('@/lib/supabase');

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser && !authUser.last_sign_in_at && authUser.app_metadata?.provider === 'email') {
        router.push('/set-password');
        return;
      }

      try {
        setLoading(true);
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
  }, [session, router]);

  useEffect(() => {
    const loadPlan = async () => {
      if (!selectedContextId) return;
      const plan = await getMyActivePlan(selectedContextId);
      setActivePlan(plan);
      
      if (plan) {
        const modules = await getEnabledModules(plan.id);
        setEnabledModules(modules);
      }
    };
    loadPlan();
  }, [selectedContextId, getMyActivePlan, getEnabledModules]);

  const selectedContext = useMemo(() => {
    return availableContexts.find(c => c.id === selectedContextId);
  }, [availableContexts, selectedContextId]);

  const isModuleEnabled = (moduleId: string) => {
    if (Object.keys(enabledModules).length === 0) return true;
    return enabledModules[moduleId] === true;
  };

  const outcomeCards = useMemo(() => {
    if (!activePlan) return [];
    const cards: any[] = [];

    // 1. FLIGHTS (GROUPED)
    if (isModuleEnabled('flights')) {
      const sortedFlights = [...activePlan.flights]
        .filter(f => f.is_verified)
        .sort((a, b) => new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime());
      
      const formatRawTime = (dateStr: string) => {
        if (!dateStr) return '';
        const timePart = dateStr.split('T')[1];
        return timePart ? timePart.substring(0, 5) : '';
      };

      // Detect Round Trip Grouping
      const outbound = sortedFlights.find(f => f.type === 'outbound' || !f.type);
      const returnFlight = sortedFlights.find(f => f.type === 'return' || (outbound && f.departure_location === outbound.arrival_location));

      if (outbound && returnFlight && sortedFlights.length === 2) {
        // Unified Round Trip Card
        cards.push({
          id: `trip-${activePlan.id}`,
          title: 'Viaje Completo',
          status: `${outbound.departure_location} ➔ ${outbound.arrival_location} (R.T.)`,
          icon: Plane,
          actionType: 'round_trip',
          payload: { outbound, returnFlight },
          details: {
            hora: `${formatRawTime(outbound.departure_time)} (Ida) · ${formatRawTime(returnFlight.departure_time)} (Vuelta)`,
            ubicacion: `${outbound.departure_location} ➔ ${outbound.arrival_location} ➔ ${outbound.departure_location}`,
            estado: 'Confirmado',
            observaciones: 'Vuelos de ida y vuelta vinculados.'
          }
        });
      } else {
        // Individual Flights
        sortedFlights.forEach((f) => {
          const flightDoc = activePlan.documents.find(d => d.related_entity === 'flight' && d.related_entity_id === f.id);
          const depDate = new Date(f.departure_time);
          cards.push({
            id: `flight-${f.id}`,
            title: f.type === 'return' ? 'Vuelo de Vuelta' : 'Vuelo de Ida',
            status: `${f.departure_location || '---'} ➔ ${f.arrival_location || '---'}`,
            icon: Plane,
            actionType: 'flight',
            payload: { ...f, voucher_url: flightDoc?.file_url },
            details: {
              hora: `${formatRawTime(f.departure_time)}${f.arrival_time ? ` ➔ ${formatRawTime(f.arrival_time)}` : ''}`,
              ubicacion: `${depDate.toLocaleDateString('es-ES', {weekday: 'short', day: 'numeric', month: 'long'})}`,
              estado: 'Confirmado',
              observaciones: `${f.airline || ''} ${f.flight_number || ''} | Reserva: ${f.reservation_code || 'S/R'}`
            }
          });
        });
      }
    }

    // 2. HOTELS (HUMANIZED)
    if (isModuleEnabled('hotels')) {
      const groupedStays: Record<string, any[]> = {};
      activePlan.hotel_stays?.forEach(h => {
        const groupId = h.room_group_id || h.id;
        if (!groupedStays[groupId]) groupedStays[groupId] = [];
        groupedStays[groupId].push(h);
      });

      const mapRoomType = (type?: string) => {
        if (!type) return 'Alojamiento';
        const t = type.toUpperCase();
        if (t === 'DUI') return 'Habitación Individual';
        if (t === 'DOBLE' || t === 'DBL') return 'Habitación Doble';
        return type;
      };

      Object.values(groupedStays).forEach((stays) => {
        const h = stays[0];
        const guestNames = stays.map(s => s.guest_name).join(', ');
        const hotelDoc = activePlan.documents.find(d => d.related_hotel_stay_id === h.id);
        cards.push({
          id: `hotel-${h.id}`,
          title: stays.length > 1 ? 'Habitación Compartida' : mapRoomType(h.room_type),
          status: h.hotel_name,
          icon: Building2,
          actionType: 'hotel',
          payload: { ...h, voucher_url: hotelDoc?.file_url, all_guests: stays.map(s => s.guest_name) },
          details: {
            hora: `Entrada: ${h.check_in_time || '15:00'} · Salida: ${h.check_out_time || '12:00'}`,
            ubicacion: h.address || h.hotel_name,
            estado: 'Confirmado',
            observaciones: `Huéspedes: ${guestNames}. ${h.breakfast_included ? 'Desayuno incluido.' : 'Solo alojamiento.'}`
          }
        });
      });
    }

    // 3. TRANSFERS
    if (isModuleEnabled('transfers')) {
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
    }

    // 4. RESTAURANTS
    if (isModuleEnabled('restaurants')) {
      activePlan.restaurants.forEach((r) => {
        const isReserved = r.type === 'reserved' || !r.type;
        cards.push({
          id: `restaurant-${r.id}`,
          title: isReserved ? 'Cena Organizada' : 'Recomendación Quilpro',
          status: r.restaurant_name,
          icon: isReserved ? Utensils : Coffee,
          actionType: 'restaurant',
          payload: r,
          details: {
            hora: isReserved ? new Date(r.reservation_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Sugerencia libre',
            ubicacion: r.restaurant_name,
            estado: isReserved ? 'Mesa Confirmada' : 'Seleccionado para ti',
            observaciones: isReserved 
              ? `Reserva exclusiva para ${r.reservation_name || userName}. Mesa preparada.`
              : (r.notes || 'Un lugar excepcional cerca de su ubicación.')
          }
        });
      });
    }

    // 5. OPERATIONAL DOCUMENTS (Boarding Passes & Confirmations)
    if (isModuleEnabled('flights') || isModuleEnabled('documents')) {
      const formatRawTime = (dateStr: string) => {
        if (!dateStr) return '';
        const timePart = dateStr.split('T')[1];
        return timePart ? timePart.substring(0, 5) : '';
      };

      activePlan.documents?.filter(d => d.visible_to_client !== false).forEach((doc) => {
        const flight = activePlan.flights?.find(f => f.id === doc.related_flight_id);
        
        // Define operational object type
        const isBP = doc.document_type === 'boarding_pass' || doc.title.toLowerCase().includes('tarjeta');
        const isConf = doc.document_type === 'flight_confirmation' || doc.title.toLowerCase().includes('reserva');

        if (isBP) {
          cards.push({
            id: `bp-${doc.id}`,
            title: 'Tarjeta de Embarque',
            status: flight ? `${flight.airline} ${flight.flight_number}` : (doc.display_title || doc.title),
            icon: QrCode,
            actionType: 'boarding_pass',
            payload: { ...doc, flight },
            details: {
              hora: flight ? `${formatRawTime(flight.departure_time)} (Salida)` : 'Hora confirmada',
              ubicacion: flight ? `${flight.departure_location} ➔ ${flight.arrival_location}` : 'Ruta confirmada',
              estado: doc.seat_assignment ? `Asiento ${doc.seat_assignment}` : 'Confirmada',
              observaciones: `Operado por ${flight?.airline || 'Compañía aérea'}. Recuerde tener el QR a mano.`
            }
          });
        } else if (isConf) {
          cards.push({
            id: `conf-${doc.id}`,
            title: 'Reserva de Vuelo',
            status: doc.display_title || doc.title,
            icon: FileText,
            actionType: 'flight_confirmation',
            payload: doc,
            details: {
              hora: flight ? formatRawTime(flight.departure_time) : 'Ver documento',
              ubicacion: flight ? `${flight.departure_location} ➔ ${flight.arrival_location}` : 'Información de trayecto',
              estado: 'Validado',
              observaciones: 'Detalles completos de su reserva y política de equipaje.'
            }
          });
        }
      });
    }

    return cards;
  }, [activePlan, userName, enabledModules]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-accent" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-12 pb-24 px-4 md:px-0">
      {/* HEADER */}
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
              {selectedContext?.start_date ? new Date(selectedContext.start_date).toLocaleDateString([], {day:'2-digit', month:'short'}) : 'Fecha por confirmar'}
            </p>
          </div>
        </div>
      </header>

      {/* STATS / MODULE SUMMARY - CATEGORIZED HIERARCHY */}
      <section className="space-y-8">
        {/* OPERATIVO */}
        {(isModuleEnabled('flights') || isModuleEnabled('hotels') || isModuleEnabled('transfers')) && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted ml-2">Logística Operativa</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {isModuleEnabled('flights') && (
                <div className="p-6 rounded-3xl bg-surface border border-border flex items-center gap-6 group hover:shadow-md transition-all">
                   <div className="p-4 rounded-2xl bg-surface-subtle text-purple-400 group-hover:scale-110 transition-transform">
                     <Plane size={24} />
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Vuelos</p>
                     <p className="text-2xl font-black text-foreground">{activePlan?.flights.filter(f => f.is_verified).length || 0}</p>
                   </div>
                </div>
              )}
              {isModuleEnabled('hotels') && (
                <div className="p-6 rounded-3xl bg-surface border border-border flex items-center gap-6 group hover:shadow-md transition-all">
                   <div className="p-4 rounded-2xl bg-surface-subtle text-emerald-400 group-hover:scale-110 transition-transform">
                     <Building2 size={24} />
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Alojamiento</p>
                     <p className="text-2xl font-black text-foreground">{activePlan?.hotel_stays?.length || 0}</p>
                   </div>
                </div>
              )}
              {isModuleEnabled('transfers') && (
                <div className="p-6 rounded-3xl bg-surface border border-border flex items-center gap-6 group hover:shadow-md transition-all">
                   <div className="p-4 rounded-2xl bg-surface-subtle text-amber-400 group-hover:scale-110 transition-transform">
                     <Car size={24} />
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Traslados</p>
                     <p className="text-2xl font-black text-foreground">{activePlan?.transfers.length || 0}</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* EXPERIENCIA & UTILIDAD (Two-column layout for desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* EXPERIENCIA */}
          {(isModuleEnabled('restaurants') || isModuleEnabled('agenda')) && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted ml-2">Experiencia & Agenda</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isModuleEnabled('restaurants') && (
                  <div className="p-5 rounded-3xl bg-surface border border-border flex items-center gap-4 group hover:shadow-md transition-all">
                    <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500 group-hover:rotate-12 transition-transform">
                      <Utensils size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-muted uppercase tracking-widest">Gastronomía</p>
                      <p className="text-lg font-black text-foreground">{activePlan?.restaurants.length || 0}</p>
                    </div>
                  </div>
                )}
                {isModuleEnabled('agenda') && (
                  <div className="p-5 rounded-3xl bg-surface border border-border flex items-center gap-4 group hover:shadow-md transition-all">
                    <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 group-hover:rotate-12 transition-transform">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-muted uppercase tracking-widest">Actividades</p>
                      <p className="text-lg font-black text-foreground">Sincronizada</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* UTILIDAD */}
          {(isModuleEnabled('documents') || isModuleEnabled('mobility')) && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted ml-2">Utilidades de Viaje</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isModuleEnabled('documents') && (
                  <div className="p-5 rounded-3xl bg-surface border border-border flex items-center gap-4 group hover:shadow-md transition-all">
                    <div className="p-3 rounded-xl bg-slate-500/10 text-slate-500 group-hover:rotate-12 transition-transform">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-muted uppercase tracking-widest">Documentos</p>
                      <p className="text-lg font-black text-foreground">{activePlan?.documents.length || 0}</p>
                    </div>
                  </div>
                )}
                {isModuleEnabled('mobility') && (
                  <div className="p-5 rounded-3xl bg-surface border border-border flex items-center gap-4 group hover:shadow-md transition-all">
                    <div className="p-3 rounded-xl bg-accent/10 text-accent group-hover:rotate-12 transition-transform">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-muted uppercase tracking-widest">Movilidad</p>
                      <p className="text-lg font-black text-foreground">Digital</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* DYNAMIC OPERATIONAL CARDS */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted ml-2">Próximas Gestiones</h3>
          <div className="flex-1 h-px bg-border" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {outcomeCards.map((card) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedCard(card)}
              className="group cursor-pointer"
            >
              <div className="p-8 rounded-[2.5rem] bg-surface border border-border hover:border-accent/40 transition-all duration-500 shadow-sm hover:shadow-2xl relative overflow-hidden h-full flex flex-col justify-between">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[40px] -mr-16 -mt-16 group-hover:bg-accent/10 transition-colors" />
                
                <div className="space-y-6 relative z-10">
                  <div className="flex justify-between items-start">
                    <div className="p-4 rounded-2xl bg-surface-subtle border border-border text-accent group-hover:scale-110 group-hover:bg-accent group-hover:text-white transition-all duration-500">
                      <card.icon size={24} />
                    </div>
                    <div className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                      <span className="text-[9px] font-black uppercase tracking-widest text-accent">{card.details.estado}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">{card.title}</p>
                    <h4 className="text-xl font-black text-foreground tracking-tight line-clamp-1">{card.status}</h4>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-3 text-muted">
                      <Clock size={14} className="text-accent" />
                      <span className="text-[11px] font-bold">{card.details.hora}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted">
                      <MapPin size={14} className="text-accent" />
                      <span className="text-[11px] font-bold truncate">{card.details.ubicacion}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between group-hover:translate-x-1 transition-transform">
                  <span className="text-[9px] font-black uppercase tracking-widest text-accent">Gestionar Detalles</span>
                  <ArrowRight size={16} className="text-accent" />
                </div>
              </div>
            </motion.div>
          ))}
          {outcomeCards.length === 0 && (
            <div className="col-span-full py-20 text-center border border-dashed border-border rounded-[3rem]">
              <p className="text-xs font-black uppercase tracking-widest text-muted italic">No hay gestiones pendientes para hoy.</p>
            </div>
          )}
        </div>
      </section>

      {/* MAIN CONTENT - HOTEL (If enabled) */}
      {isModuleEnabled('hotels') && activePlan?.hotel_stays?.[0] && (
        <section className="relative group overflow-hidden rounded-[3rem] border border-border bg-surface shadow-2xl transition-all hover:shadow-accent/5">
          <div className="p-8 md:p-12 space-y-10 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => <span key={i} className="text-lg">★</span>)}
              </div>
              <h2 className="text-3xl md:text-5xl font-black font-heading text-foreground tracking-tight italic uppercase">
                {activePlan.hotel_stays[0].hotel_name}
              </h2>
              <p className="flex items-center gap-2 text-muted font-bold text-sm">
                <MapPin size={14} className="text-accent" />
                {activePlan.hotel_stays[0].address}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-y border-border py-10">
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-1">Check-in</p>
                  <p className="text-xl font-black text-foreground">
                    {new Date(activePlan.hotel_stays[0].check_in).toLocaleDateString('es-ES', {day:'numeric', month:'long'})}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-1">Check-out</p>
                  <p className="text-xl font-black text-foreground">
                    {new Date(activePlan.hotel_stays[0].check_out).toLocaleDateString('es-ES', {day:'numeric', month:'long'})}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-1">Localizador</p>
                <p className="text-xl font-mono font-black text-accent">{activePlan.hotel_stays[0].booking_reference}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TIMELINE (Depends on multiple modules) */}
      {isModuleEnabled('agenda') && (
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted ml-2">Tu Itinerario</h3>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="p-6 md:p-12 rounded-[3rem] bg-surface border border-border shadow-sm">
             <OutcomeTimeline plan={activePlan} />
          </div>
        </section>
      )}

      {/* SUPPORT & COORDINATOR */}
      {activePlan?.logistic_contact && (
        <section className="p-8 md:p-12 rounded-[3.5rem] bg-surface border border-border shadow-2xl relative overflow-hidden group">
           {/* Subtle background pattern/glow */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:bg-accent/10 transition-colors duration-700" />
           
           <div className="flex flex-col md:flex-row justify-between items-center gap-10 relative z-10">
              <div className="flex items-center gap-8">
                 <div className="relative">
                    <div className="w-24 h-24 rounded-[2rem] bg-accent/10 border border-accent/20 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-500">
                       {activePlan?.logistic_contact.avatar_url ? (
                         <img src={activePlan.logistic_contact.avatar_url} alt={activePlan.logistic_contact.name} className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-accent/40">
                            <User size={40} />
                         </div>
                       )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 border-4 border-surface flex items-center justify-center text-white shadow-lg">
                       <CheckCircle2 size={12} strokeWidth={3} />
                    </div>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-accent uppercase tracking-[0.4em] mb-2">Concierge Personal</p>
                    <h4 className="text-3xl font-black tracking-tight">{activePlan?.logistic_contact.name}</h4>
                    <p className="text-xs font-medium text-muted mt-1">{activePlan.logistic_contact.role || 'Coordinador de Logística'}</p>
                 </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
                 <a 
                   href={`tel:${activePlan.logistic_contact.phone}`} 
                   className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl bg-surface border border-border hover:border-accent/40 hover:bg-accent/5 transition-all group/btn"
                 >
                    <div className="p-3 rounded-2xl bg-surface-subtle text-muted group-hover/btn:bg-accent group-hover/btn:text-white transition-all">
                       <Phone size={20} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted">Llamar</span>
                 </a>
                 <a 
                   href={`https://wa.me/${activePlan.logistic_contact.whatsapp?.replace(/\+/g, '')}`} 
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl bg-surface border border-border hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group/btn"
                 >
                    <div className="p-3 rounded-2xl bg-surface-subtle text-muted group-hover/btn:bg-emerald-500 group-hover/btn:text-white transition-all">
                       <Smartphone size={20} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted">WhatsApp</span>
                 </a>
                 <a 
                   href={`mailto:${activePlan.logistic_contact.email}`} 
                   className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl bg-surface border border-border hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group/btn"
                 >
                    <div className="p-3 rounded-2xl bg-surface-subtle text-muted group-hover/btn:bg-blue-500 group-hover/btn:text-white transition-all">
                       <Mail size={20} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted">Email</span>
                 </a>
              </div>
           </div>
        </section>
      )}

      <OutcomeDrawer 
        isOpen={!!selectedCard}
        card={selectedCard} 
        onClose={() => setSelectedCard(null)} 
        onOpenQR={(data) => setSelectedQR(data)}
      />

      {/* QR MODAL */}
      <AnimatePresence>
        {selectedQR && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedQR(null)} className="absolute inset-0 bg-white/95 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm bg-white rounded-[3.5rem] shadow-2xl p-8 flex flex-col items-center">
              <div className="w-full text-center space-y-2 mb-8 border-b pb-6">
                <span className="text-2xl font-black">{selectedQR.flight?.departure_location || '---'} ➔ {selectedQR.flight?.arrival_location || '---'}</span>
              </div>
              <QRCodeSVG value={selectedQR.qr_code || ''} size={260} level="H" includeMargin={true} />
              <button onClick={() => setSelectedQR(null)} className="absolute top-4 right-4 p-2 rounded-full bg-black/5 text-black"><X size={20} /></button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
