'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { FullTravelPlan, useTravelPlans } from '@/hooks/useTravelPlans';
import { AddPassButton, WalletBadge } from '@/components/wallet/AddPassButton';
import { usePlanModules } from '@/hooks/usePlanModules';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { UserLocationsManager } from '@/components/UserLocationsManager';
import { getUserLocationsAction } from '@/actions/user-location-actions';
import { calculateRecommendedDepartureAction } from '@/actions/smart-departure-actions';
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
import { getTravelTimelineAction } from '@/actions/travel-timeline-actions';
import { getLiveTravelStatusAction } from '@/actions/live-travel-actions';
import { 
  Footprints, Bus, Zap, Info, Compass, Coffee, Landmark, Pill, BusFront, 
  ShoppingCart, Star, Heart, Search, Sparkles, ShieldAlert, MessageCircle, 
  Send, History, Shield, Bell, Navigation, Smartphone, Ticket, QrCode, 
  Calendar, MapPin, Building2, User, Car, Utensils, Plane, Loader2, 
  FileText, Clock, ArrowRight, Download, MessageSquare, AlertCircle, 
  CalendarRange, ChevronDown, Check, XCircle, Sun, Moon, ExternalLink, X, CheckCircle2, Phone, Activity, Map
} from 'lucide-react';

// Premium UI Components
import { ContextHero } from '@/components/premium/ContextHero';
import { CompactRow } from '@/components/premium/CompactRow';
import { TimelineSection } from '@/components/premium/TimelineSection';
import { BottomActionSheet } from '@/components/premium/BottomActionSheet';
import { TimelineEvent } from '@/components/premium/TimelineEvent';
import { MobilityActions } from '@/components/premium/MobilityActions';
import { ShareLocationDrawer } from '@/components/premium/ShareLocationDrawer';

import { AirportModeView } from '@/components/premium/AirportModeView';
import { processTimelineEvents } from '@/core/services/travel-timeline.service';
import TodayMiniMap from '@/modules/live-map/components/TodayMiniMap';
import LiveMapTab from '@/modules/live-map/components/LiveMapTab';
import SupportPanel from '@/modules/coordinator-support/components/SupportPanel';
import dynamic from 'next/dynamic';
const LiveMap = dynamic(() => import('@/modules/live-map/components/LiveMap'), { ssr: false });
import { AlertTriangle } from 'lucide-react';
import { LiveMapExperience } from '@/components/premium/LiveMapExperience';

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

const getMobilityCoords = (event: any) => {
  if (!event) return null;
  
  // Transfer
  if (event.type === 'transfer') {
    const lat = event.payload?.dropoff_lat || event.payload?.pickup_lat || event.lat;
    const lng = event.payload?.dropoff_lng || event.payload?.pickup_lng || event.lng;
    if (lat && lng) return { lat, lng };
  }
  
  // Flights
  if (event.type?.includes('flight')) {
    const lat = event.payload?.arrival_lat || event.payload?.departure_lat || event.lat;
    const lng = event.payload?.arrival_lng || event.payload?.departure_lng || event.lng;
    if (lat && lng) return { lat, lng };
  }

  // Hospitality / Dinner / Agenda
  if (event.payload?.venue_lat && event.payload?.venue_lng) {
    return { lat: event.payload.venue_lat, lng: event.payload.venue_lng };
  }

  // Hotel / Restaurant / Generic place
  const lat = event.lat || event.payload?.latitude || event.payload?.geometry?.location?.lat;
  const lng = event.lng || event.payload?.longitude || event.payload?.geometry?.location?.lng;
  if (lat && lng) {
    return { lat, lng };
  }

  return null;
};

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, logout } = useAuth();

  // Impersonation / Preview Logic
  const previewUserId = searchParams.get('preview_user_id');
  const isAdmin = session.user?.role === 'admin';
  const effectiveUserId = (isAdmin && previewUserId) ? previewUserId : session.user?.id;
  const isPreviewMode = !!(isAdmin && previewUserId);

  const { theme, toggleTheme } = useTheme();
  const { getMyActivePlan, loading: planLoading } = useTravelPlans();
  const { getEnabledModules } = usePlanModules();

  useEffect(() => {
    if (session.status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [session.status, router]);

  const [previewUser, setPreviewUser] = useState<any>(null);

  useEffect(() => {
    if (isPreviewMode && previewUserId) {
      const fetchPreviewUser = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', previewUserId)
          .single();
        if (data) {
          setPreviewUser({
            id: data.id,
            name: data.nombre,
            surname: data.apellidos,
            email: data.email
          });
        }
      };
      fetchPreviewUser();
    }
  }, [isPreviewMode, previewUserId]);

  const userName = isPreviewMode ? (previewUser?.name || 'Usuario') : (session.user?.name || 'Usuario');
  
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
  
  // State for Server Action Timeline
  const [rawTimelineEvents, setRawTimelineEvents] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  
  // Exploration states
  const [explorationResults, setExplorationResults] = useState<any[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [searchCategory, setSearchCategory] = useState('restaurant');
  const [searchRadius, setSearchRadius] = useState(1000);
  const [searchReference, setSearchReference] = useState<'hotel' | 'congress' | 'current'>('hotel');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [isSavingPlaceId, setIsSavingPlaceId] = useState<string | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [isRecommendingWithIA, setIsRecommendingWithIA] = useState(false);
  
  // Navigation & Assistant states
  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'assistant' | 'profile' | 'map'>('home');
  const [selectedMapLocId, setSelectedMapLocId] = useState<string | undefined>(undefined);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string; actions?: any[]; places?: any[]; alert?: string }[]>([]);
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
  
  // Live Travel Engine states
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  
  // Premium UI states
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showAirportFullView, setShowAirportFullView] = useState(false);
  const [isShareLocationOpen, setIsShareLocationOpen] = useState(false);
  const [sharedMeetingPoint, setSharedMeetingPoint] = useState<{
    lat: number;
    lng: number;
    name: string;
    user: string;
    type: string;
  } | null>(null);

  useEffect(() => {
    const shareLat = searchParams.get('share_lat');
    const shareLng = searchParams.get('share_lng');
    const shareName = searchParams.get('share_name');
    const shareUser = searchParams.get('share_user');
    const shareType = searchParams.get('share_type');

    if (shareLat && shareLng && shareName && shareUser) {
      setSharedMeetingPoint({
        lat: parseFloat(shareLat),
        lng: parseFloat(shareLng),
        name: shareName,
        user: shareUser,
        type: shareType || 'gps'
      });
    }
  }, [searchParams]);

  const sharedMeetingMetrics = useMemo(() => {
    if (!userLocation || !sharedMeetingPoint) return null;

    const R = 6371; // km
    const lat1 = (userLocation.lat * Math.PI) / 180;
    const lat2 = (sharedMeetingPoint.lat * Math.PI) / 180;
    const dLat = ((sharedMeetingPoint.lat - userLocation.lat) * Math.PI) / 180;
    const dLng = ((sharedMeetingPoint.lng - userLocation.lng) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const km = R * c * 1.25;

    const walkSpeed = 5; // km/h
    const etaMin = Math.round((km / walkSpeed) * 60);

    return {
      km: parseFloat(km.toFixed(2)),
      etaMin: Math.max(1, etaMin)
    };
  }, [userLocation, sharedMeetingPoint]);

  // Support Concierge states
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportEntityContext, setSupportEntityContext] = useState<any>(null);

  const handleOpenSupport = (entityContext?: any) => {
    setSupportEntityContext(entityContext || null);
    setIsSupportOpen(true);
  };

  useEffect(() => {
    const handleOpenSupportEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      handleOpenSupport(customEvent.detail || null);
    };

    window.addEventListener('open-support-concierge', handleOpenSupportEvent);
    return () => {
      window.removeEventListener('open-support-concierge', handleOpenSupportEvent);
    };
  }, []);

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
    if (typeof window === 'undefined' || !navigator.geolocation) return;

    // Load from cache first
    try {
      const cachedLoc = localStorage.getItem('current_location');
      const cachedTime = localStorage.getItem('last_updated');
      const cachedAcc = localStorage.getItem('accuracy');
      if (cachedLoc && cachedTime) {
        const timeDiff = Date.now() - new Date(cachedTime).getTime();
        // If cache is less than 15 minutes old, use it initially
        if (timeDiff < 15 * 60 * 1000) {
          const parsed = JSON.parse(cachedLoc);
          setUserLocation({ 
            lat: parsed.lat, 
            lng: parsed.lng, 
            accuracy: cachedAcc ? parseFloat(cachedAcc) : undefined 
          });
        }
      }
    } catch (e) {
      console.warn('Error reading location cache:', e);
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setUserLocation(coords);

        // Save to cache
        try {
          localStorage.setItem('current_location', JSON.stringify({ lat: coords.lat, lng: coords.lng }));
          localStorage.setItem('last_updated', new Date().toISOString());
          localStorage.setItem('accuracy', coords.accuracy.toString());
        } catch (e) {
          console.warn('Error saving location cache:', e);
        }
      },
      (error) => {
        console.warn('Geolocation watch error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    const fetchUserLocations = async () => {
      if (!effectiveUserId) return;
      const res = await getUserLocationsAction(effectiveUserId);
      if (res.success) setUserLocations(res.data || []);
    };
    fetchUserLocations();
  }, [effectiveUserId]);

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
      if (!activePlan || !effectiveUserId) return;
      await processPlanAlertsAction(activePlan, effectiveUserId);
      const data = await fetchAlertsAction(activePlan.id, effectiveUserId);
      setAlerts(data);
    };
    handleAlerts();
    const interval = setInterval(handleAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activePlan?.id, effectiveUserId]);

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
    if (!text.trim() || !activePlan?.id || !effectiveUserId) return;

    const userMsg = { role: 'user' as const, content: text };
    setChatHistory(prev => [...prev, userMsg]);
    setCurrentMessage('');
    setIsThinking(true);

    try {
      const res = await askContextualAssistantAction({
        planId: activePlan.id,
        profileId: effectiveUserId,
        userName: userName,
        message: text,
        history: chatHistory.map(h => ({ role: h.role, content: h.content })),
        userLocation: userLocation,
        weather: liveStatus?.activeWeatherStatus,
        traffic: liveStatus?.activeTrafficStatus
      });

      if (res.success) {
        setChatHistory(prev => [...prev, { 
          role: 'assistant', 
          content: res.answer || '', 
          actions: res.actions,
          places: res.places || [],
          alert: res.alert
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
    if (!activePlan?.id || !effectiveUserId) return;
    
    setIsSavingPlaceId(place.place_id);
    try {
      const res = await saveSavedPlaceAction({
        plan_id: activePlan.id,
        profile_id: effectiveUserId,
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
          .eq('user_id', effectiveUserId);

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
      setTimelineLoading(true);
      const plan = await getMyActivePlan(selectedContextId, effectiveUserId);
      setActivePlan(plan);
      
      if (plan) {
        const modules = await getEnabledModules(plan.id);
        setEnabledModules(modules);
        
        const routeRes = await getPlanRoutesAction(plan.id);
        if (routeRes.success) {
          setPlanRoutes(routeRes.routes || []);
        }

        // FUENTE ÚNICA: Cargar timeline de la acción del servidor
        const timelineRes = await getTravelTimelineAction(plan.id);
        if (timelineRes.success && timelineRes.data) {
          setRawTimelineEvents(timelineRes.data);
        } else {
          setRawTimelineEvents([]);
        }

        // Live Travel Engine Evaluation
        setLiveLoading(true);
        const liveRes = await getLiveTravelStatusAction(plan.id);
        if (liveRes.success && liveRes.data) {
          setLiveStatus(liveRes.data);
        }
        setLiveLoading(false);
      }
      setTimelineLoading(false);
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

  // Helper to safely format local ISO string to YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // --- UNIFIED TIMELINE LOGIC ---
  const timelineEvents = useMemo(() => {
    if (rawTimelineEvents.length === 0) return [];
    
    // Map icons and styles for client rendering from server-action timeline data
    return rawTimelineEvents.map(e => {
      // Map icons
      let IconComponent = Sparkles;
      let colorClass = 'text-[#00D1FF]';
      
      switch (e.event_type) {
        case 'flight':
          IconComponent = e.id.includes('arr') ? MapPin : Plane;
          colorClass = e.id.includes('arr') ? 'text-blue-500' : 'text-[#00D1FF]';
          break;
        case 'transfer':
          IconComponent = Car;
          colorClass = 'text-amber-500';
          break;
        case 'hotel':
          IconComponent = Building2;
          colorClass = e.id.includes('in') ? 'text-emerald-500' : 'text-slate-500';
          break;
        case 'restaurant':
          IconComponent = Utensils;
          colorClass = 'text-orange-500';
          break;
        case 'hospitality':
          IconComponent = Utensils;
          colorClass = 'text-[#00D1FF]';
          break;
        case 'agenda':
          IconComponent = Activity;
          colorClass = 'text-emerald-400';
          break;
      }

      // Map latitude & longitude for Map Modal
      let lat = undefined;
      let lng = undefined;
      if (e.event_type === 'flight') {
        lat = e.id.includes('arr') ? e.metadata?.arrival_lat : e.metadata?.departure_lat;
        lng = e.id.includes('arr') ? e.metadata?.arrival_lng : e.metadata?.departure_lng;
      } else if (e.event_type === 'transfer') {
        lat = e.metadata?.pickup_lat;
        lng = e.metadata?.pickup_lng;
      } else if (e.event_type === 'hotel') {
        lat = e.metadata?.latitude;
        lng = e.metadata?.longitude;
      } else if (e.event_type === 'hospitality' || e.event_type === 'agenda') {
        lat = e.metadata?.venue_lat;
        lng = e.metadata?.venue_lng;
      } else if (e.event_type === 'restaurant') {
        lat = e.metadata?.latitude;
        lng = e.metadata?.longitude;
      }

      // Live Travel Engine Enrichment
      let flightPayload = e.metadata;
      let eventTitle = e.title;
      let eventTimeRaw = new Date(e.start_datetime);
      let eventTime = eventTimeRaw.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

      if (e.event_type === 'flight' && liveStatus?.activeFlightStatus && liveStatus.activeFlightStatus.flightId === e.metadata?.id) {
        const live = liveStatus.activeFlightStatus;
        flightPayload = {
          ...e.metadata,
          gate: live.gate || e.metadata?.gate || 'G12',
          status: live.status,
          delay_minutes: live.delayMinutes
        };

        if (live.status === 'DELAYED') {
          eventTitle = `✈️ Vuelo Retrasado ${e.metadata?.flight_number || ''}`;
          eventTimeRaw = new Date(live.estimatedTime);
          eventTime = eventTimeRaw.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        } else if (live.status === 'CANCELLED') {
          eventTitle = `❌ Vuelo Cancelado ${e.metadata?.flight_number || ''}`;
        } else if (live.status === 'BOARDING') {
          eventTitle = `⏳ Embarcando Vuelo ${e.metadata?.flight_number || ''}`;
        }
      }

      return {
        id: e.id,
        type: e.event_type === 'hotel' 
          ? (e.id.includes('in') ? 'hotel_checkin' : 'hotel_checkout')
          : e.event_type === 'flight'
            ? (e.id.includes('arr') ? 'flight_arrival' : 'flight')
            : e.event_type === 'restaurant'
              ? 'dinner'
              : e.event_type,
        datetime: eventTimeRaw,
        title: eventTitle,
        location: e.location || 'Ubicación por confirmar',
        description: e.subtitle || '',
        icon: IconComponent,
        color: colorClass,
        payload: flightPayload,
        lat,
        lng,
        actions: e.actions || [],
        documents: e.related_documents || [],
        time: eventTime
      };
    });
  }, [rawTimelineEvents, liveStatus]);

  const nextAction = useMemo(() => {
    const now = new Date();
    return timelineEvents.find(e => e.datetime > now);
  }, [timelineEvents]);

  const aiBriefingText = useMemo(() => {
    if (!activePlan) return "Bienvenido a tu panel de control. No hay actividades programadas en este plan.";

    const cityName = selectedContext?.name || "París";
    
    // Buscar si hay algún vuelo hoy
    const now = new Date();
    const todayStr = getTodayStr();
    
    const flightTodayEvent = timelineEvents.find(e => {
      if (e.type !== 'flight') return false;
      const eventDateStr = e.datetime.toLocaleDateString('en-CA');
      return eventDateStr === todayStr;
    });
    const flightToday = flightTodayEvent?.payload;

    // Buscar si hay alguna cena o evento de hospitalidad hoy
    const dinnerToday = timelineEvents.find(e => {
      const eventDate = e.datetime.toLocaleDateString('en-CA');
      return eventDate === todayStr && (e.type === 'dinner' || e.type === 'hospitality');
    });

    if (flightToday && dinnerToday) {
      const flightTimeStr = new Date(flightToday.departure_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
      const dinnerTimeStr = dinnerToday.datetime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
      
      let uberText = '';
      if (nextAction?.id === dinnerToday.id && smartDeparture) {
        const departureTimeStr = new Date(smartDeparture.recommendedTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        uberText = ` Te recomendamos solicitar tu UBER antes de las ${departureTimeStr} para llegar a tiempo (trayecto estimado de ${smartDeparture.estimatedTravelTimeMinutes} min).`;
      } else {
        const estDepTime = new Date(dinnerToday.datetime.getTime() - 45 * 60 * 1000);
        const estDepStr = estDepTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        uberText = ` Te aconsejamos pedir tu transporte/UBER alrededor de las ${estDepStr} para llegar con total puntualidad.`;
      }

      return `Hoy tienes tu vuelo ${flightToday.flight_number} hacia ${flightToday.arrival_location} a las ${flightTimeStr}. Por la noche, te espera tu cena en ${dinnerToday.location} a las ${dinnerTimeStr}.${uberText}`;
    }

    if (dinnerToday) {
      const dinnerTimeStr = dinnerToday.datetime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
      
      let uberText = '';
      if (nextAction?.id === dinnerToday.id && smartDeparture) {
        const departureTimeStr = new Date(smartDeparture.recommendedTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        uberText = ` Te recomendamos solicitar tu UBER antes de las ${departureTimeStr} para llegar a tiempo (trayecto estimado de ${smartDeparture.estimatedTravelTimeMinutes} min).`;
      } else {
        const estDepTime = new Date(dinnerToday.datetime.getTime() - 45 * 60 * 1000);
        const estDepStr = estDepTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        uberText = ` Te aconsejamos pedir tu transporte/UBER alrededor de las ${estDepStr} para llegar con total puntualidad.`;
      }

      return `Tu cita clave de hoy es la cena VIP en ${dinnerToday.location} a las ${dinnerTimeStr}.${uberText}`;
    }

    if (flightToday) {
      const flightTimeStr = new Date(flightToday.departure_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
      return `¡Buen viaje hoy! Tienes programado tu vuelo ${flightToday.flight_number} desde ${flightToday.departure_location} a las ${flightTimeStr}. Buen trayecto hacia ${flightToday.arrival_location}.`;
    }

    return `Tu agenda en ${cityName} está despejada para el día de hoy. Disfruta de tu estancia y no dudes en consultar con tu Concierge IA cualquier recomendación gastronómica o de transporte.`;
  }, [activePlan, selectedContext, timelineEvents, nextAction, smartDeparture]);

  useEffect(() => {
    const calculateDeparture = async () => {
      // Prioritize the Live Travel Engine traffic evaluation
      if (liveStatus?.activeTrafficStatus) {
        const traffic = liveStatus.activeTrafficStatus;
        setSmartDeparture({
          recommendedTime: new Date(traffic.recommendedDepartureTime),
          estimatedTravelTimeMinutes: Math.round(traffic.durationInTrafficSeconds / 60),
          travelDurationMinutes: Math.round(traffic.durationInTrafficSeconds / 60),
          congestionLevel: traffic.congestionLevel
        });
        return;
      }

      if (!nextAction || userLocations.length === 0) {
        setSmartDeparture(null);
        return;
      }
      
      const defaultLoc = userLocations.find(l => l.is_default_departure) || userLocations[0];
      if (!defaultLoc) return;

      const res = await calculateRecommendedDepartureAction({
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
        targetArrivalTime: nextAction.datetime.toISOString(),
        planId: activePlan?.id,
        profileId: isPreviewMode ? (previewUser?.id || '') : (session?.user?.id || ''),
        eventType: nextAction.type === 'flight' ? 'flight' : 
                   nextAction.type === 'transfer' ? 'transfer' :
                   nextAction.type === 'hotel_checkin' ? 'hotel' :
                   nextAction.type === 'dinner' ? 'restaurant' : 'congress',
        metadata: nextAction.payload || nextAction
      });
      if (res.success && res.data) {
        setSmartDeparture(res.data);
      }
    };
    calculateDeparture();
  }, [nextAction, userLocations, liveStatus]);

  // STAGE 3: Filtrar eventos estrictamente del día de hoy
  const activeDayEvents = useMemo(() => {
    if (timelineEvents.length === 0) return [];
    const todayStr = getTodayStr();
    return timelineEvents.filter(e => {
      const eventDateStr = e.datetime.toLocaleDateString('en-CA');
      return eventDateStr === todayStr;
    });
  }, [timelineEvents]);

  const airportMode = useMemo(() => {
    if (!activePlan) return null;
    const now = new Date();
    
    // Find upcoming flight or recently departed flight in timelineEvents
    const nextFlightEvent = timelineEvents.find(e => {
      if (e.type !== 'flight') return false; // Only departure event, arrival is 'flight_arrival'
      const depTime = e.datetime;
      const f = e.payload;
      if (!f) return false;
      
      const diffMs = depTime.getTime() - now.getTime();
      const diffHours = diffMs / (3600 * 1000);
      
      // Active if departing within 24h OR departed/arrived in the last 12 hours
      return (diffHours > -12 && diffHours < 24);
    });

    const nextFlight = nextFlightEvent?.payload;
    if (!nextFlight) return null;

    const depTime = new Date(nextFlight.departure_time);
    const arrTime = nextFlight.arrival_time ? new Date(nextFlight.arrival_time) : new Date(depTime.getTime() + 2 * 60 * 60 * 1000);
    const diffMs = depTime.getTime() - now.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    // Determine Landed vs Pre-flight phase
    const isLanded = now.getTime() > (depTime.getTime() + 45 * 60 * 1000);

    // Find associated transfer in timelineEvents
    const associatedTransferEvent = timelineEvents.find(e => {
      if (e.type !== 'transfer') return false;
      const t = e.payload;
      if (!t) return false;
      const tPickupTime = e.datetime;
      
      const timeDiffHours = (tPickupTime.getTime() - arrTime.getTime()) / (3600 * 1000);
      const isTimeClose = timeDiffHours >= -2 && timeDiffHours <= 8; // pickup within 8 hours of arrival
      
      const arrLoc = (nextFlight.arrival_location || '').toLowerCase();
      const pickLoc = (t.pickup_location || '').toLowerCase();
      
      const isLocMatch = pickLoc.includes(arrLoc) || 
                         arrLoc.includes(pickLoc) ||
                         (tPickupTime.toDateString() === arrTime.toDateString());
      
      return isTimeClose && isLocMatch;
    });
    const associatedTransfer = associatedTransferEvent?.payload;

    // Find associated hotel stay in timelineEvents
    const associatedHotelEvent = timelineEvents.find(e => {
      if (e.type !== 'hotel_checkin') return false; // check-in
      const h = e.payload;
      if (!h) return false;
      const checkinDate = e.datetime;
      return checkinDate.toDateString() === arrTime.toDateString() ||
             Math.abs(checkinDate.getTime() - arrTime.getTime()) < 36 * 60 * 60 * 1000;
    });
    const associatedHotel = associatedHotelEvent?.payload;

    // Find transfer voucher document inside associatedTransferEvent's documents
    const transferVoucher = associatedTransferEvent?.documents?.find((d: any) => 
      !d.deleted_at && (d.related_transfer_id === associatedTransfer.id || 
      (associatedTransfer.booking_reference && d.booking_reference === associatedTransfer.booking_reference))
    ) || null;

    let state: 'preparation' | 'go_to_airport' | 'boarding_soon' | 'final_call' | 'landed' = 'preparation';
    let statusText = 'Preparación de viaje';
    let statusColor = 'bg-accent/10 text-accent border-accent/20';

    if (isLanded) {
      state = 'landed';
      statusText = associatedTransfer ? 'Traslado preparado' : 'Llegada a destino';
      statusColor = 'bg-green-500/10 text-green-500 border-green-500/20';
    } else {
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
    }

    // Find boarding pass inside nextFlightEvent's documents
    const boardingPass = nextFlightEvent?.documents?.find((d: any) => 
      (d.document_type === 'boarding_pass' || d.title.toLowerCase().includes('tarjeta'))
    ) || null;

    return {
      flight: nextFlight,
      state,
      statusText,
      statusColor,
      diffMin,
      boardingPass,
      associatedTransfer,
      associatedHotel,
      transferVoucher,
      isLanded
    };
  }, [timelineEvents]);

  useEffect(() => {
    if (airportMode && (airportMode.diffMin < 360 || airportMode.isLanded) && !showAirportFullView) {
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

  const enrichedRecommendations = useMemo(() => {
    const list = [...(liveStatus?.recommendations || [])];
    
    const isEuroPCRContext = activePlan?.contexts?.name?.toLowerCase().includes('europcr') || 
                             activePlan?.contexts?.name?.toLowerCase().includes('parís') || 
                             activePlan?.contexts?.name?.toLowerCase().includes('paris') ||
                             selectedContext?.name?.toLowerCase().includes('paris') ||
                             selectedContext?.name?.toLowerCase().includes('parís');

    if (isEuroPCRContext) {
      list.unshift(
        {
          id: 'europcr-rain',
          title: 'Tráfico EuroPCR & Clima París',
          message: 'Lluvia prevista en París (18:00h). Tráfico denso en Palais des Congrès. Sal con +15 min de antelación y considera pedir Taxi G7.',
          priority: 'high',
          type: 'departure'
        },
        {
          id: 'europcr-access',
          title: 'Afluencia Palais des Congrès',
          message: 'Demoras detectadas en accesos. Recomendamos usar el Acceso B del Palais para agilizar el ingreso hoy.',
          priority: 'medium',
          type: 'operational'
        }
      );
    }
    return list;
  }, [liveStatus, activePlan, selectedContext]);

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
            isAdmin={isAdmin}
            onClose={() => setShowAirportFullView(false)}
            onOpenSupport={(entity) => {
              setShowAirportFullView(false);
              handleOpenSupport(entity);
            }}
            onAction={(action, payload) => {
              if (action === 'maps') {
                setShowAirportFullView(false);
                setShowMap(true);
              }
              if (action === 'contact') handleAssistantMessage('Necesito contactar con mi coordinador de viaje');
              if (action === 'docs') {
                const docUrl = payload?.file_url || airportMode.boardingPass?.file_url || activePlan?.documents[0]?.file_url;
                if (docUrl) window.open(docUrl, '_blank');
              }
              if (action === 'associate') {
                router.push(`/admin/plans?plan_id=${activePlan?.id}`);
              }
            }}
          />
        )}
      </AnimatePresence>
      
      {isPreviewMode && (
        <div className="bg-accent/10 border-b border-accent/20 px-6 py-2 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-accent">
              Modo Supervisión: {previewUser?.name} {previewUser?.surname}
            </span>
          </div>
          <button 
            onClick={() => router.push('/admin/users')}
            className="text-[9px] font-black uppercase tracking-widest bg-accent text-white px-3 py-1 rounded-full hover:scale-105 transition-transform"
          >
            Volver a Admin
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {sharedMeetingPoint && (
          <div className="max-w-xl mx-auto px-6 pt-6">
            <div className="p-4.5 rounded-[2rem] bg-accent/10 border border-accent/20 flex items-center justify-between gap-4 backdrop-blur-md animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-accent/25 flex items-center justify-center text-accent shrink-0 animate-pulse">
                  <MapPin size={18} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[9px] font-black uppercase text-accent tracking-widest leading-none">Punto de Encuentro Compartido</p>
                  <h4 className="text-xs font-bold text-white mt-1 leading-tight line-clamp-1">
                    {sharedMeetingPoint.user} compartió: {sharedMeetingPoint.name}
                  </h4>
                  <p className="text-[10px] text-muted mt-0.5 font-medium">
                    {sharedMeetingMetrics ? (
                      sharedMeetingMetrics.km < 0.05 
                        ? 'Estás en el punto de encuentro' 
                        : `${sharedMeetingPoint.user} está a ${sharedMeetingMetrics.etaMin} min andando (${sharedMeetingMetrics.km} km)`
                    ) : (
                      'Esperando señal GPS para calcular distancia...'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setSelectedMapLocId('shared-meeting-point');
                    setActiveTab('map');
                  }}
                  className="text-[9px] font-black uppercase tracking-widest bg-accent text-white px-3.5 py-2.5 rounded-xl hover:opacity-95 transition-all shadow-md active:scale-95"
                >
                  Ver
                </button>
                <button
                  onClick={() => {
                    setSharedMeetingPoint(null);
                    window.history.replaceState({}, '', '/dashboard');
                  }}
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-muted hover:text-white transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        <motion.div 
          key={activeTab}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-xl mx-auto px-6 py-10"
        >
          {activeTab === 'home' && (
            <div className="space-y-8">
              {/* HEADER CONCIERGE */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-[#00D1FF] uppercase tracking-[0.3em]">
                      {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                    </p>
                    <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-2">
                      <MapPin size={24} className="text-[#00D1FF]" />
                      {selectedContext?.name || activePlan?.contexts?.name || 'París'}
                    </h1>
                  </div>
                  
                  {/* General Status Pill */}
                  {(() => {
                    const hasCriticalAlerts = alerts.some(a => !a.read_at && (a.title.toLowerCase().includes('urgente') || a.title.toLowerCase().includes('atención') || a.title.toLowerCase().includes('pendiente')));
                    let statusLabel = "Todo bajo control";
                    let statusColor = "text-[#00D1FF] bg-[#00D1FF]/10 border-[#00D1FF]/20";
                    if (hasCriticalAlerts) {
                      statusLabel = "Atención requerida";
                      statusColor = "text-red-400 bg-red-400/10 border-red-400/20";
                    } else if (nextAction) {
                      const diffMs = nextAction.datetime.getTime() - new Date().getTime();
                      const diffHours = diffMs / (3600 * 1000);
                      if (diffHours > 0 && diffHours <= 2) {
                        statusLabel = "Próxima acción";
                        statusColor = "text-amber-400 bg-amber-400/10 border-amber-400/20";
                      }
                    }
                    return (
                      <span className={cn("px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm transition-all", statusColor)}>
                        {statusLabel}
                      </span>
                    );
                  })()}
                </div>

                {/* EuroPCR Companion Promo Card */}
                <div 
                  onClick={() => router.push('/europcr')}
                  className="p-5 rounded-[2.5rem] bg-gradient-to-r from-[#00D1FF]/10 to-[#A855F7]/10 border border-[#00D1FF]/25 shadow-2xl flex items-center justify-between gap-4 cursor-pointer hover:scale-[1.02] transition-transform backdrop-blur-md relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#00D1FF]/5 rounded-full blur-xl group-hover:scale-125 transition-transform" />
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-[#00D1FF]/20 border border-[#00D1FF]/30 flex items-center justify-center text-[#00D1FF] shrink-0 animate-pulse">
                      <Sparkles size={20} />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase text-[#00D1FF] tracking-widest bg-[#00D1FF]/15 px-2 py-0.5 rounded-full">Modo Congreso Activo</span>
                      </div>
                      <h4 className="text-sm font-black text-white mt-1.5 tracking-tight leading-tight">EuroPCR 2026 Companion</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Asistente en vivo para Palais des Congrès, stands, hotspots médicos y alertas.</p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-[#00D1FF] shrink-0 group-hover:translate-x-1 transition-transform" />
                </div>

                {/* Evento Activo Ahora */}
                {(() => {
                  const now = new Date();
                  const activeEvent = timelineEvents.find(e => {
                    const start = new Date(e.datetime);
                    const end = e.payload?.end_datetime ? new Date(e.payload.end_datetime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
                    return now >= start && now <= end;
                  });
                  if (!activeEvent) return null;
                  return (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface/30 border border-[#00D1FF]/20 backdrop-blur-xl animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-[#00D1FF]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#00D1FF]">Evento Activo Ahora:</span>
                      <span className="text-xs font-medium text-white">{activeEvent.title}</span>
                    </div>
                  );
                })()}

                {/* TELEMETRÍA EN VIVO (CLIMA Y TRÁFICO) */}
                {(liveStatus || userLocation !== undefined) && (
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {/* GPS Telemetry status */}
                    {userLocation ? (
                      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#00D1FF]/5 border border-[#00D1FF]/20 text-xs text-[#00D1FF] backdrop-blur-md shadow-sm">
                        <span>🛰️</span>
                        <span className="font-bold">GPS Activo</span>
                        {userLocation.accuracy !== undefined && (
                          <span className="opacity-70">• +/- {Math.round(userLocation.accuracy)}m</span>
                        )}
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          if (typeof window !== 'undefined' && navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                              (pos) => {
                                setUserLocation({
                                  lat: pos.coords.latitude,
                                  lng: pos.coords.longitude,
                                  accuracy: pos.coords.accuracy
                                });
                              },
                              (err) => {
                                console.warn(err);
                                alert("Por favor, permite el acceso a la ubicación en el navegador para que podamos mostrar rutas y recomendaciones cerca de ti.");
                              },
                              { enableHighAccuracy: true, timeout: 10000 }
                            );
                          }
                        }}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 backdrop-blur-md shadow-sm animate-pulse hover:bg-red-500/20 transition-all text-left"
                      >
                        <span>🛰️</span>
                        <span className="font-bold">GPS Desactivado (Activar)</span>
                      </button>
                    )}

                    {liveStatus?.activeWeatherStatus && (
                      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/80 backdrop-blur-md shadow-sm">
                        <span className="text-sm">
                          {liveStatus.activeWeatherStatus.condition === 'RAIN' ? '🌧️' : 
                           liveStatus.activeWeatherStatus.condition === 'WINDY' ? '💨' : 
                           liveStatus.activeWeatherStatus.condition === 'HEAT_WAVE' ? '🔥' : 
                           liveStatus.activeWeatherStatus.condition === 'CLOUDY' ? '☁️' : '☀️'}
                        </span>
                        <span className="font-bold text-white">{liveStatus.activeWeatherStatus.temperatureCelsius}°C</span>
                        <span className="opacity-60 font-medium">• {liveStatus.activeWeatherStatus.description}</span>
                      </div>
                    )}
                    {liveStatus?.activeTrafficStatus && (
                      <div className={cn(
                        "flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs backdrop-blur-md font-medium shadow-sm",
                        liveStatus.activeTrafficStatus.congestionLevel === 'HEAVY' 
                          ? "bg-red-500/10 border-red-500/20 text-red-400" 
                          : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      )}>
                        <span>🚗</span>
                        <span className="font-bold">Tráfico {liveStatus.activeTrafficStatus.congestionLevel === 'HEAVY' ? 'Intenso' : 'Moderado'}</span>
                        <span>• ETA +{liveStatus.activeTrafficStatus.delayMinutes} min</span>
                      </div>
                    )}
                  </div>
                )}

                {/* LIVE TRAVEL ENGINE RECOMMENDATIONS */}
                {enrichedRecommendations && enrichedRecommendations.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {enrichedRecommendations.slice(0, 3).map((rec: any) => {
                      let priorityColor = "bg-[#00D1FF]/5 border-[#00D1FF]/20 text-[#00D1FF]";
                      if (rec.priority === 'urgent') {
                        priorityColor = "bg-red-500/5 border-red-500/20 text-red-400";
                      } else if (rec.priority === 'high') {
                        priorityColor = "bg-amber-500/5 border-amber-500/20 text-amber-400";
                      }

                      let RecIcon = Sparkles;
                      if (rec.type === 'departure') RecIcon = Clock;
                      else if (rec.type === 'transport') RecIcon = Car;
                      else if (rec.type === 'operational') RecIcon = Plane;

                      return (
                        <div key={rec.id} className={cn("p-4 rounded-2xl border backdrop-blur-md flex items-start gap-3.5 shadow-sm transition-all text-left", priorityColor)}>
                          <div className="p-2.5 rounded-xl bg-white/5 shrink-0 text-[#00D1FF]">
                            <RecIcon size={16} />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{rec.title}</p>
                              {rec.priority === 'urgent' && (
                                <span className="px-1.5 py-0.5 rounded-md bg-red-500/20 text-[7px] font-black uppercase tracking-widest text-red-400">Crítico</span>
                              )}
                            </div>
                            <p className="text-xs text-white/90 leading-relaxed font-medium">{rec.message}</p>
                            {rec.actionLabel && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (rec.actionUrl === 'coordinator_call') {
                                    const phone = activePlan?.logistic_contact?.phone;
                                    if (phone) window.open(`tel:${phone}`);
                                  } else if (rec.actionUrl === 'show_boarding_pass') {
                                    const doc = activePlan?.documents?.find((d: any) => d.document_type === 'boarding_pass');
                                    if (doc) window.open(doc.file_url, '_blank');
                                  } else if (rec.actionUrl?.startsWith('http')) {
                                    window.open(rec.actionUrl, '_blank');
                                  } else {
                                    router.push(rec.actionUrl);
                                  }
                                }}
                                className="mt-2 text-[9px] font-black uppercase tracking-widest text-[#00D1FF] hover:underline flex items-center gap-1"
                              >
                                {rec.actionLabel}
                                <ArrowRight size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Alertas urgentes de hoy */}
                {alerts.filter(a => !a.read_at).length > 0 && (
                  <div className="space-y-2">
                    {alerts.filter(a => !a.read_at).slice(0, 2).map(alert => (
                      <div key={alert.id} className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 backdrop-blur-md flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="text-red-400 shrink-0" size={16} />
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Alerta</p>
                            <p className="text-xs font-bold text-white">{alert.title}</p>
                          </div>
                        </div>
                        <button 
                          onClick={async () => {
                            await markAlertAsReadAction(alert.id);
                            const updated = alerts.map(a => a.id === alert.id ? { ...a, read_at: new Date().toISOString() } : a);
                            setAlerts(updated);
                          }}
                          className="text-[9px] font-black uppercase tracking-widest text-muted hover:text-white transition-colors"
                        >
                          Entendido
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* MINI MAPA EN VIVO OPERACIONAL */}
                <TodayMiniMap 
                  activePlan={activePlan} 
                  nextAction={nextAction} 
                  onExpand={(locationId) => {
                    setSelectedMapLocId(locationId);
                    setActiveTab('map');
                  }}
                />
              </div>

              {/* PRÓXIMA ACCIÓN */}
              {nextAction ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 px-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">Siguiente Acción</h3>
                    <div className="flex-1 h-px bg-accent/20" />
                  </div>

                  <motion.div 
                    variants={itemVariants}
                    className="p-8 rounded-[2.5rem] bg-foreground text-background shadow-2xl relative overflow-hidden group active:scale-[0.98] transition-all cursor-pointer border border-[#00D1FF]/10 hover:border-[#00D1FF]/40"
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
                        <div className="px-3 py-1 rounded-full bg-[#00D1FF] text-white text-[9px] font-black uppercase tracking-widest">
                          {nextAction.type === 'flight' ? 'Vuelo' : 
                           nextAction.type === 'transfer' ? 'Traslado' : 
                           nextAction.type === 'hotel_checkin' ? 'Check-in Hotel' : 
                           nextAction.type === 'hotel_checkout' ? 'Check-out Hotel' : 
                           nextAction.type === 'dinner' ? 'Cena' : 
                           nextAction.type === 'agenda' ? 'Sesión' : 'Actividad'}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Hoy • {nextAction.time}</span>
                      </div>
                       <div className="space-y-2">
                        <h3 className="text-3xl font-black tracking-tighter leading-none">{nextAction.title}</h3>
                        <p className="text-xs font-semibold opacity-60 flex items-center gap-2">
                          <MapPin size={14} className="text-[#00D1FF]" />
                          {nextAction.location}
                        </p>
                        {smartDeparture && (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-background/10 text-background text-[9px] font-black uppercase tracking-wider border border-background/20 mt-1">
                            <Zap size={10} className="animate-pulse" />
                            {smartDeparture.recommendationMessage}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-background/10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#00D1FF]/20 flex items-center justify-center text-[#00D1FF]">
                            <Navigation size={14} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest">Ver Detalles y Mapa</span>
                        </div>
                        <ArrowRight size={20} className="opacity-40 group-hover:translate-x-2 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                </div>
              ) : null}

              {/* TIMELINE DE HOY (Strict Filter) */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">Timeline de hoy</h3>
                    <div className="h-px w-12 bg-accent/20" />
                  </div>
                  <button 
                    onClick={() => setShowTimeline(true)}
                    className="text-[9px] font-black uppercase tracking-widest text-[#00D1FF] hover:underline transition-colors animate-pulse"
                  >
                    Ver Itinerario Completo
                  </button>
                </div>

                {activeDayEvents.length > 0 ? (
                  <div className="space-y-4">
                    {activeDayEvents.map((event, idx) => (
                      <div 
                        key={event.id}
                        className={cn(
                          "p-5 rounded-3xl bg-surface/30 border border-border/40 backdrop-blur-md flex flex-col gap-4 hover:bg-surface/50 transition-all cursor-pointer relative",
                          nextAction?.id === event.id && "border-[#00D1FF]/40 bg-surface/40 shadow-lg shadow-[#00D1FF]/5"
                        )}
                        onClick={() => {
                          setSelectedEvent(event);
                          setIsSheetOpen(true);
                        }}
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0", 
                            event.type.includes('flight') && 'bg-blue-500/20 text-blue-400',
                            event.type === 'transfer' && 'bg-amber-500/20 text-amber-400',
                            event.type.includes('hotel') && 'bg-emerald-500/20 text-emerald-400',
                            event.type === 'dinner' && 'bg-orange-500/20 text-orange-400',
                            event.type === 'agenda' && 'bg-emerald-400/20 text-emerald-300',
                            event.type === 'hospitality' && 'bg-[#00D1FF]/20 text-[#00D1FF]'
                          )}>
                            <event.icon size={20} />
                          </div>
                          
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted">{event.time}</span>
                              <div className="flex items-center gap-1.5">
                                {['flight', 'transfer', 'hospitality'].includes(event.type) && (
                                  <WalletBadge compact />
                                )}
                                {nextAction?.id === event.id && (
                                  <span className="px-2 py-0.5 rounded-full bg-[#00D1FF]/10 text-[#00D1FF] text-[8px] font-black uppercase tracking-widest">Siguiente</span>
                                )}
                              </div>
                            </div>
                            <h4 className="text-sm font-black text-white leading-tight">{event.title}</h4>
                            <p className="text-[11px] font-medium text-muted flex items-center gap-1.5">
                              <MapPin size={10} className="text-[#00D1FF]" />
                              {event.location}
                            </p>
                          </div>
                        </div>

                        {/* ACCIONES RÁPIDAS DEL EVENTO */}
                        {event.actions && event.actions.length > 0 && (
                          <div className="flex gap-2 pt-2 border-t border-white/5 overflow-x-auto no-scrollbar" onClick={e => e.stopPropagation()}>
                            {event.actions.slice(0, 3).map((act: any, aIdx: number) => {
                              const ActIcon = act.icon === 'FileText' ? FileText : 
                                              act.icon === 'Phone' || act.icon === 'PhoneCall' ? Phone : 
                                              act.icon === 'MapPin' || act.icon === 'Map' ? MapPin : 
                                              act.icon === 'Navigation' ? Navigation : Sparkles;
                              return (
                                <button
                                  key={aIdx}
                                  onClick={() => {
                                    if (act.type === 'document') window.open(act.value, '_blank');
                                    else if (act.type === 'call') window.open(act.value);
                                    else if (act.type === 'navigate' || act.type === 'map') window.open(act.value, '_blank');
                                    else if (act.type === 'copy') {
                                      navigator.clipboard.writeText(act.value);
                                      alert(`Copiado: "${act.value}"`);
                                    }
                                  }}
                                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-subtle border border-border/40 hover:bg-surface text-[9px] font-black uppercase tracking-widest text-muted hover:text-white transition-colors"
                                >
                                  <ActIcon size={12} className="text-[#00D1FF]" />
                                  {act.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* EMPTY STATE DE HOY */
                  <div className="p-12 rounded-[2.5rem] bg-surface/10 border border-dashed border-border/50 flex flex-col items-center text-center gap-5 backdrop-blur-sm">
                    <div className="w-16 h-16 rounded-[2rem] bg-surface/30 border border-border/40 flex items-center justify-center text-muted/30">
                      <CalendarRange size={32} className="text-[#00D1FF]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-muted uppercase tracking-[0.25em]">Hoy</p>
                      <h4 className="text-sm font-black text-white">Hoy no tienes acciones programadas</h4>
                      <p className="text-[11px] text-muted max-w-[240px] mx-auto leading-relaxed">Tu agenda está totalmente libre para hoy en esta ciudad.</p>
                    </div>
                    <button 
                      onClick={() => setShowTimeline(true)}
                      className="px-6 py-3.5 rounded-2xl bg-[#00D1FF] text-white hover:opacity-95 font-black uppercase tracking-widest text-[9px] shadow-lg shadow-[#00D1FF]/20 active:scale-95 transition-all"
                    >
                      Ver itinerario completo
                    </button>
                  </div>
                )}
              </div>

              {/* ACCIONES RÁPIDAS GENERALES */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 px-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">Acciones Rápidas</h3>
                  <div className="flex-1 h-px bg-accent/20" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Boarding Pass */}
                  {(() => {
                    const todayFlight = timelineEvents.find(e => e.type === 'flight' && e.datetime.toLocaleDateString('en-CA') === getTodayStr());
                    const doc = todayFlight?.documents?.find((d: any) => d.document_type === 'boarding_pass' || d.title.toLowerCase().includes('tarjeta')) || 
                                activePlan?.documents?.find((d: any) => d.document_type === 'boarding_pass');
                    return (
                      <button 
                        onClick={() => {
                          if (doc) {
                            if (doc.qr_code || doc.qr_raw_payload) {
                              setSelectedQR({ ...doc, flight: todayFlight?.payload || {} });
                            } else {
                              window.open(doc.file_url, '_blank');
                            }
                          } else {
                            alert('No se ha encontrado ninguna tarjeta de embarque activa en tus documentos de hoy.');
                          }
                        }}
                        disabled={!doc}
                        className={cn(
                          "p-4 rounded-2xl bg-surface/30 border border-border/40 flex flex-col items-center justify-center gap-2 hover:bg-surface/50 transition-all",
                          !doc && "opacity-40 cursor-not-allowed hover:bg-surface/30"
                        )}
                      >
                        <Ticket size={18} className={cn("text-[#00D1FF]", !doc && "text-muted")} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted text-center leading-none">Tarjeta de Embarque</span>
                      </button>
                    );
                  })()}

                  {/* Mapa Live */}
                  <button 
                    onClick={() => setShowMap(true)}
                    className="p-4 rounded-2xl bg-surface/30 border border-[#00D1FF]/30 hover:border-[#00D1FF]/70 flex flex-col items-center justify-center gap-2 hover:bg-surface/50 transition-all relative overflow-hidden group shadow-lg shadow-[#00D1FF]/5"
                  >
                    <div className="absolute inset-0 bg-[#00D1FF]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Navigation size={18} className="text-[#00D1FF] animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#00D1FF] text-center leading-none">Mapa Live</span>
                  </button>


                  {/* Contactar coordinador */}
                  <button 
                    onClick={() => {
                      const coord = activePlan?.logistic_contact;
                      if (coord?.whatsapp) {
                        window.open(`https://wa.me/${coord.whatsapp.replace(/\+/g, '')}`, '_blank');
                      } else if (coord?.phone) {
                        window.open(`tel:${coord.phone}`);
                      } else {
                        handleAssistantMessage('Necesito contactar con mi coordinador de viaje');
                      }
                    }}
                    className="p-4 rounded-2xl bg-surface/30 border border-border/40 flex flex-col items-center justify-center gap-2 hover:bg-surface/50 transition-all"
                  >
                    <Phone size={18} className="text-[#00D1FF]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted text-center leading-none">Coordinador</span>
                  </button>

                  {/* Ver documentos */}
                  <button 
                    onClick={() => {
                      if (activePlan?.documents && activePlan.documents.length > 0) {
                        setSelectedEvent({
                          title: "Documentación de Viaje",
                          location: "Archivos y Vouchers Oficiales",
                          description: "Aquí tienes acceso a toda la documentación digitalizada para tu viaje.",
                          type: "documents_list"
                        });
                        setIsSheetOpen(true);
                      } else {
                        alert('No se encontraron documentos en este dossier.');
                      }
                    }}
                    className="p-4 rounded-2xl bg-surface/30 border border-border/40 flex flex-col items-center justify-center gap-2 hover:bg-surface/50 transition-all"
                  >
                    <FileText size={18} className="text-[#00D1FF]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted text-center leading-none">Documentos</span>
                  </button>

                  {/* Cerca de mí */}
                  <button 
                    onClick={() => router.push('/near-me')}
                    className="p-4 rounded-2xl bg-surface/30 border border-border/40 flex flex-col items-center justify-center gap-2 hover:bg-surface/50 transition-all"
                  >
                    <Compass size={18} className="text-[#00D1FF]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted text-center leading-none">Cerca de mí</span>
                  </button>

                  {/* Asistente IA */}
                  <button 
                    onClick={() => setActiveTab('assistant')}
                    className="p-4 rounded-2xl bg-surface/30 border border-border/40 flex flex-col items-center justify-center gap-2 hover:bg-surface/50 transition-all"
                  >
                    <Sparkles size={18} className="text-[#00D1FF]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted text-center leading-none">Asistente IA</span>
                  </button>

                  {/* Estoy aquí */}
                  <button 
                    onClick={() => setIsShareLocationOpen(true)}
                    className="p-4 rounded-2xl bg-surface/30 border border-border/40 flex flex-col items-center justify-center gap-2 hover:bg-surface/50 transition-all"
                  >
                    <MapPin size={18} className="text-[#00D1FF]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted text-center leading-none">Estoy aquí</span>
                  </button>

                  {/* EuroPCR Companion */}
                  <button 
                    onClick={() => router.push('/europcr')}
                    className="p-4 rounded-2xl bg-accent/5 border border-[#00D1FF]/30 flex flex-col items-center justify-center gap-2 hover:bg-accent/10 hover:border-[#00D1FF]/60 transition-all group relative overflow-hidden"
                  >
                    <Activity size={18} className="text-[#00D1FF] animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#00D1FF] text-center leading-none">Modo EuroPCR</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'map' && (
            <motion.div variants={itemVariants} className="w-full">
              <LiveMapTab 
                activePlan={activePlan}
                timelineEvents={timelineEvents}
                planRoutes={planRoutes}
                smartDeparture={smartDeparture}
                nextAction={nextAction}
                initialSelectedLocationId={selectedMapLocId}
                onClose={() => setActiveTab('home')}
                onOpenSupport={handleOpenSupport}
              />
            </motion.div>
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
                    <div key={idx} className={cn("flex flex-col gap-2 w-full max-w-[85%]", msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start")}>
                      {/* Context Alert Banner (if present in message) */}
                      {msg.role === 'assistant' && msg.alert && (
                        <div className="w-full bg-amber-500/10 border border-amber-500/20 px-4 py-3 rounded-2xl flex items-center gap-2.5 text-left mb-1 animate-pulse">
                          <AlertTriangle className="text-amber-500 shrink-0" size={14} />
                          <span className="text-[10px] font-bold text-amber-400 tracking-wide uppercase">{msg.alert}</span>
                        </div>
                      )}
                      
                      {/* Main Message Bubble */}
                      <div className={cn(
                        "p-5 rounded-[2rem] w-full text-left", 
                        msg.role === 'user' ? "bg-accent text-white shadow-lg shadow-accent/20" : "bg-surface/50 border border-border/40 backdrop-blur-md"
                      )}>
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>

                      {/* City Companion Card (if places are suggested) */}
                      {msg.role === 'assistant' && msg.places && msg.places.length > 0 && (
                        <div className="space-y-4 w-full mt-2 animate-in fade-in slide-in-from-bottom-3 duration-300">
                          {msg.places.map((place: any, pIdx: number) => {
                            const mapLoc: any = {
                              id: `poi-${idx}-${pIdx}`,
                              name: place.name,
                              type: 'restaurant', // maps to a nice colored pin marker
                              coordinates: { lat: place.latitude, lng: place.longitude },
                              address: place.address
                            };

                            return (
                              <div key={pIdx} className="bg-[#111115]/90 border border-white/10 rounded-[2.2rem] overflow-hidden shadow-xl w-full">
                                {/* Map Preview */}
                                <div className="h-40 w-full relative bg-[#09090A]">
                                  <LiveMap 
                                    locations={[mapLoc]} 
                                    activeLocationId={mapLoc.id}
                                    showUserLocation={true}
                                    showRoutes={true}
                                    interactive={false}
                                    hideInternalUI={true}
                                    className="w-full h-full"
                                  />
                                  {place.distance_km !== undefined && (
                                    <div className="absolute top-3 left-3 bg-[#0D0D11]/90 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[8px] font-black text-accent uppercase tracking-wider z-[10]">
                                      A {place.distance_km} km de ti
                                    </div>
                                  )}
                                </div>

                                <div className="p-5 space-y-3.5 text-left">
                                  <div>
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className="text-sm font-black text-white leading-tight">{place.name}</h4>
                                      <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-lg border border-yellow-500/20 text-[9px] font-black">
                                        <Star size={10} fill="currentColor" />
                                        {place.rating}
                                      </div>
                                    </div>
                                    <p className="text-[10px] text-muted font-medium mt-1 leading-tight line-clamp-1">{place.address}</p>
                                    {place.hours && (
                                      <p className="text-[8px] text-accent font-black uppercase tracking-widest mt-1">{place.hours}</p>
                                    )}
                                  </div>

                                  <p className="text-xs text-muted leading-relaxed font-medium">{place.description}</p>

                                  {/* Mobility Metrics */}
                                  {place.walking_time_min !== undefined && (
                                    <div className="grid grid-cols-4 gap-2 border-t border-white/5 pt-3">
                                      <div className="bg-[#111115]/50 p-2 rounded-xl border border-white/5 flex flex-col items-center">
                                        <span className="text-[7px] font-black text-muted uppercase tracking-wider">Andando</span>
                                        <span className="text-xs font-bold text-white mt-0.5">{place.walking_time_min}m</span>
                                      </div>
                                      <div className="bg-[#111115]/50 p-2 rounded-xl border border-white/5 flex flex-col items-center">
                                        <span className="text-[7px] font-black text-muted uppercase tracking-wider">Coche</span>
                                        <span className="text-xs font-bold text-white mt-0.5">{place.driving_time_min}m</span>
                                      </div>
                                      <div className="bg-[#111115]/50 p-2 rounded-xl border border-white/5 flex flex-col items-center">
                                        <span className="text-[7px] font-black text-muted uppercase tracking-wider">Metro</span>
                                        <span className="text-xs font-bold text-white mt-0.5">{place.transit_time_min}m</span>
                                      </div>
                                      <div className="bg-[#111115]/50 p-2 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                                        <span className="text-[7px] font-black text-muted uppercase tracking-wider leading-none">Uber</span>
                                        <span className="text-[9px] font-bold text-accent mt-1 leading-none">{place.uber_price_range}</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Actions */}
                                  <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-white/5">
                                    <button 
                                      onClick={() => {
                                        setSelectedEvent({
                                          title: place.name,
                                          location: place.address,
                                          type: 'place',
                                          payload: {
                                            name: place.name,
                                            vicinity: place.address,
                                            geometry: {
                                              location: {
                                                lat: () => place.latitude,
                                                lng: () => place.longitude
                                              }
                                            }
                                          }
                                        });
                                        setIsSheetOpen(true);
                                      }}
                                      className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-[7px] font-black uppercase text-white hover:bg-white/10 transition-colors"
                                    >
                                      <Map size={9} className="text-accent mb-0.5" />
                                      Detalles
                                    </button>
                                    
                                    <button 
                                      onClick={() => {
                                        const url = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
                                        window.open(url, '_blank');
                                      }}
                                      className="w-full py-2.5 rounded-xl bg-[#00D1FF]/10 border border-[#00D1FF]/30 text-[#00D1FF] flex flex-col items-center justify-center text-[7px] font-black uppercase hover:bg-[#00D1FF]/20 transition-all"
                                    >
                                      <Navigation size={9} className="mb-0.5" />
                                      Google Maps
                                    </button>

                                    <button 
                                      onClick={() => {
                                        const url = `maps://?daddr=${place.latitude},${place.longitude}`;
                                        window.open(url, '_blank');
                                      }}
                                      className="w-full py-2.5 rounded-xl bg-white/10 border border-white/20 text-white flex flex-col items-center justify-center text-[7px] font-black uppercase hover:bg-white/20 transition-all"
                                    >
                                      <Navigation size={9} className="mb-0.5 text-emerald-400" />
                                      Apple Maps
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
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
                  onClick={logout}
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
            { id: 'map', label: 'Mapa', icon: Map },
            { id: 'near-me', label: 'Cerca de mí', icon: Compass },
            { id: 'assistant', label: 'Asistente', icon: Sparkles },
            { id: 'profile', label: 'Perfil', icon: User },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'near-me') {
                  router.push('/near-me');
                } else {
                  setActiveTab(tab.id as any);
                }
              }}
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
            {selectedEvent?.type === 'documents_list' && (
              <div className="space-y-3 w-full max-h-[300px] overflow-y-auto no-scrollbar">
                {activePlan?.documents.map((doc: any) => (
                  <div key={doc.id} className="p-3.5 rounded-xl bg-surface-subtle border border-border flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <FileText size={16} className="text-[#00D1FF]" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-white leading-tight">{doc.title}</p>
                        <p className="text-[9px] text-muted">{doc.document_type || 'Archivo'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => window.open(doc.file_url, '_blank')}
                      className="px-3.5 py-1.5 rounded-lg bg-surface hover:bg-surface-subtle border border-border text-[9px] font-black uppercase tracking-widest text-white transition-colors"
                    >
                      Abrir
                    </button>
                  </div>
                ))}
              </div>
            )}

            
            {selectedEvent?.type === 'flight' && (() => {
              const doc = activePlan?.documents.find(d => 
                d.related_flight_id === selectedEvent.payload.id && 
                (d.document_type === 'boarding_pass' || d.title.toLowerCase().includes('tarjeta'))
              ) || activePlan?.documents.find(d => 
                d.related_flight_id === selectedEvent.payload.id
              );
              return (
                <div className="space-y-3 w-full">
                  <button 
                    onClick={() => {
                      if (doc) setSelectedQR({ ...doc, flight: selectedEvent.payload });
                      setIsSheetOpen(false);
                    }}
                    className="w-full py-5 rounded-2xl bg-foreground text-background font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3"
                  >
                    <QrCode size={18} />
                    Ver Código QR
                  </button>
                  {doc?.file_url && (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-5 rounded-2xl bg-background border border-border text-foreground hover:bg-muted font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all"
                    >
                      <FileText size={18} className="text-accent" />
                      Ver PDF Original
                    </a>
                  )}
                </div>
              );
            })()}

            {/* TRANSFER PREMIUM CARD */}
            {selectedEvent?.type === 'transfer' && (() => {
              const t = selectedEvent.payload;
              const transferDoc = activePlan?.documents.find(d => 
                d.related_transfer_id === t.id
              );
              // Parse meeting point from notes if not a direct field
              const meetingPoint = t.meeting_point || (() => {
                if (!t.notes) return null;
                const m = t.notes.match(/📍 Meeting Point:\s*(.+)/);
                return m ? m[1] : null;
              })();
              const supportPhone = t.support_phone || (() => {
                if (!t.notes) return null;
                const m = t.notes.match(/📞 Soporte:\s*(.+)/);
                return m ? m[1] : null;
              })();
              
              return (
                <div className="space-y-4 w-full">
                  {/* Route card */}
                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-muted uppercase tracking-widest">Recogida</p>
                        <p className="text-sm font-bold text-foreground">
                          {t.pickup_airport_code ? `${t.pickup_airport_code} · ` : ''}{t.pickup_location}
                        </p>
                      </div>
                    </div>
                    <div className="ml-1 border-l-2 border-dashed border-amber-500/30 h-4" />
                    <div className="flex items-center gap-3 mt-1">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-muted uppercase tracking-widest">Destino</p>
                        <p className="text-sm font-bold text-foreground">
                          {t.destination_name || t.dropoff_location}
                        </p>
                        {t.destination_name && t.dropoff_location && t.destination_name !== t.dropoff_location && (
                          <p className="text-[10px] text-muted">{t.dropoff_location}</p>
                        )}
                      </div>
                    </div>
                  </div>

                   {/* Vehicle, Passengers & Operational Details */}
                   <div className="grid grid-cols-2 gap-3">
                     {t.vehicle_type && (
                       <div className="p-3 rounded-2xl bg-surface-subtle border border-border">
                         <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Vehículo</p>
                         <p className="text-sm font-bold text-foreground">🚗 {t.vehicle_type}</p>
                       </div>
                     )}
                     {t.booking_reference && (
                       <div className="p-3 rounded-2xl bg-surface-subtle border border-border">
                         <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Referencia</p>
                         <p className="text-sm font-bold text-foreground">{t.booking_reference}</p>
                       </div>
                     )}
                     {t.passengers && (
                       <div className="p-3 rounded-2xl bg-surface-subtle border border-border">
                         <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Pasajeros</p>
                         <p className="text-sm font-bold text-foreground">👥 {t.passengers} Pax</p>
                       </div>
                     )}
                     {t.luggage && (
                       <div className="p-3 rounded-2xl bg-surface-subtle border border-border">
                         <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Equipaje</p>
                         <p className="text-sm font-bold text-foreground">🧳 {t.luggage}</p>
                       </div>
                     )}
                     {t.passenger_name && (
                       <div className="p-3 rounded-2xl bg-surface-subtle border border-border col-span-2">
                         <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Pasajero Principal</p>
                         <p className="text-xs font-bold text-foreground">{t.passenger_name} {t.passenger_phone ? `(${t.passenger_phone})` : ''}</p>
                       </div>
                     )}
                     {(t.airline || t.flight_number) && (
                       <div className="p-3 rounded-2xl bg-surface-subtle border border-border col-span-2">
                         <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Vuelo Asociado</p>
                         <p className="text-xs font-bold text-foreground">✈ {t.airline || ''} {t.flight_number || ''}</p>
                       </div>
                     )}
                   </div>

                  {/* Meeting Point */}
                  {meetingPoint && (
                    <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">📍 Punto de Encuentro</p>
                      <p className="text-sm font-bold text-foreground">{meetingPoint}</p>
                    </div>
                  )}

                  {/* Driver info */}
                  {t.driver_name && (
                    <div className="p-4 rounded-2xl bg-surface-subtle border border-border flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-black text-sm">
                        {t.driver_name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-muted uppercase tracking-widest">Tu Chófer</p>
                        <p className="text-sm font-bold text-foreground">{t.driver_name}</p>
                      </div>
                      {t.driver_phone && (
                        <a href={`tel:${t.driver_phone}`} className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                          <Phone size={16} />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2.5 pt-2">
                    {transferDoc?.file_url && (
                      <a
                        href={transferDoc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-4 rounded-2xl bg-background border border-border text-foreground hover:bg-muted font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all shadow-sm"
                      >
                        <FileText size={16} className="text-amber-500" />
                        Ver voucher oficial
                      </a>
                    )}

                    {meetingPoint && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(meetingPoint);
                          alert(`📍 Punto de encuentro copiado:\n"${meetingPoint}"`);
                        }}
                        className="w-full py-4 rounded-2xl bg-blue-500/5 border border-blue-500/15 text-blue-400 hover:bg-blue-500/10 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all"
                      >
                        <MapPin size={16} />
                        Punto de encuentro
                      </button>
                    )}

                    {supportPhone && (
                      <a
                        href={`tel:${supportPhone}`}
                        className="w-full py-4 rounded-2xl bg-foreground text-background hover:opacity-90 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all"
                      >
                        <Phone size={16} />
                        Llamar asistencia
                      </a>
                    )}
                  </div>
                </div>
              );
            })()}

            {selectedEvent && ['flight', 'hospitality', 'transfer'].includes(selectedEvent.type) && (
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted">Disponible en Wallet</span>
                <WalletBadge />
              </div>
            )}
            {selectedEvent && (
              <AddPassButton 
                type={selectedEvent.type === 'flight' ? 'flight' : (selectedEvent.type === 'hospitality' ? 'hospitality' : 'transfer')}
                id={selectedEvent.payload.id}
                className="w-full py-5"
              />
            )}

            {(() => {
              const coords = getMobilityCoords(selectedEvent);
              if (!coords) return null;
              return (
                <MobilityActions 
                  destinationLat={coords.lat} 
                  destinationLng={coords.lng} 
                  destinationName={selectedEvent.title || 'Destino'} 
                  destinationAddress={selectedEvent.location}
                  className="mt-4"
                />
              );
            })()}

            {selectedEvent && selectedEvent.lat && selectedEvent.lng && (
              <button
                onClick={() => {
                  setSelectedMapLocId(selectedEvent.id);
                  setActiveTab('map');
                  setIsSheetOpen(false);
                }}
                className="w-full py-4 rounded-2xl bg-accent/20 border border-accent/30 text-accent hover:bg-accent/30 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all"
              >
                <Map size={16} />
                Ver en Mapa Inteligente
              </button>
            )}

            {selectedEvent && ['flight', 'hotel', 'transfer', 'restaurant', 'hospitality'].includes(selectedEvent.type) && (
              <button 
                onClick={() => {
                  setIsSheetOpen(false);
                  handleOpenSupport({
                    type: selectedEvent.type,
                    id: selectedEvent.id || selectedEvent.payload?.id || selectedEvent.payload?.travel_route_id,
                    name: selectedEvent.title
                  });
                }}
                className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
              >
                <AlertTriangle size={14} className="text-amber-400" />
                Reportar Problema
              </button>
            )}
          </div>
        </div>
      </BottomActionSheet>

      <ShareLocationDrawer 
        isOpen={isShareLocationOpen}
        onClose={() => setIsShareLocationOpen(false)}
        activePlan={activePlan}
      />

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
              <WalletBadge className="bg-black/5 text-black border-black/10" />
              <AddPassButton 
                type="flight" 
                id={selectedQR.flight.id} 
                className="w-full py-4 bg-slate-900 text-white border-none" 
              />
              {selectedQR.file_url && (
                <a
                  href={selectedQR.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 px-6 rounded-2xl bg-slate-100 text-slate-900 hover:bg-slate-200 transition-all font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 border border-slate-200 text-center"
                >
                  <FileText size={16} className="text-slate-600" />
                  Ver PDF Original
                </a>
              )}
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
                    <Bell className="text-[#00D1FF] shrink-0" size={24} />
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

      <AnimatePresence>
        {showTimeline && (
          <div className="fixed inset-0 z-[500] bg-background/80 backdrop-blur-md flex items-end">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="w-full bg-surface rounded-t-[3rem] p-8 max-h-[85vh] overflow-y-auto no-scrollbar">
              <div className="flex justify-between items-center mb-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-[#00D1FF] uppercase tracking-[0.3em]">Agenda Completa</p>
                  <h3 className="text-2xl font-black text-white tracking-tighter">Itinerario Completo</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setShowTimeline(false);
                      handleOpenSupport();
                    }}
                    className="px-4 py-2 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-[9px] font-black uppercase tracking-widest hover:bg-accent/20 transition-all font-bold"
                  >
                    Soporte
                  </button>
                  <button onClick={() => setShowTimeline(false)} className="p-2 bg-surface-subtle rounded-full text-muted hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div className="space-y-8">
                {timelineEvents.length > 0 ? (
                  <TimelineSection 
                    title="Cronología Completa" 
                    events={timelineEvents} 
                    onEventClick={(event: any) => {
                      setSelectedEvent(event);
                      setIsSheetOpen(true);
                      setShowTimeline(false);
                    }} 
                  />
                ) : (
                  <div className="p-12 rounded-[2.5rem] bg-surface/10 border border-dashed border-border/50 flex flex-col items-center text-center gap-4">
                    <Calendar size={32} className="text-muted/40" />
                    <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">No hay eventos programados en este plan</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <LiveMapExperience
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        activePlan={activePlan}
        liveStatus={liveStatus}
        timelineEvents={timelineEvents}
        userName={userName}
      />

      {/* Floating Support Action Button */}
      {['home', 'map', 'profile'].includes(activeTab) && !isSupportOpen && (
        <button
          onClick={() => handleOpenSupport()}
          className="fixed bottom-24 right-6 z-40 w-12 h-12 rounded-full bg-accent text-background flex items-center justify-center shadow-lg shadow-accent/20 border border-accent/30 hover:scale-105 active:scale-95 transition-all animate-in fade-in zoom-in duration-300"
          title="Soporte Concierge"
        >
          <MessageSquare size={20} className="stroke-[2.5]" />
        </button>
      )}

      {/* Support Concierge Drawer Panel */}
      <SupportPanel
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        activePlan={activePlan}
        profile={session.user as any}
        entityContext={supportEntityContext}
      />
    </div>
  );
}
