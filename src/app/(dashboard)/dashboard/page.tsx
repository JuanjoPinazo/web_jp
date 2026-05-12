'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useTravelPlans, FullTravelPlan } from '@/hooks/useTravelPlans';
import { usePlanModules } from '@/hooks/usePlanModules';
import { useTheme } from '@/context/ThemeContext';
import {
  Building2,
  MapPin,
  CheckCircle2,
  Plane,
  Car,
  Utensils,
  Loader2,
  FileText,
  Calendar,
  User,
  QrCode,
  X,
  Clock,
  Smartphone,
  Phone,
  ArrowRight,
  Download,
  Navigation,
  MessageSquare,
  AlertCircle,
  CalendarRange,
  Ticket,
  ChevronDown,
  Check,
  XCircle,
  Sun,
  Moon,
  ExternalLink
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { OutcomeDrawer } from '@/components/OutcomeDrawer';
import { MapModal, type MapLocation } from '@/components/MapModal';
import { supabase } from '@/lib/supabase';

const WakeLockHandler = () => {
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);
  return null;
};

export default function DashboardPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { getMyActivePlan, loading: planLoading } = useTravelPlans();
  const { getEnabledModules } = usePlanModules();

  useEffect(() => {
    if (session.status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [session.status, router]);

  const userName = session.user?.name || 'Usuario';
  
  const [availableContexts, setAvailableContexts] = useState<any[]>([]);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<FullTravelPlan | null>(null);
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({});
  const [selectedQR, setSelectedQR] = useState<any>(null);
  const [selectedPDF, setSelectedPDF] = useState<any>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(true);
  // Attendance confirmation state
  const [confirmingEventId, setConfirmingEventId] = useState<string | null>(null);
  const [confirmDietary, setConfirmDietary] = useState('');
  const [isManagerView, setIsManagerView] = useState(false);
  const [allContextEvents, setAllContextEvents] = useState<any[]>([]);

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

  // --- UNIFIED TIMELINE LOGIC ---
  const timelineEvents = useMemo(() => {
    if (!activePlan) return [];
    const events: any[] = [];

    // 1. FLIGHTS
    activePlan.flights.filter(f => f.is_verified).forEach(f => {
      const depTime = new Date(f.departure_time);
      events.push({
        id: `flight-dep-${f.id}`,
        type: 'flight_departure',
        datetime: depTime,
        title: `Vuelo ${f.departure_location} → ${f.arrival_location}`,
        location: f.departure_location || 'Aeropuerto',
        description: `${f.airline} ${f.flight_number} | Puerta: ${f.gate || 'S/N'}`,
        icon: Plane,
        color: 'text-purple-500',
        cta: { label: 'Tarjeta de Embarque', type: 'boarding_pass' },
        payload: f
      });

      if (f.arrival_time) {
        events.push({
          id: `flight-arr-${f.id}`,
          type: 'flight_arrival',
          datetime: new Date(f.arrival_time),
          title: `Llegada a ${f.arrival_location}`,
          location: f.arrival_location || 'Aeropuerto',
          description: 'Aterrizaje y recogida de equipaje.',
          icon: MapPin,
          color: 'text-blue-500',
          payload: f
        });
      }
    });

    // 2. HOTELS
    activePlan.hotel_stays?.forEach(h => {
      // Check-in (usually 15:00)
      const checkInDate = new Date(h.check_in);
      checkInDate.setUTCHours(15, 0, 0);
      events.push({
        id: `hotel-in-${h.id}`,
        type: 'hotel_checkin',
        datetime: checkInDate,
        title: `Check-in ${h.hotel_name}`,
        location: h.address || h.hotel_name,
        description: `Habitación: ${h.room_type || 'Estándar'}. Ref: ${h.booking_reference}`,
        icon: Building2,
        color: 'text-emerald-500',
        cta: { label: 'Ver Reserva', type: 'document' },
        payload: h
      });

      // Check-out (usually 12:00)
      const checkOutDate = new Date(h.check_out);
      checkOutDate.setUTCHours(12, 0, 0);
      events.push({
        id: `hotel-out-${h.id}`,
        type: 'hotel_checkout',
        datetime: checkOutDate,
        title: `Check-out ${h.hotel_name}`,
        location: h.hotel_name,
        description: 'Recuerda entregar las llaves en recepción.',
        icon: Building2,
        color: 'text-slate-500',
        payload: h
      });
    });

    // 3. TRANSFERS
    activePlan.transfers.filter(t => t.visible_to_client).forEach(t => {
      events.push({
        id: `transfer-${t.id}`,
        type: 'transfer',
        datetime: new Date(t.pickup_datetime),
        title: t.type?.replace(/_/g, ' ').toUpperCase().replace('AIRPORT', 'AERO') || 'Traslado Privado',
        location: t.pickup_location,
        description: `Hacia: ${t.dropoff_location}. ${t.driver_name ? `Chófer: ${t.driver_name}` : 'Transporte Confirmado'}`,
        icon: Car,
        color: 'text-amber-500',
        payload: t
      });
    });

    // 4. DINNERS / RESTAURANTS (Legacy)
    activePlan.restaurants.filter(r => r.type === 'reserved' || !r.type).forEach(r => {
      events.push({
        id: `dinner-${r.id}`,
        type: 'dinner',
        datetime: new Date(r.reservation_time),
        title: `Cena en ${r.restaurant_name}`,
        location: r.restaurant_name,
        description: `Reserva para ${r.reservation_name || userName}. Mesa confirmada.`,
        icon: Utensils,
        color: 'text-orange-500',
        payload: r
      });
    });

    // 5. HOSPITALITY EVENTS (New Module)
    activePlan.hospitality_events?.filter(e => e.visible_to_client).forEach(e => {
      events.push({
        id: `hospitality-${e.id}`,
        type: 'hospitality',
        datetime: new Date(e.start_datetime),
        title: e.title,
        location: e.venue_name || 'Lugar por confirmar',
        description: `${e.description || ''}${e.dress_code ? ` · Dress Code: ${e.dress_code}` : ''}`,
        icon: Utensils,
        color: 'text-accent',
        payload: e,
        timeString: new Date(e.start_datetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
      });
    });

    return events.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
  }, [activePlan, userName]);

  // --- COMPUTE NEXT ACTION ---
  const nextAction = useMemo(() => {
    const now = new Date();
    return timelineEvents.find(e => e.datetime > now);
  }, [timelineEvents]);

  // --- COMPUTE ACTIVE DAY VIEW ---
  const activeDayEvents = useMemo(() => {
    if (timelineEvents.length === 0) return [];
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Si hay eventos hoy, mostrar hoy. Si no, mostrar el primer día con eventos.
    const hasEventsToday = timelineEvents.some(e => e.datetime.toISOString().split('T')[0] === todayStr);
    const displayDateStr = hasEventsToday ? todayStr : timelineEvents[0].datetime.toISOString().split('T')[0];
    
    return timelineEvents.filter(e => e.datetime.toISOString().split('T')[0] === displayDateStr);
  }, [timelineEvents]);

  // --- AIRPORT MODE LOGIC ---
  const airportMode = useMemo(() => {
    if (!activePlan) return null;
    
    const now = new Date();
    const nextFlight = activePlan.flights
      .filter(f => f.is_verified)
      .find(f => {
        const depTime = new Date(f.departure_time);
        // Trigger Airport Mode 24 hours before flight
        return depTime > now && (depTime.getTime() - now.getTime()) < 24 * 60 * 60 * 1000;
      });

    if (!nextFlight) return null;

    const depTime = new Date(nextFlight.departure_time);
    const diffMs = depTime.getTime() - now.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    let state: 'preparation' | 'go_to_airport' | 'boarding_soon' | 'final_call' = 'preparation';
    let statusText = 'Preparación de viaje';
    let statusColor = 'bg-accent/10 text-accent border-accent/20';

    if (diffMin < 20) {
      state = 'final_call';
      statusText = 'Última llamada';
      statusColor = 'bg-red-500/10 text-red-500 border-red-500/20';
    } else if (diffMin < 45) {
      state = 'boarding_soon';
      statusText = 'Embarque próximo';
      statusColor = 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    } else if (diffMin < 120) {
      state = 'go_to_airport';
      statusText = 'Ir al aeropuerto';
      statusColor = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }

    const boardingPass = activePlan.documents.find(d => 
      d.related_flight_id === nextFlight.id && 
      (d.document_type === 'boarding_pass' || d.title.toLowerCase().includes('tarjeta'))
    );

    return {
      flight: nextFlight,
      state,
      statusText,
      statusColor,
      diffMin,
      boardingPass
    };
  }, [activePlan]);

  // --- MAP LOCATIONS ---
  const mapLocations = useMemo((): MapLocation[] => {
    if (!activePlan) return [];
    const locs: MapLocation[] = [];

    // Hotel stays
    activePlan.hotel_stays?.forEach(h => {
      if (!h.deleted_at) {
        locs.push({
          id: `hotel-${h.id}`,
          type: 'hotel',
          name: h.hotel_name,
          address: h.address,
          extra: `Check-in: ${new Date(h.check_in).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })} · Check-out: ${new Date(h.check_out).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`,
        });
      }
    });

    // Hospitality venues
    activePlan.hospitality_events
      ?.filter(e => e.visible_to_client && !e.deleted_at && e.venue_address)
      .forEach(e => {
        locs.push({
          id: `hosp-${e.id}`,
          type: 'hospitality',
          name: e.venue_name || e.title,
          address: e.venue_address,
          lat: e.venue_lat,
          lng: e.venue_lng,
          extra: new Date(e.start_datetime).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
        });
      });

    // Restaurants (reserved)
    activePlan.restaurants
      ?.filter(r => !r.deleted_at && r.address)
      .forEach(r => {
        locs.push({
          id: `rest-${r.id}`,
          type: 'restaurant',
          name: r.restaurant_name,
          address: r.address,
          extra: r.type === 'reserved' ? `Reserva: ${new Date(r.reservation_time).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', timeZone: 'UTC' })}` : 'Recomendado',
        });
      });

    // Transfers (pickup & dropoff as distinct locations)
    activePlan.transfers?.filter(t => !t.deleted_at).forEach(t => {
      locs.push({
        id: `transfer-${t.id}`,
        type: 'transfer',
        name: `Recogida: ${t.pickup_location}`,
        address: t.pickup_location,
        extra: `${new Date(t.pickup_datetime).toLocaleString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} → ${t.dropoff_location}`,
      });
    });

    return locs;
  }, [activePlan]);

  // --- ATTENDANCE HANDLER ---
  const handleAttendanceConfirm = async (attendeeId: string, status: 'confirmed' | 'declined') => {
    try {
      await supabase
        .from('hospitality_event_attendees')
        .update({
          attendance_status: status,
          ...(status === 'confirmed' && confirmDietary ? { dietary_restrictions: confirmDietary } : {}),
        })
        .eq('id', attendeeId);

      if (selectedContextId) {
        const updated = await getMyActivePlan(selectedContextId);
        setActivePlan(updated);
      }
      setConfirmingEventId(null);
      setConfirmDietary('');
    } catch (err) {
      console.error('Error confirming attendance:', err);
    }
  };

  // --- VARIANTS ---
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
  };

  if (loading || planLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-xl mx-auto px-6 py-10 space-y-12 pb-32"
    >
      {airportMode ? (
        /* --- VIEW: AIRPORT MODE --- */
        <motion.div variants={itemVariants} className="space-y-10 pt-4">
          {/* Header & Status */}
          <div className="space-y-6">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${airportMode.statusColor} animate-pulse`}>
              <div className="w-2 h-2 rounded-full bg-current" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Modo Aeropuerto · {airportMode.statusText}</span>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-5xl font-black tracking-tighter text-foreground leading-none">
                {airportMode.flight.departure_location} <span className="text-accent">➔</span> {airportMode.flight.arrival_location}
              </h1>
              <p className="text-sm font-bold text-muted uppercase tracking-[0.3em]">
                {airportMode.flight.airline} · {airportMode.flight.flight_number}
              </p>
            </div>
          </div>

          {/* Main Card */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/30 to-purple-500/30 blur-2xl opacity-50" />
            <div className="relative p-10 rounded-[3rem] bg-surface border border-accent/20 shadow-2xl space-y-8 overflow-hidden">
               <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest">Salida</p>
                    <p className="text-6xl font-black text-foreground tracking-tighter">
                      {new Date(airportMode.flight.departure_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest">Asiento</p>
                    <p className="text-4xl font-black text-accent">{airportMode.boardingPass?.seat_assignment || airportMode.flight.seat || '—'}</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-6 pt-6 border-t border-border/50">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-muted uppercase tracking-widest">Puerta</p>
                    <p className="text-xl font-black text-foreground">{airportMode.flight.gate || '—'}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[9px] font-black text-muted uppercase tracking-widest">Check-in</p>
                    <p className="text-2xl font-black text-foreground">
                      {new Date(new Date(airportMode.flight.departure_time).getTime() - 2 * 60 * 60 * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                    </p>
                  </div>
               </div>

               {/* Main CTA */}
               <div className="pt-4">
                  {airportMode.boardingPass && airportMode.boardingPass.qr_code ? (
                    <button 
                      onClick={() => setSelectedQR(airportMode.boardingPass)}
                      className="w-full py-6 rounded-[2rem] bg-accent text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-2xl shadow-accent/40 active:scale-[0.98] transition-all"
                    >
                      <QrCode size={20} /> Mostrar QR de Embarque
                    </button>
                  ) : (
                    <div className="space-y-4">
                      {airportMode.boardingPass ? (
                        <button 
                          onClick={() => setSelectedPDF(airportMode.boardingPass)}
                          className="w-full py-6 rounded-[2rem] bg-foreground text-background font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98] transition-all"
                        >
                          <FileText size={20} /> Ver Tarjeta Digital
                        </button>
                      ) : (
                        <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex gap-4">
                          <AlertCircle className="text-amber-500 shrink-0" size={20} />
                          <div className="space-y-1">
                            <p className="text-xs font-black text-amber-600 uppercase tracking-widest">Tarjeta Pendiente</p>
                            <p className="text-[10px] font-medium text-amber-700/80 leading-relaxed">Tu coordinador todavía no ha subido la tarjeta de embarque. Puedes consultar la reserva del vuelo.</p>
                          </div>
                        </div>
                      )}
                      <button 
                        onClick={() => {
                          const doc = activePlan?.documents.find(d => d.related_flight_id === airportMode.flight.id && d.document_type !== 'boarding_pass');
                          if (doc) window.open(doc.file_url);
                        }}
                        className="w-full py-5 rounded-2xl bg-surface-subtle border border-border text-foreground font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3"
                      >
                        <FileText size={16} className="text-accent" /> Ver Reserva de Vuelo
                      </button>
                    </div>
                  )}
               </div>
            </div>
          </div>

          {/* Support Actions */}
          <div className="grid grid-cols-1 gap-4">
             <button 
              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=aeropuerto+${encodeURIComponent(airportMode.flight.departure_location)}`)}
              className="flex items-center justify-between p-6 rounded-[2rem] bg-surface border border-border group"
             >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Navigation size={22} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-foreground">Cómo llegar al aeropuerto</p>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Abrir en Google Maps</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-muted group-hover:translate-x-1 transition-transform" />
             </button>

             {activePlan?.logistic_contact && (
               <div className="grid grid-cols-2 gap-4">
                 <a 
                  href={`tel:${activePlan.logistic_contact.phone}`}
                  className="flex flex-col items-center gap-3 p-6 rounded-[2rem] bg-surface border border-border hover:border-accent/40 transition-all"
                 >
                    <Phone size={20} className="text-accent" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted">Llamar Coordinador</span>
                 </a>
                 <a 
                  href={`https://wa.me/${activePlan.logistic_contact.whatsapp?.replace(/\+/g, '')}`}
                  target="_blank"
                  className="flex flex-col items-center gap-3 p-6 rounded-[2rem] bg-surface border border-border hover:border-emerald-500/40 transition-all"
                 >
                    <MessageSquare size={20} className="text-emerald-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted">WhatsApp</span>
                 </a>
               </div>
             )}
          </div>
        </motion.div>
      ) : (
        /* --- VIEW: NORMAL DASHBOARD --- */
        <>
          {/* BLOQUE 1: HEADER INTELIGENTE */}
          <motion.section variants={itemVariants} className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">
              {(activeDayEvents[0]?.datetime || new Date()).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
            </p>
            <h1 className="text-3xl font-black tracking-tight text-foreground">
              {selectedContext?.name || 'Tu Evento'}
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-accent hover:border-accent/40 transition-all active:scale-90"
              aria-label="Cambiar tema"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 overflow-hidden">
               {session.user?.avatar_url ? (
                 <img src={session.user.avatar_url} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-accent/40 bg-surface">
                    <User size={24} />
                  </div>
                )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
             <CheckCircle2 size={10} />
             <span className="text-[9px] font-black uppercase tracking-widest">Día Activo</span>
           </div>
           {session.user?.role === 'admin' && (
             <button 
               onClick={() => setIsManagerView(!isManagerView)}
               className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${isManagerView ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-surface border-border text-muted'}`}
             >
               <Building2 size={10} />
               <span className="text-[9px] font-black uppercase tracking-widest">{isManagerView ? 'Vista Ejecutiva ON' : 'Vista Ejecutiva'}</span>
             </button>
           )}
           <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
             <Clock size={10} />
             <span className="text-[9px] font-black uppercase tracking-widest">Todo Planificado</span>
           </div>
        </div>
      </motion.section>

      {/* BLOQUE 1.5: ACCESO RÁPIDO A TARJETAS */}
      {(activePlan?.documents?.filter(d => (d.document_type === 'boarding_pass' || d.title?.toLowerCase().includes('tarjeta')) && !d.deleted_at).length ?? 0) > 0 && (
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-4 px-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted">Tarjetas de Embarque</h3>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 px-2 -mx-2 no-scrollbar">
              {activePlan?.documents
                ?.filter(d => (d.document_type === 'boarding_pass' || d.title?.toLowerCase().includes('tarjeta')) && !d.deleted_at)
                .map(doc => {
                  const flight = activePlan?.flights?.find(f => f.id === doc.related_flight_id);
                  return (
                    <button 
                      key={doc.id}
                      onClick={() => {
                        if (doc.qr_code || doc.qr_raw_payload) setSelectedQR({ ...doc, flight });
                        else setSelectedPDF(doc);
                      }}
                      className="shrink-0 w-[140px] p-5 rounded-[2rem] bg-surface border border-accent/20 flex flex-col gap-4 shadow-lg hover:shadow-xl transition-all active:scale-95 text-left group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform">
                        <QrCode size={40} />
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all shadow-sm">
                        <QrCode size={20} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-foreground uppercase tracking-tight truncate">{flight?.arrival_location || 'Vuelo'}</p>
                        <div className="flex items-center justify-between">
                           <p className="text-[9px] font-black text-muted uppercase tracking-widest">{flight?.flight_number || 'BOARDING'}</p>
                           <p className="text-[9px] font-black text-accent uppercase">{doc.seat_assignment || flight?.seat || '—'}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </motion.section>
      )}

      {/* BLOQUE 2: PRÓXIMA ACCIÓN (CRÍTICO) */}
      {nextAction && (
        <motion.section variants={itemVariants} className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-purple-500/20 blur-xl opacity-50" />
          <div className="relative p-8 rounded-[2.5rem] bg-surface border border-accent/30 shadow-2xl space-y-6 overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <nextAction.icon size={120} strokeWidth={1} />
             </div>

             <div className="space-y-2 relative z-10">
                <div className="inline-flex items-center gap-2 text-accent">
                   <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                   <span className="text-[10px] font-black uppercase tracking-[0.3em]">Próxima Acción</span>
                </div>
                <h2 className="text-2xl font-black text-foreground leading-tight">
                  {nextAction.title}
                </h2>
             </div>

             <div className="flex items-center gap-8 py-4 border-y border-border/50 relative z-10">
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-muted uppercase tracking-widest">Hora</p>
                   <p className="text-4xl font-black text-foreground tracking-tighter">
                      {nextAction.datetime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                   </p>
                </div>
                <div className="h-10 w-px bg-border" />
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-muted uppercase tracking-widest">Ubicación</p>
                   <p className="text-base font-black text-foreground truncate max-w-[150px]">
                      {nextAction.location}
                   </p>
                </div>
             </div>

             <div className="flex flex-col gap-3 relative z-10">
                {nextAction.cta ? (
                  <button 
                    onClick={() => {
                      if (nextAction.cta.type === 'boarding_pass') {
                        const doc = activePlan?.documents?.find(d => 
                          d.related_flight_id === nextAction.payload.id && 
                          (d.document_type === 'boarding_pass' || d.title?.toLowerCase().includes('tarjeta'))
                        );
                        if (doc) {
                          if (doc.qr_code || doc.qr_raw_payload) setSelectedQR(doc);
                          else setSelectedPDF(doc);
                        } else {
                          const resDoc = activePlan?.documents.find(d => d.related_flight_id === nextAction.payload.id);
                          if (resDoc) setSelectedPDF(resDoc);
                        }
                      }
                    }}
                    className="w-full py-4 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-xl shadow-accent/20 hover:scale-[1.02] transition-transform"
                  >
                    <nextAction.icon size={14} />
                    {nextAction.cta.label}
                  </button>
                ) : (
                  <button 
                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextAction.location)}`)}
                    className="w-full py-4 rounded-2xl bg-surface-subtle border border-border text-foreground font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-border transition-colors"
                  >
                    <MapPin size={14} />
                    Cómo llegar
                  </button>
                )}
             </div>
          </div>
        </motion.section>
      )}

      {/* BLOQUE 3: ITINERARIO */}
      <motion.section variants={itemVariants} className="space-y-10">
        <div className="flex items-center gap-5 px-2">
          <div className="bg-accent/10 p-3 rounded-2xl border border-accent/20">
            <Clock className="text-accent" size={24} />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">Tu Itinerario</h3>
            <h2 className="text-3xl font-black text-foreground tracking-tighter">TU DÍA</h2>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
        </div>
        
        <div className="relative pl-6 space-y-10">
          <div className="absolute left-0 top-2 bottom-2 w-px bg-gradient-to-b from-accent via-border to-transparent" />
          
          {activeDayEvents.map((event, idx) => {
            const isPast = event.datetime < new Date();
            return (
              <div key={event.id} className={`relative group ${isPast ? 'opacity-40' : ''}`}>
                <div className={`absolute -left-[28.5px] top-1.5 w-1.5 h-1.5 rounded-full border-2 bg-background transition-all duration-500 ${isPast ? 'border-muted scale-75' : 'border-accent scale-100 group-hover:scale-150'}`} />
                <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                       <span className="text-3xl font-black text-accent tracking-tighter tabular-nums leading-none">
                         {event.timeString || event.datetime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                       </span>
                       <h4 className="text-xl font-black text-foreground leading-tight tracking-tight mt-2">
                         {event.title}
                       </h4>
                    </div>
                   
                    {event.type === 'transfer' ? (
                      <div className="bg-surface border border-border/80 rounded-[32px] p-8 space-y-6 shadow-xl shadow-black/10 group-hover:border-accent/40 transition-all">
                       <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                            <div className="w-px h-5 bg-border" />
                            <div className="w-1.5 h-1.5 rounded-full border border-accent bg-background" />
                          </div>
                          <div className="flex-1 space-y-3 min-w-0">
                            <div>
                              <p className="text-[7px] font-black text-muted uppercase tracking-widest">Recogida</p>
                              <p className="text-[11px] font-bold text-foreground truncate">{event.payload.pickup_location}</p>
                            </div>
                            <div>
                              <p className="text-[7px] font-black text-muted uppercase tracking-widest">Hacia</p>
                              <p className="text-[11px] font-bold text-foreground truncate">{event.payload.dropoff_location}</p>
                            </div>
                          </div>
                       </div>

                       {(event.payload.driver_name || event.payload.vehicle_type) && (
                         <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-4">
                           <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-8 h-8 rounded-full bg-accent/5 flex items-center justify-center text-accent shrink-0">
                                <Car size={14} />
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-[10px] font-black text-foreground truncate">{event.payload.driver_name || 'Servicio Confirmado'}</p>
                                <p className="text-[8px] font-bold text-muted uppercase">{event.payload.vehicle_type || 'Transporte Privado'}</p>
                              </div>
                           </div>
                           <div className="flex gap-1.5">
                             {event.payload.driver_phone && (
                               <>
                                 <a href={`tel:${event.payload.driver_phone}`} className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center active:scale-90 transition-transform">
                                   <Phone size={14} />
                                 </a>
                                 <a href={`https://wa.me/${event.payload.driver_phone.replace(/\s+/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center active:scale-90 transition-transform">
                                   <MessageSquare size={14} />
                                 </a>
                               </>
                             )}
                           </div>
                         </div>
                       )}

                       <button 
                         onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.payload.pickup_location)}`)}
                         className="w-full py-3 rounded-xl bg-accent text-white font-black uppercase tracking-widest text-[8px] flex items-center justify-center gap-2"
                       >
                         <Navigation size={12} /> Cómo llegar a la recogida
                       </button>
                     </div>
                   ) : (
                     <div className="space-y-4">
                       <p className="text-xs font-medium text-muted/80 leading-relaxed">
                         {event.description}
                       </p>
                       <div className="flex flex-wrap gap-2">
                        {event.cta && (
                          <button 
                            onClick={() => {
                              if (event.cta.type === 'boarding_pass') {
                                const doc = activePlan?.documents?.find(d => 
                                  d.related_flight_id === event.payload.id && 
                                  (d.document_type === 'boarding_pass' || d.title?.toLowerCase().includes('tarjeta'))
                                );
                                if (doc) {
                                  if (doc.qr_code || doc.qr_raw_payload) setSelectedQR(doc);
                                  else setSelectedPDF(doc);
                                } else {
                                  const resDoc = activePlan?.documents.find(d => d.related_flight_id === event.payload.id);
                                  if (resDoc) setSelectedPDF(resDoc);
                                }
                              }
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-accent/20"
                          >
                            <QrCode size={14} />
                            {event.cta.label}
                          </button>
                        )}
                        {event.payload?.website_url && (
                          <a 
                            href={event.payload.website_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border text-foreground text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm"
                          >
                            <ExternalLink size={14} />
                            Visitar Web
                          </a>
                        )}
                       </div>
                     </div>
                   )}
                </div>
              </div>
            );
          })}
          {activeDayEvents.length === 0 && (
            <p className="text-xs italic text-muted">Sin eventos programados para hoy.</p>
          )}
        </div>
      </motion.section>

        {/* BLOQUE 4: AGENDA VIP / VISTA EJECUTIVA */}
       {(isManagerView || (isModuleEnabled('hospitality') && (activePlan?.hospitality_events?.filter(e => e.visible_to_client).length ?? 0) > 0)) && (
         <motion.section variants={itemVariants} className="space-y-6">
           <div className="flex items-center gap-4 px-2">
             <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">
               {isManagerView ? 'Control Operativo Global' : 'Agenda VIP'}
             </h3>
             <div className="flex-1 h-px bg-accent/20" />
           </div>
           
           <div className="grid grid-cols-1 gap-8">
             {(isManagerView ? allContextEvents : (activePlan?.hospitality_events?.filter(e => e.visible_to_client && !e.deleted_at) || [])).map(e => (
               <div key={e.id} className="relative group overflow-hidden rounded-[3rem] bg-surface border border-border/50 shadow-2xl transition-all hover:border-accent/40">
                 {e.image_url ? (
                   <div className="h-64 w-full relative overflow-hidden">
                     <img src={e.image_url} alt={e.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                     <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
                     <div className="absolute top-6 left-6">
                        <span className="px-4 py-1.5 rounded-full bg-accent/90 text-white text-[9px] font-black uppercase tracking-[0.2em] shadow-xl backdrop-blur-md">
                          {e.type} VIP
                        </span>
                     </div>
                   </div>
                 ) : (
                   <div className="h-24 w-full bg-accent/5 border-b border-border/30 flex items-center px-8">
                      <Utensils className="text-accent/20" size={40} />
                   </div>
                 )}

                 <div className="p-8 md:p-10 space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                       <div className="space-y-2">
                          <h4 className="text-3xl font-black text-foreground tracking-tighter leading-none">{e.title}</h4>
                          <div className="flex items-center gap-2 text-muted">
                             <MapPin size={14} className="text-accent" />
                             <p className="text-xs font-bold uppercase tracking-widest">{e.venue_name}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-6 bg-background/50 px-6 py-4 rounded-[2rem] border border-border/50">
                          <div className="text-center">
                             <p className="text-[8px] font-black text-muted uppercase tracking-widest mb-1">Hora</p>
                             <p className="text-2xl font-black text-accent tracking-tighter tabular-nums">
                               {new Date(e.start_datetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                             </p>
                          </div>
                          <div className="w-px h-8 bg-border/50" />
                          <div className="text-center">
                             <p className="text-[8px] font-black text-muted uppercase tracking-widest mb-1">Fecha</p>
                             <p className="text-lg font-black text-foreground tracking-tighter uppercase">
                               {new Date(e.start_datetime).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                             </p>
                          </div>
                       </div>
                    </div>

                    {isManagerView && e.hospitality_event_attendees && (
                      <div className="space-y-4 p-6 rounded-[2rem] bg-purple-500/5 border border-purple-500/10">
                         <div className="flex justify-between items-center">
                            <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em]">Invitados Confirmados ({e.hospitality_event_attendees.length})</p>
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {e.hospitality_event_attendees.map((att: any) => (
                              <div key={att.id} className="group/att relative px-4 py-2 rounded-xl bg-surface border border-border hover:border-purple-500/40 transition-all cursor-default shadow-sm">
                                <span className="text-[11px] font-black text-foreground">
                                  {att.profiles?.nombre} {att.profiles?.apellidos}
                                </span>
                              </div>
                            ))}
                            {e.hospitality_event_attendees.length === 0 && (
                              <p className="text-xs italic text-muted/60">No hay invitados confirmados para este evento.</p>
                            )}
                         </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-border/30">
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-muted uppercase tracking-widest">Dress Code</p>
                          <p className="text-sm font-bold text-foreground">{e.dress_code || 'Por confirmar'}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-muted uppercase tracking-widest">Localización</p>
                          <button 
                            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.venue_name + ' ' + (e.venue_address || ''))}`)}
                            className="text-sm font-bold text-accent hover:underline flex items-center gap-2"
                          >
                            Ver en Maps <Navigation size={12} />
                          </button>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-muted uppercase tracking-widest">Estado Reserva</p>
                          <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${e.status === 'confirmed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500'}`} />
                             <p className="text-sm font-black uppercase tracking-widest">{e.status === 'confirmed' ? 'Confirmado' : 'Pendiente'}</p>
                          </div>
                       </div>
                    </div>
                 </div>
               </div>
             ))}
           </div>
          </motion.section>
        )}

      {/* BLOQUE 5: EXPERIENCIA CURADA */}

      {isModuleEnabled('restaurants') && (activePlan?.restaurants?.filter(r => r.type !== 'reserved').length ?? 0) > 0 && (
        <motion.section variants={itemVariants} className="space-y-6">
          <div className="flex items-center gap-4 px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted">Recomendado para ti</h3>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid grid-cols-1 gap-4">
            {activePlan?.restaurants.filter(r => r.type !== 'reserved').map(r => (
              <div key={r.id} className="overflow-hidden rounded-[2.5rem] bg-surface border border-border group hover:border-accent/40 transition-all flex flex-col">
                <div className="h-48 w-full relative overflow-hidden">
                   <img 
                     src={r.image_url || (r.restaurant_name?.toLowerCase().includes('kong') 
                       ? "https://images.unsplash.com/photo-1550966842-2862ba996d44?q=80&w=1200&auto=format&fit=crop" 
                       : "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop")} 
                     alt={r.restaurant_name} 
                     className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
                </div>
                <div className="p-8 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-accent/5 border border-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all">
                      <Utensils size={24} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xl font-black text-foreground">{r.restaurant_name}</h4>
                      <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{r.notes || 'Selección Premium'}</p>
                    </div>
                  </div>
                  {r.website_url && (
                    <a 
                      href={r.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center hover:bg-accent hover:text-white transition-all active:scale-90"
                    >
                      <ExternalLink size={20} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowMap(true)}
            className="w-full py-5 rounded-2xl border border-dashed border-accent/30 text-accent font-black uppercase tracking-widest text-[9px] hover:bg-accent/5 transition-all flex items-center justify-center gap-2"
          >
            <MapPin size={13} /> Ver Mapa de Experiencias
          </button>
        </motion.section>
      )}

      <motion.section variants={itemVariants} className="space-y-10">
        <div className="flex items-center gap-5 px-2">
          <div className="bg-accent/10 p-3 rounded-2xl border border-accent/20">
            <FileText className="text-accent" size={24} />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">Dossier Digital</h3>
            <h2 className="text-3xl font-black text-foreground tracking-tighter">DOCUMENTOS</h2>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
        </div>
        <div className="space-y-4">
          {(activePlan?.documents || [])
            .filter(d => d.visible_to_client !== false && (d.document_type === 'boarding_pass' || d.title?.toLowerCase().includes('tarjeta')))
            .map(doc => {
              const flight = activePlan?.flights?.find(f => f.id === doc.related_flight_id);
              const hasQR = !!(doc.qr_code || doc.qr_raw_payload);
              
              return (
                <div key={doc.id} className="p-8 rounded-[2.5rem] bg-surface border border-accent/20 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-5">
                    <QrCode size={80} />
                  </div>
                  
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-[9px] font-black text-accent uppercase tracking-widest">
                        Tarjeta de Embarque
                      </div>
                      <h4 className="text-xl font-black text-foreground uppercase tracking-tight">{doc.passenger_name || userName}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Localizador</p>
                      <p className="text-sm font-mono font-black text-accent">{flight?.reservation_code || doc.booking_reference || 'Confirmado'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-muted uppercase tracking-widest">Hora</p>
                      <p className="text-xl font-black text-foreground">
                        {flight?.departure_time ? new Date(flight.departure_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '—'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-muted uppercase tracking-widest">Ruta</p>
                      <p className="text-sm font-black text-foreground uppercase truncate">
                        {flight?.arrival_location || '—'}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[9px] font-black text-muted uppercase tracking-widest">Asiento</p>
                      <p className="text-2xl font-black text-accent">{doc.seat_assignment || flight?.seat || '—'}</p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border/50 flex flex-col gap-3">
                    {hasQR ? (
                      <button 
                        onClick={() => setSelectedQR({ ...doc, flight })}
                        className="w-full py-5 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-lg shadow-accent/20 active:scale-95 transition-all"
                      >
                        <QrCode size={16} /> Mostrar QR de Embarque
                      </button>
                    ) : (
                      <button 
                        onClick={() => setSelectedPDF(doc)}
                        className="w-full py-5 rounded-2xl bg-foreground text-background font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 active:scale-95 transition-all"
                      >
                        <FileText size={16} /> Ver Tarjeta Completa
                      </button>
                    )}
                    
                    <button 
                      onClick={() => setSelectedPDF(doc)}
                      className="w-full py-4 rounded-2xl border border-border text-foreground font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2"
                    >
                      Ver PDF Original
                    </button>
                  </div>
                </div>
              );
            })}

          {/* 2. Otros Documentos en Grid */}
          <div className="grid grid-cols-2 gap-4">
            {(activePlan?.documents || [])
              .filter(d => d.visible_to_client !== false && d.document_type !== 'boarding_pass' && !d.title?.toLowerCase().includes('tarjeta'))
              .slice(0, 4)
              .map(doc => (
                <div 
                  key={doc.id} 
                  onClick={() => window.open(doc.file_url)}
                  className="p-5 rounded-[1.5rem] bg-surface-subtle border border-border flex flex-col gap-4 group cursor-pointer hover:border-accent/20"
                >
                  <div className="text-accent group-hover:scale-110 transition-transform">
                     <FileText size={20} />
                  </div>
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-muted uppercase tracking-widest truncate">{doc.title}</p>
                     <p className="text-[10px] font-black text-accent uppercase tracking-widest">Ver PDF</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </motion.section>

      {/* BLOQUE 6: SOPORTE */}
      {activePlan?.logistic_contact && (
        <motion.section variants={itemVariants} className="p-8 rounded-[2.5rem] bg-surface border border-border relative overflow-hidden group shadow-xl">
           <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full" />
           <div className="flex items-center gap-6 mb-8">
              <div className="relative">
                 <div className="w-16 h-16 rounded-2xl border border-accent/20 overflow-hidden bg-accent/5">
                    {activePlan.logistic_contact.avatar_url ? (
                      <img src={activePlan.logistic_contact.avatar_url} alt="Coordinador" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-accent/40"><User size={24} /></div>
                    )}
                 </div>
                 <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-surface flex items-center justify-center text-white text-[8px] font-bold">24h</div>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">Tu Coordinador</p>
                 <h4 className="text-xl font-black text-foreground tracking-tight">{activePlan.logistic_contact.name}</h4>
              </div>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <a href={`tel:${activePlan.logistic_contact.phone}`} className="flex items-center justify-center gap-3 py-4 rounded-xl bg-background border border-border text-[10px] font-black uppercase tracking-widest hover:border-accent/40 transition-all">
                <Phone size={14} className="text-accent" /> Llamar
              </a>
              <a href={`https://wa.me/${activePlan.logistic_contact.whatsapp?.replace(/\+/g, '')}`} target="_blank" className="flex items-center justify-center gap-3 py-4 rounded-xl bg-background border border-border text-[10px] font-black uppercase tracking-widest hover:border-emerald-500/40 transition-all">
                <Smartphone size={14} className="text-emerald-500" /> WhatsApp
              </a>
           </div>
        </motion.section>
      )}

      {/* BLOQUE 7: ATAJOS */}
      <motion.section variants={itemVariants} className="space-y-6">
        <div className="flex items-center gap-4 px-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted">Acciones Rápidas</h3>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
           <button
             onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=taxi+${encodeURIComponent(selectedContext?.location || 'transfer')}`)}
             className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-surface border border-border group hover:border-accent/40 transition-all"
           >
              <Car size={18} className="text-accent" />
              <span className="text-[8px] font-black uppercase tracking-widest text-muted">Transporte</span>
           </button>
           <button
             onClick={() => setShowMap(true)}
             className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-surface border border-border group hover:border-accent/40 transition-all relative"
           >
              <MapPin size={18} className="text-accent" />
              <span className="text-[8px] font-black uppercase tracking-widest text-muted">Mapa</span>
              {mapLocations.length > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center text-white text-[8px] font-black">
                  {mapLocations.length}
                </div>
              )}
           </button>
           <button
             onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=restaurantes+${encodeURIComponent(selectedContext?.location || '')}`)}
             className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-surface border border-border group hover:border-accent/40 transition-all"
           >
              <Utensils size={18} className="text-accent" />
              <span className="text-[8px] font-black uppercase tracking-widest text-muted">Gastronomía</span>
           </button>
           <button
             onClick={() => setShowTimeline(true)}
             className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-surface border border-border group hover:border-accent/40 transition-all"
           >
              <Calendar size={18} className="text-accent" />
              <span className="text-[8px] font-black uppercase tracking-widest text-muted">Agenda Full</span>
           </button>
        </div>
      </motion.section>
    </>
  )}

      {/* TIMELINE MODAL */}
      <OutcomeDrawer 
        isOpen={showTimeline} 
        card={{ actionType: 'timeline', title: 'Itinerario Completo' }} 
        onClose={() => setShowTimeline(false)} 
        onOpenQR={(doc) => {
          const flight = activePlan?.flights.find(f => f.id === doc.related_flight_id);
          setSelectedQR({ ...doc, flight });
        }}
      />

      {/* MAP MODAL */}
      <MapModal
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        locations={mapLocations}
        contextName={selectedContext?.name}
        contextLocation={selectedContext?.location}
      />

      {/* QR MODAL (Premium Full-Screen Experience) */}
      <AnimatePresence>
        {selectedQR && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-white"
          >
            <WakeLockHandler />
            
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="flex flex-col h-full p-8 pb-12 items-center justify-between overflow-hidden"
            >
              {/* Header Info */}
              <div className="w-full flex justify-between items-start">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Tarjeta de Embarque</span>
                  </div>
                  <h3 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">
                    {selectedQR.flight?.departure_location || '—'} ➔ {selectedQR.flight?.arrival_location || '—'}
                  </h3>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                    {selectedQR.flight?.airline} · {selectedQR.flight?.flight_number}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedQR(null)}
                  className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 active:scale-90 transition-transform"
                >
                  <X size={24} />
                </button>
              </div>

              {/* QR Main Card */}
              <div className="bg-white p-6 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col items-center gap-8 w-full max-w-sm">
                 <div className="bg-white p-2 border-2 border-slate-50 rounded-2xl">
                   <QRCodeSVG 
                      value={selectedQR.qr_raw_payload || selectedQR.qr_code || ''} 
                      size={260} 
                      level="H"
                      includeMargin={true}
                   />
                 </div>
                 <div className="w-full grid grid-cols-2 gap-8 px-4">
                    <div className="text-center space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asiento</p>
                      <p className="text-2xl font-black text-slate-900">{selectedQR.seat_assignment || selectedQR.flight?.seat || '—'}</p>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pasajero</p>
                      <p className="text-sm font-black text-slate-900 truncate max-w-[120px]">{selectedQR.passenger_name || userName}</p>
                    </div>
                 </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full max-w-sm space-y-4">
                 <p className="text-center text-[10px] font-medium text-slate-400 leading-relaxed italic px-6">
                   Muestra este código en la puerta de embarque. Aumenta el brillo si es necesario.
                 </p>
                 <div className="grid grid-cols-2 gap-3">
                   <button 
                    onClick={() => setSelectedPDF(selectedQR)}
                    className="w-full py-5 rounded-2xl bg-slate-100 text-slate-900 font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2"
                   >
                     <FileText size={14} /> Ver Completa
                   </button>
                   <button 
                    onClick={() => setSelectedQR(null)}
                    className="w-full py-5 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] shadow-xl active:scale-95 transition-all"
                   >
                     Cerrar
                   </button>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF VIEWER MODAL */}
      <AnimatePresence>
        {selectedPDF && (
          <div className="fixed inset-0 z-[400] flex flex-col bg-background">
             <div className="flex items-center justify-between p-6 border-b border-border bg-surface">
                <div className="flex items-center gap-3">
                   <FileText className="text-accent" size={20} />
                   <div>
                      <p className="text-[10px] font-black text-muted uppercase tracking-widest">Documento Completo</p>
                      <p className="text-sm font-black text-foreground">{selectedPDF.title}</p>
                   </div>
                </div>
                <button 
                  onClick={() => setSelectedPDF(null)}
                  className="w-10 h-10 rounded-full bg-surface-subtle flex items-center justify-center text-foreground"
                >
                  <X size={20} />
                </button>
             </div>
             
             <div className="flex-1 bg-slate-800 overflow-hidden relative">
                <iframe 
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedPDF.file_url)}&embedded=true`}
                  className="absolute inset-0 w-full h-full border-none"
                  title="PDF Viewer"
                />
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-between">
                  <p className="text-[10px] text-white/60 font-medium italic">
                    Vista previa digital optimizada
                  </p>
                  <button 
                    onClick={() => window.open(selectedPDF.file_url)}
                    className="text-[10px] font-black text-accent uppercase tracking-widest"
                  >
                    Abrir Original
                  </button>
                </div>
             </div>

             <div className="p-6 bg-surface border-t border-border grid grid-cols-2 gap-4">
                <button 
                  onClick={() => window.open(selectedPDF.file_url, '_blank')}
                  className="py-4 rounded-2xl bg-surface-subtle border border-border text-foreground font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                >
                  Abrir Original
                </button>
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedPDF.file_url;
                    link.download = `${selectedPDF.title}.pdf`;
                    link.click();
                  }}
                  className="py-4 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
                >
                  <Download size={14} /> Descargar
                </button>
             </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
