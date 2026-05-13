'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useTravelPlans, FullTravelPlan } from '@/hooks/useTravelPlans';
import { usePlanModules } from '@/hooks/usePlanModules';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { UserLocationsManager } from '@/components/UserLocationsManager';
import { getUserLocationsAction } from '@/actions/user-location-actions';
import { calculateRecommendedDeparture } from '@/modules/smart-departure/smart-departure.service';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { OutcomeDrawer } from '@/components/OutcomeDrawer';
import { MapModal, type MapLocation } from '@/components/MapModal';
import { supabase } from '@/lib/supabase';
import { getPlanRoutesAction } from '@/actions/travel-routes-actions';
import { searchNearbyPlacesAction, saveSavedPlaceAction } from '@/actions/google-places-actions';
import { getAIRecommendationsAction } from '@/actions/ai-recommendation-actions';
import { askContextualAssistantAction } from '@/actions/ai-assistant-actions';
import { fetchAlertsAction, processPlanAlertsAction, markAlertAsReadAction } from '@/actions/alert-actions';
import { 
  Footprints, Bus, Zap, Info, Compass, Coffee, Landmark, Pill, BusFront, 
  ShoppingCart, Star, Heart, Search, Sparkles, ShieldAlert, MessageCircle, 
  Send, History, Shield, Bell, Navigation, Smartphone, Ticket, QrCode, 
  Calendar, MapPin, Building2, User, Car, Utensils, Plane, Loader2, 
  FileText, Clock, ArrowRight, Download, MessageSquare, AlertCircle, 
  CalendarRange, ChevronDown, Check, XCircle, Sun, Moon, ExternalLink, X, CheckCircle2, Phone
} from 'lucide-react';

// Premium UI Components
import { ContextHero } from '@/components/premium/ContextHero';
import { CompactRow } from '@/components/premium/CompactRow';
import { TimelineSection } from '@/components/premium/TimelineSection';
import { BottomActionSheet } from '@/components/premium/BottomActionSheet';
import { TimelineEvent } from '@/components/premium/TimelineEvent';

import { AirportModeView } from '@/components/premium/AirportModeView';

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
  
  const [isManagerView, setIsManagerView] = useState(false);
  const [allContextEvents, setAllContextEvents] = useState<any[]>([]);
  const [planRoutes, setPlanRoutes] = useState<any[]>([]);
  
  // Exploration states
  const [explorationResults, setExplorationResults] = useState<any[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [searchCategory, setSearchCategory] = useState('restaurant');
  const [searchRadius, setSearchRadius] = useState(1000);
  const [searchReference, setSearchReference] = useState<'hotel' | 'congress' | 'current'>('hotel');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [isSavingPlaceId, setIsSavingPlaceId] = useState<string | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [isRecommendingWithIA, setIsRecommendingWithIA] = useState(false);
  
  // Navigation & Assistant states
  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'assistant' | 'profile'>('home');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string; actions?: any[] }[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const unreadAlertsCount = alerts.filter(a => !a.read_at).length;

  // Push states
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const [pushStatus, setPushStatus] = useState<PermissionState>('prompt');

  // Smart Departure states
  const [userLocations, setUserLocations] = useState<any[]>([]);
  const [smartDeparture, setSmartDeparture] = useState<any>(null);
  
  // Premium UI states
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showAirportFullView, setShowAirportFullView] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = Notification.permission;
      setPushStatus(permission === 'default' ? 'prompt' : permission as PermissionState);
    }
  }, []);

  const handleSubscribePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Las notificaciones no están disponibles en este dispositivo.');
      return;
    }

    setIsSubscribingPush(true);
    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission === 'default' ? 'prompt' : permission as PermissionState);
      
      if (permission !== 'granted') {
        setIsSubscribingPush(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_KEY;
      if (!vapidPublicKey) {
        alert('Clave de notificaciones no configurada.');
        setIsSubscribingPush(false);
        return;
      }
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey
      });

      if (!session.user?.id) throw new Error('Usuario no identificado');

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          profileId: session.user.id
        })
      });

      if (res.ok) {
        alert('¡Notificaciones activadas!');
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Subscription error:', errorData);
        throw new Error('Error al registrar suscripción');
      }
    } catch (err) {
      console.error('Push error:', err);
      alert('Error al activar notificaciones. Asegúrate de estar usando un navegador compatible.');
    } finally {
      setIsSubscribingPush(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
        }
      );
    }
  }, []);

  useEffect(() => {
    const fetchUserLocations = async () => {
      if (!session.user?.id) return;
      const res = await getUserLocationsAction(session.user.id);
      if (res.success) setUserLocations(res.data || []);
    };
    fetchUserLocations();
  }, [session.user?.id]);

  useEffect(() => {
    const fetchSavedPlaces = async () => {
      if (!activePlan?.id) return;
      const { data } = await supabase
        .from('saved_places')
        .select('*')
        .eq('plan_id', activePlan.id);
      setSavedPlaces(data || []);
    };
    fetchSavedPlaces();
  }, [activePlan?.id]);

  useEffect(() => {
    const handleAlerts = async () => {
      if (!activePlan || !session.user?.id) return;
      await processPlanAlertsAction(activePlan, session.user.id);
      const data = await fetchAlertsAction(activePlan.id, session.user.id);
      setAlerts(data);
    };
    handleAlerts();
    const interval = setInterval(handleAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activePlan?.id, session.user?.id]);

  const handleExplore = async () => {
    let location = null;
    if (searchReference === 'hotel') {
      const hotel = activePlan?.hotel_stays?.[0];
      if (hotel?.latitude && hotel?.longitude) {
        location = { lat: hotel.latitude, lng: hotel.longitude };
      }
    } else if (searchReference === 'congress') {
      const congress = activePlan?.contexts;
      if (congress?.latitude && congress?.longitude) {
        location = { lat: congress.latitude, lng: congress.longitude };
      } else {
        const { data } = await supabase.from('contexts').select('latitude, longitude').eq('id', selectedContextId).single();
        if (data?.latitude && data?.longitude) {
          location = { lat: data.latitude, lng: data.longitude };
        }
      }
    } else if (searchReference === 'current' && userLocation) {
      location = userLocation;
    }

    if (!location) {
      alert('No se pudo determinar la ubicación de referencia.');
      return;
    }

    setIsSearchingPlaces(true);
    try {
      const res = await searchNearbyPlacesAction(location, searchCategory, searchRadius);
      if (res.success) {
        setExplorationResults(res.results || []);
      }
    } catch (err) {
      console.error('Explore catch:', err);
    } finally {
      setIsSearchingPlaces(false);
    }
  };

  const handleAssistantMessage = async (msg?: string) => {
    const text = msg || currentMessage;
    if (!text.trim() || !activePlan?.id || !session?.user?.id) return;

    const userMsg = { role: 'user' as const, content: text };
    setChatHistory(prev => [...prev, userMsg]);
    setCurrentMessage('');
    setIsThinking(true);

    try {
      const res = await askContextualAssistantAction({
        planId: activePlan.id,
        profileId: session.user.id,
        userName: userName,
        message: text,
        history: chatHistory.map(h => ({ role: h.role, content: h.content }))
      });

      if (res.success) {
        setChatHistory(prev => [...prev, { 
          role: 'assistant', 
          content: res.answer || '', 
          actions: res.actions 
        }]);
      } else {
        setChatHistory(prev => [...prev, { 
          role: 'assistant', 
          content: 'Lo siento, he tenido un problema conectando con mi base de conocimientos. ¿Puedes repetirlo?' 
        }]);
      }
    } catch (err) {
      console.error('Assistant error:', err);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSavePlace = async (place: any) => {
    if (!activePlan?.id || !session?.user?.id) return;
    
    setIsSavingPlaceId(place.place_id);
    try {
      const res = await saveSavedPlaceAction({
        plan_id: activePlan.id,
        profile_id: session.user.id,
        place,
        category: searchCategory
      });
      
      if (res.success) {
        setSavedPlaces(prev => [...prev, res.data]);
      }
    } catch (err) {
      console.error('Save place error:', err);
    } finally {
      setIsSavingPlaceId(null);
    }
  };

  useEffect(() => {
    const loadContexts = async () => {
      if (!session?.user) return;
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
        
        const routeRes = await getPlanRoutesAction(plan.id);
        if (routeRes.success) {
          setPlanRoutes(routeRes.routes || []);
        }
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

    activePlan.flights.filter(f => f.is_verified).forEach(f => {
      events.push({
        id: `flight-${f.id}`,
        type: 'flight',
        datetime: new Date(f.departure_time),
        title: `Vuelo ${f.flight_number}`,
        location: f.departure_location || 'Aeropuerto',
        description: `Trayecto hacia ${f.arrival_location}. Puerta por confirmar.`,
        icon: Plane,
        color: 'text-accent',
        payload: f,
        lat: f.departure_lat,
        lng: f.departure_lng
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
          payload: f,
          lat: f.arrival_lat,
          lng: f.arrival_lng
        });
      }
    });

    activePlan.hotel_stays?.forEach(h => {
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
        payload: h,
        lat: h.latitude,
        lng: h.longitude
      });

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
        payload: h,
        lat: h.latitude,
        lng: h.longitude
      });
    });

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
        payload: t,
        lat: t.pickup_lat,
        lng: t.pickup_lng
      });
    });

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
        payload: r,
        lat: r.latitude,
        lng: r.longitude
      });
    });

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
        timeString: new Date(e.start_datetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
        lat: e.venue_lat,
        lng: e.venue_lng
      });
    });

    return events
      .sort((a, b) => a.datetime.getTime() - b.datetime.getTime())
      .map(e => ({
        ...e,
        time: e.timeString || e.datetime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
      }));
  }, [activePlan, userName]);

  const nextAction = useMemo(() => {
    const now = new Date();
    return timelineEvents.find(e => e.datetime > now);
  }, [timelineEvents]);

  useEffect(() => {
    const calculateDeparture = async () => {
      if (!nextAction || userLocations.length === 0) {
        setSmartDeparture(null);
        return;
      }
      
      const defaultLoc = userLocations.find(l => l.is_default_departure) || userLocations[0];
      if (!defaultLoc) return;

      const res = await calculateRecommendedDeparture({
        origin: { 
          address: defaultLoc.address, 
          latitude: defaultLoc.latitude, 
          longitude: defaultLoc.longitude 
        },
        destination: { 
          address: nextAction.location, 
          latitude: nextAction.lat || 0,
          longitude: nextAction.lng || 0 
        },
        targetArrivalTime: nextAction.datetime,
        bufferMinutes: nextAction.type === 'flight' ? 120 : 15,
      });
      setSmartDeparture(res);
    };
    calculateDeparture();
  }, [nextAction, userLocations]);

  const activeDayEvents = useMemo(() => {
    if (timelineEvents.length === 0) return [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const hasEventsToday = timelineEvents.some(e => e.datetime.toISOString().split('T')[0] === todayStr);
    const displayDateStr = hasEventsToday ? todayStr : timelineEvents[0].datetime.toISOString().split('T')[0];
    return timelineEvents.filter(e => e.datetime.toISOString().split('T')[0] === displayDateStr);
  }, [timelineEvents]);

  const airportMode = useMemo(() => {
    if (!activePlan) return null;
    const now = new Date();
    const nextFlight = activePlan.flights
      .filter(f => f.is_verified)
      .find(f => {
        const depTime = new Date(f.departure_time);
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

  useEffect(() => {
    if (airportMode && airportMode.diffMin < 360 && !showAirportFullView) {
      setShowAirportFullView(true);
    }
  }, [airportMode]);

  const mapLocations = useMemo((): MapLocation[] => {
    if (!activePlan) return [];
    const locs: MapLocation[] = [];
    activePlan.hotel_stays?.forEach(h => {
      if (!h.deleted_at) {
        locs.push({
          id: `hotel-${h.id}`,
          type: 'hotel',
          name: h.hotel_name,
          address: h.address,
          extra: `Check-in: ${new Date(h.check_in).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`,
        });
      }
    });
    activePlan.hospitality_events?.filter(e => e.visible_to_client && !e.deleted_at && e.venue_address).forEach(e => {
      locs.push({
        id: `hosp-${e.id}`,
        type: 'hospitality',
        name: e.venue_name || e.title,
        address: e.venue_address,
        extra: new Date(e.start_datetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
      });
    });
    return locs;
  }, [activePlan]);

  // Personalized IA Prompt point 6
  useEffect(() => {
    if (activePlan && activeTab === 'assistant' && chatHistory.length === 0) {
      setTimeout(() => {
        const name = session.user?.name || '';
        let suggestion = '';
        if (name.includes('Francisco')) suggestion = 'Paco';
        if (name.includes('Ana')) suggestion = 'Ana';
        
        const welcomeMsg = suggestion 
          ? `¡Hola ${name}! Qué alegría tenerte aquí. Por cierto, he visto que te llamas ${name}... ¿te importa si te llamo ${suggestion} para ser más cercanos? O dime cómo prefieres que me dirija a ti.`
          : `¡Hola ${name}! Qué alegría tenerte aquí. ¿Cómo prefieres que me dirija a ti?`;
          
        setChatHistory([{ role: 'assistant', content: welcomeMsg }]);
      }, 1000);
    }
  }, [activePlan, activeTab]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  if (loading || planLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <WakeLockHandler />
      
      <AnimatePresence>
        {showAirportFullView && airportMode && (
          <AirportModeView 
            data={airportMode} 
            smartDeparture={smartDeparture}
            onClose={() => setShowAirportFullView(false)}
            onAction={(action) => {
              if (action === 'maps') window.open(`https://www.google.com/maps/dir/?api=1&destination=${airportMode.flight.departure_location}`);
              if (action === 'contact') handleAssistantMessage('Necesito contactar con mi coordinador de viaje');
              if (action === 'docs') setSelectedPDF(airportMode.boardingPass || activePlan?.documents[0]);
            }}
          />
        )}
      </AnimatePresence>
      
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <motion.div 
          key={activeTab}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-xl mx-auto px-6 py-10"
        >
          {activeTab === 'home' && (
            <div className="space-y-10">
              <ContextHero 
                activePlan={activePlan} 
                userName={userName}
                unreadAlertsCount={unreadAlertsCount}
                onShowAlerts={() => setShowAlerts(true)}
                airportMode={airportMode}
                smartDeparture={smartDeparture}
              />

              {/* Next Action Briefing (Tarjeta Activa) */}
              {nextAction && (
                <motion.div 
                  variants={itemVariants}
                  className="p-8 rounded-[3rem] bg-foreground text-background shadow-2xl relative overflow-hidden group active:scale-[0.98] transition-all"
                  onClick={() => {
                    setSelectedEvent(nextAction);
                    setIsSheetOpen(true);
                  }}
                >
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <nextAction.icon size={120} strokeWidth={1} />
                  </div>
                  <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 rounded-full bg-accent text-white text-[9px] font-black uppercase tracking-widest">
                        Próxima Acción
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Hoy • {nextAction.time}</span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-4xl font-black tracking-tighter leading-none">{nextAction.title}</h3>
                      <p className="text-sm font-medium opacity-60 flex items-center gap-2">
                        <MapPin size={14} />
                        {nextAction.location}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-background/10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                          <Navigation size={14} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Ver Detalles</span>
                      </div>
                      <ArrowRight size={20} className="opacity-40 group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Timeline Section (Unified Flow) */}
              <motion.section variants={itemVariants} className="space-y-8">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">Tu Itinerario</h3>
                    <div className="h-px w-12 bg-accent/20" />
                  </div>
                  <button 
                    onClick={() => setShowTimeline(true)}
                    className="text-[9px] font-black uppercase tracking-widest text-muted hover:text-accent transition-colors"
                  >
                    Agenda Completa
                  </button>
                </div>
                
                <div className="space-y-6">
                  {activeDayEvents.map((event, idx) => (
                    <TimelineEvent 
                      key={event.id}
                      time={event.time}
                      title={event.title}
                      location={event.location}
                      description={event.description}
                      icon={event.icon}
                      isActive={nextAction?.id === event.id}
                      isLast={idx === activeDayEvents.length - 1}
                      onClick={() => {
                        setSelectedEvent(event);
                        setIsSheetOpen(true);
                      }}
                    />
                  ))}
                  {activeDayEvents.length === 0 && (
                    <div className="p-12 rounded-[3rem] border border-dashed border-border/50 flex flex-col items-center text-center gap-4 bg-surface/10">
                      <div className="w-16 h-16 rounded-[2rem] bg-surface flex items-center justify-center text-muted/20">
                        <Calendar size={32} />
                      </div>
                      <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">No hay eventos programados para hoy</p>
                    </div>
                  )}
                </div>
              </motion.section>

              {/* Concierge Hub (IA Contextual & Quick Actions) */}
              <motion.section variants={itemVariants} className="space-y-6">
                <div className="flex items-center gap-4 px-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">Centro de Asistencia</h3>
                  <div className="flex-1 h-px bg-accent/20" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* IA Briefing Block */}
                  <div className="p-6 rounded-[2.5rem] bg-surface/30 border border-border/40 backdrop-blur-xl space-y-4">
                    <div className="flex items-center gap-3">
                      <Sparkles size={18} className="text-accent" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Briefing IA</span>
                    </div>
                    <p className="text-xs font-medium text-muted leading-relaxed">
                      "Cielo despejado en París (18°C). El tráfico hacia el Palacio de Congresos es fluido. Recuerda que tu cena VIP es a las 21:00."
                    </p>
                  </div>

                  {/* Quick Actions Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setShowMap(true)}
                      className="p-5 rounded-2xl bg-surface/30 border border-border/40 flex flex-col items-center justify-center gap-3 hover:bg-surface/60 transition-all"
                    >
                      <MapPin size={20} className="text-accent" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted">Mapa</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('explore')}
                      className="p-5 rounded-2xl bg-surface/30 border border-border/40 flex flex-col items-center justify-center gap-3 hover:bg-surface/60 transition-all"
                    >
                      <Compass size={20} className="text-accent" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted">Explorar</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('assistant')}
                      className="p-5 rounded-2xl bg-surface/30 border border-border/40 flex flex-col items-center justify-center gap-3 hover:bg-surface/60 transition-all"
                    >
                      <Sparkles size={20} className="text-accent" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted">IA Concierge</span>
                    </button>
                    <button 
                      onClick={() => setShowAlerts(true)}
                      className="p-5 rounded-2xl bg-surface/30 border border-border/40 flex flex-col items-center justify-center gap-3 hover:bg-surface/60 transition-all"
                    >
                      <Bell size={20} className="text-accent" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted">Alertas</span>
                    </button>
                  </div>
                </div>
              </motion.section>
            </div>
          )}

          {activeTab === 'explore' && (
            <motion.div variants={itemVariants} className="space-y-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">Servicios Locales</p>
                <h1 className="text-4xl font-black text-foreground tracking-tighter">EXPLORAR</h1>
              </div>

              <div className="bg-surface/40 border border-border/40 rounded-[3rem] p-8 space-y-8 backdrop-blur-xl">
                <div className="space-y-4">
                  <p className="text-[9px] font-black text-muted uppercase tracking-widest">Referencia</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['hotel', 'congress', 'current'].map(ref => (
                      <button
                        key={ref}
                        onClick={() => setSearchReference(ref as any)}
                        className={cn(
                          "py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all",
                          searchReference === ref ? "bg-accent border-accent text-white" : "bg-background/40 border-border text-muted"
                        )}
                      >
                        {ref === 'hotel' ? 'Mi Hotel' : ref === 'congress' ? 'Sede' : 'Cerca de mí'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[9px] font-black text-muted uppercase tracking-widest">¿Qué buscas?</p>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {[
                      { id: 'restaurant', label: 'Restaurantes', icon: Utensils },
                      { id: 'cafe', label: 'Cafeterías', icon: Coffee },
                      { id: 'pharmacy', label: 'Farmacias', icon: Pill },
                      { id: 'transit_station', label: 'Transporte', icon: BusFront }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSearchCategory(cat.id)}
                        className={cn(
                          "flex items-center gap-2 px-6 py-3 rounded-full border border-border/40 whitespace-nowrap transition-all backdrop-blur-sm",
                          searchCategory === cat.id ? "bg-foreground text-background" : "bg-background/40 text-muted hover:bg-background/60"
                        )}
                      >
                        <cat.icon size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleExplore}
                  disabled={isSearchingPlaces}
                  className="w-full py-5 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-accent/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                >
                  {isSearchingPlaces ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                  Buscar Ahora
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {explorationResults.map(place => (
                  <CompactRow 
                    key={place.place_id}
                    title={place.name}
                    subtitle={place.vicinity}
                    icon={MapPin}
                    onClick={() => {
                      setSelectedEvent({ title: place.name, location: place.vicinity, type: 'place', payload: place });
                      setIsSheetOpen(true);
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'assistant' && (
            <motion.div variants={itemVariants} className="space-y-8 h-full flex flex-col">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">Concierge Premium</p>
                <h1 className="text-4xl font-black text-foreground tracking-tighter">ASISTENTE</h1>
              </div>

              <div className="flex-1 min-h-[500px] flex flex-col bg-surface/30 border border-border/40 rounded-[3rem] shadow-2xl overflow-hidden relative backdrop-blur-xl">
                <div className="flex-1 p-6 overflow-y-auto space-y-6 no-scrollbar pb-28">
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={cn("flex flex-col gap-2 max-w-[85%]", msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start")}>
                      <div className={cn(
                        "p-5 rounded-[2rem]", 
                        msg.role === 'user' ? "bg-accent text-white shadow-lg shadow-accent/20" : "bg-surface/50 border border-border/40 backdrop-blur-md"
                      )}>
                        <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {isThinking && (
                    <div className="flex items-center gap-2 text-accent animate-pulse px-4">
                      <Sparkles size={14} />
                      <span className="text-[9px] font-black uppercase tracking-widest">El asistente está pensando...</span>
                    </div>
                  )}
                </div>

                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex gap-3 p-2 rounded-[2rem] bg-background/60 backdrop-blur-2xl border border-white/10 shadow-2xl">
                    <input 
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAssistantMessage()}
                      placeholder="Escribe tu duda..."
                      className="flex-1 bg-transparent px-6 py-2 text-sm focus:outline-none placeholder:text-muted/40"
                    />
                    <button 
                      onClick={() => handleAssistantMessage()} 
                      className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center shadow-lg shadow-accent/20 active:scale-90 transition-all"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div variants={itemVariants} className="space-y-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">Tu cuenta</p>
                <h1 className="text-4xl font-black text-foreground tracking-tighter">PERFIL</h1>
              </div>

              <div className="p-8 rounded-[3rem] bg-surface border border-border shadow-2xl flex flex-col items-center text-center space-y-6">
                <div className="w-24 h-24 rounded-[2.5rem] bg-accent/10 flex items-center justify-center text-accent text-4xl font-black">
                  {userName[0]}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-foreground">{userName}</h2>
                  <p className="text-[10px] font-black text-muted uppercase tracking-widest">{session.user?.role || 'CLIENTE VIP'}</p>
                </div>
                <button 
                  onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
                  className="w-full py-5 rounded-2xl bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-500/20"
                >
                  Cerrar Sesión
                </button>
              </div>

              {session.user?.id && <UserLocationsManager profileId={session.user.id} />}
              
              <div className="p-6 rounded-[2.5rem] bg-accent/5 border border-accent/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Bell size={24} className="text-accent" />
                  <p className="text-sm font-black text-foreground">Notificaciones Push</p>
                </div>
                <button onClick={handleSubscribePush} className="px-5 py-2.5 rounded-xl bg-accent text-white text-[10px] font-black uppercase tracking-widest">
                  {pushStatus === 'granted' ? 'Activado' : 'Activar'}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-6 pt-2 bg-gradient-to-t from-background via-background/90 to-transparent pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
        <div className="max-w-xl mx-auto flex items-center justify-between p-2 rounded-[2.5rem] bg-surface/90 backdrop-blur-xl border border-white/10 shadow-2xl">
          {[
            { id: 'home', label: 'Inicio', icon: Building2 },
            { id: 'explore', label: 'Explorar', icon: Compass },
            { id: 'assistant', label: 'Asistente', icon: Sparkles },
            { id: 'profile', label: 'Perfil', icon: User },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn("flex-1 flex flex-col items-center gap-1.5 py-3 transition-all", activeTab === tab.id ? "text-accent" : "text-muted")}
            >
              <tab.icon size={20} />
              <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Global Overlays */}
      <BottomActionSheet 
        isOpen={isSheetOpen} 
        onClose={() => setIsSheetOpen(false)}
        title={selectedEvent?.title}
        subtitle={selectedEvent?.location}
      >
        <div className="space-y-6 pt-4">
          {selectedEvent?.description && (
            <p className="text-sm text-muted/80 leading-relaxed italic">
              {selectedEvent.description}
            </p>
          )}

          {selectedEvent?.type === 'flight' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-surface-subtle border border-border">
                <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Terminal</p>
                <p className="text-lg font-black text-foreground">{selectedEvent.payload.departure_terminal || 'T1'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-surface-subtle border border-border">
                <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Puerta</p>
                <p className="text-lg font-black text-foreground">{selectedEvent.payload.gate || 'Por conf.'}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {selectedEvent?.payload?.latitude && (
              <button 
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedEvent.payload.latitude},${selectedEvent.payload.longitude}`)}
                className="w-full py-5 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-xl shadow-accent/20"
              >
                <Navigation size={18} />
                Cómo llegar
              </button>
            )}
            
            {selectedEvent?.type === 'flight' && (
              <button 
                onClick={() => {
                  const doc = activePlan?.documents.find(d => d.related_flight_id === selectedEvent.payload.id);
                  if (doc) setSelectedQR({ ...doc, flight: selectedEvent.payload });
                  setIsSheetOpen(false);
                }}
                className="w-full py-5 rounded-2xl bg-foreground text-background font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3"
              >
                <QrCode size={18} />
                Tarjeta de Embarque
              </button>
            )}
          </div>
        </div>
      </BottomActionSheet>

      <AnimatePresence>
        {selectedQR && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-white flex flex-col items-center justify-center p-8">
            <button onClick={() => setSelectedQR(null)} className="absolute top-8 right-8 p-3 bg-slate-100 rounded-full"><X size={24} /></button>
            <div className="bg-white p-6 rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col items-center gap-8">
              <QRCodeSVG value={selectedQR.qr_raw_payload || selectedQR.qr_code || ''} size={280} level="H" includeMargin={true} />
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asiento</p>
                <p className="text-3xl font-black text-slate-900">{selectedQR.seat_assignment || '—'}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAlerts && (
          <div className="fixed inset-0 z-[500] bg-background/80 backdrop-blur-md flex items-end">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="w-full bg-surface rounded-t-[3rem] p-8 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-foreground">Alertas</h3>
                <button onClick={() => setShowAlerts(false)} className="p-2 bg-surface-subtle rounded-full"><X size={24} /></button>
              </div>
              <div className="space-y-4">
                {alerts.map(a => (
                  <div key={a.id} className="p-6 rounded-[2rem] bg-surface-subtle border border-border flex gap-4">
                    <Bell className="text-accent shrink-0" size={24} />
                    <div className="space-y-1">
                      <h4 className="font-black text-foreground">{a.title}</h4>
                      <p className="text-xs text-muted">{a.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <MapModal
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        locations={mapLocations}
        contextName={selectedContext?.name}
      />
    </div>
  );
}
