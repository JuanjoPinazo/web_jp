'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Plane, Building2, Utensils, Car, Navigation, 
  ChevronRight, X, Sparkles, Navigation2, Compass, Layers, 
  AlertCircle, Info, Calendar, Clock, Shield, ArrowRight,
  ExternalLink, Phone, MessageSquare, FileText, QrCode, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';

// Custom Marker Type Definition
export interface MapLocation {
  id: string;
  type: 'hotel' | 'congress' | 'restaurant' | 'hospitality' | 'transfer' | 'airport';
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  extra?: string;
  time?: string;
  payload?: any;
}

interface LiveMapExperienceProps {
  isOpen: boolean;
  onClose: () => void;
  activePlan: any;
  liveStatus: any;
  timelineEvents: any[];
  userName: string;
}

export function LiveMapExperience({ 
  isOpen, 
  onClose, 
  activePlan, 
  liveStatus, 
  timelineEvents,
  userName
}: LiveMapExperienceProps) {
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'insights' | 'airport'>('timeline');
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
    hotel: true,
    congress: true,
    airport: true,
    restaurant: true,
    hospitality: true,
    transfer: true,
    routes: true
  });
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const routesRef = useRef<any[]>([]);

  // 1. Gather all geo-enabled locations in this trip
  const locations = useMemo((): MapLocation[] => {
    if (!activePlan) return [];
    const list: MapLocation[] = [];

    // Context / Congress Sede
    const congress = activePlan.contexts;
    if (congress && congress.latitude && congress.longitude) {
      list.push({
        id: `congress-${congress.id}`,
        type: 'congress',
        name: congress.name || 'Sede del Congreso',
        address: congress.address || congress.location,
        latitude: Number(congress.latitude),
        longitude: Number(congress.longitude),
        extra: 'Sede Principal del Evento'
      });
    }

    // Hotels
    activePlan.hotel_stays?.forEach((h: any) => {
      if (!h.deleted_at && h.latitude && h.longitude) {
        list.push({
          id: `hotel-${h.id}`,
          type: 'hotel',
          name: h.hotel_name,
          address: h.address,
          latitude: Number(h.latitude),
          longitude: Number(h.longitude),
          extra: `Check-in: ${new Date(h.check_in).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`,
          payload: h
        });
      }
    });

    // Flights / Airports (derive airports from flight records)
    activePlan.flights?.forEach((f: any) => {
      if (!f.deleted_at) {
        if (f.departure_lat && f.departure_lng) {
          list.push({
            id: `airport-dep-${f.id}`,
            type: 'airport',
            name: `${f.departure_location || 'Aeropuerto'} (Origen)`,
            address: `Vuelo ${f.flight_number}`,
            latitude: Number(f.departure_lat),
            longitude: Number(f.departure_lng),
            extra: `Terminal ${f.departure_terminal || '—'}`
          });
        }
        if (f.arrival_lat && f.arrival_lng) {
          list.push({
            id: `airport-arr-${f.id}`,
            type: 'airport',
            name: `${f.arrival_location || 'Aeropuerto'} (Destino)`,
            address: `Vuelo ${f.flight_number}`,
            latitude: Number(f.arrival_lat),
            longitude: Number(f.arrival_lng),
            extra: `Terminal ${f.arrival_terminal || '—'}`
          });
        }
      }
    });

    // Restaurants
    activePlan.restaurants?.forEach((r: any) => {
      if (!r.deleted_at && r.latitude && r.longitude) {
        list.push({
          id: `restaurant-${r.id}`,
          type: 'restaurant',
          name: r.restaurant_name,
          address: r.address,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          extra: `Reserva: ${r.reservation_time ? new Date(r.reservation_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : 'Confirmada'}`
        });
      }
    });

    // Hospitality Events
    activePlan.hospitality_events?.forEach((e: any) => {
      if (!e.deleted_at && e.latitude && e.longitude) {
        list.push({
          id: `hospitality-${e.id}`,
          type: 'hospitality',
          name: e.venue_name || e.title,
          address: e.venue_address || e.location,
          latitude: Number(e.latitude),
          longitude: Number(e.longitude),
          extra: new Date(e.start_datetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
          payload: e
        });
      }
    });

    // Transfers
    activePlan.transfers?.forEach((t: any) => {
      if (!t.deleted_at) {
        if (t.pickup_lat && t.pickup_lng) {
          list.push({
            id: `transfer-pickup-${t.id}`,
            type: 'transfer',
            name: `Recogida: ${t.pickup_location}`,
            address: t.driver_name ? `Chófer: ${t.driver_name}` : 'Traslado Premium',
            latitude: Number(t.pickup_lat),
            longitude: Number(t.pickup_lng),
            extra: new Date(t.pickup_datetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
            payload: t
          });
        }
        if (t.dropoff_lat && t.dropoff_lng) {
          list.push({
            id: `transfer-dropoff-${t.id}`,
            type: 'transfer',
            name: `Destino: ${t.dropoff_location}`,
            address: t.booking_reference ? `Ref: ${t.booking_reference}` : 'Punto de Destino',
            latitude: Number(t.dropoff_lat),
            longitude: Number(t.dropoff_lng),
            extra: 'Llegada de Traslado'
          });
        }
      }
    });

    return list;
  }, [activePlan]);

  // Today Timeline Strict Filter
  const getTodayStr = () => {
    const d = new Date();
    // Simulate real context date if user is currently inside EuroPCR travel timeline in May 2026
    const simulatedDate = new Date('2026-05-19T08:00:00Z');
    return simulatedDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
  };

  const todayTimelineEvents = useMemo(() => {
    const todayStr = getTodayStr();
    return timelineEvents.filter(e => {
      const eventDate = new Date(e.start_datetime).toLocaleDateString('en-CA');
      return eventDate === todayStr;
    });
  }, [timelineEvents]);

  // Airport Mode Trigger check
  const airportModeData = useMemo(() => {
    if (!liveStatus?.activeFlightStatus && !activePlan?.flights?.[0]) return null;
    const flight = activePlan?.flights?.[0];
    const boardingPass = activePlan?.documents?.find((d: any) => d.document_type === 'boarding_pass');
    const associatedTransfer = activePlan?.transfers?.[0];
    const associatedHotel = activePlan?.hotel_stays?.[0];
    
    return {
      flight,
      statusText: liveStatus?.activeFlightStatus?.status || 'A Tiempo',
      statusColor: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      diffMin: liveStatus?.activeFlightStatus?.delayMinutes || 0,
      boardingPass,
      associatedTransfer,
      associatedHotel,
      isLanded: liveStatus?.activeFlightStatus?.status === 'LANDED' || false
    };
  }, [liveStatus, activePlan]);

  // 2. Load Leaflet Client Side
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    cssLink.crossOrigin = '';
    document.head.appendChild(cssLink);

    const jsScript = document.createElement('script');
    jsScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    jsScript.crossOrigin = '';
    jsScript.onload = () => {
      setLeafletLoaded(true);
    };
    document.head.appendChild(jsScript);
  }, []);

  // 3. Initialize Map & Render Vector Layers
  useEffect(() => {
    if (!leafletLoaded || !isOpen || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Create Map Instance if not existing
    if (!mapInstanceRef.current) {
      const defaultCenter = locations.length > 0 
        ? [locations[0].latitude, locations[0].longitude]
        : [48.8566, 2.3522]; // Paris default

      mapInstanceRef.current = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });

      // Add Ultra-Premium Dark Matter Tiles (CartoDB Dark)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
      }).addTo(mapInstanceRef.current);
      
      // Floating minimalistic zoom controls
      L.control.zoom({
        position: 'topright'
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    Object.keys(markersRef.current).forEach(id => {
      map.removeLayer(markersRef.current[id]);
    });
    markersRef.current = {};

    // Clear existing routes
    routesRef.current.forEach(route => {
      map.removeLayer(route);
    });
    routesRef.current = [];

    // Define beautiful neon map pins
    const getNeonPin = (type: string, name: string) => {
      let colorClass = 'bg-[#00D1FF]';
      let borderGlow = 'shadow-[0_0_15px_rgba(0,209,255,0.7)]';
      let emoji = '📍';

      if (type === 'hotel') {
        colorClass = 'bg-emerald-500';
        borderGlow = 'shadow-[0_0_15px_rgba(16,185,129,0.7)]';
        emoji = '🏨';
      } else if (type === 'congress') {
        colorClass = 'bg-indigo-500';
        borderGlow = 'shadow-[0_0_15px_rgba(99,102,241,0.7)]';
        emoji = '🏛️';
      } else if (type === 'airport') {
        colorClass = 'bg-blue-500';
        borderGlow = 'shadow-[0_0_15px_rgba(59,130,246,0.7)]';
        emoji = '🛫';
      } else if (type === 'restaurant') {
        colorClass = 'bg-orange-500';
        borderGlow = 'shadow-[0_0_15px_rgba(249,115,22,0.7)]';
        emoji = '🍽️';
      } else if (type === 'hospitality') {
        colorClass = 'bg-cyan-400';
        borderGlow = 'shadow-[0_0_15px_rgba(34,211,238,0.7)]';
        emoji = '🎭';
      } else if (type === 'transfer') {
        colorClass = 'bg-amber-500';
        borderGlow = 'shadow-[0_0_15px_rgba(245,158,11,0.7)]';
        emoji = '🚗';
      }

      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full ${colorClass} ${borderGlow} text-white border-2 border-white/20 transition-all hover:scale-110">
            <span class="text-sm shrink-0 leading-none">${emoji}</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
    };

    // Draw active layer markers
    const bounds: any[] = [];
    locations.forEach(loc => {
      if (!visibleLayers[loc.type]) return;

      const markerIcon = getNeonPin(loc.type, loc.name);
      const marker = L.marker([loc.latitude, loc.longitude], { icon: markerIcon })
        .addTo(map)
        .on('click', () => {
          setSelectedLocation(loc);
          map.flyTo([loc.latitude, loc.longitude], 16, { animate: true, duration: 1.5 });
        });

      markersRef.current[loc.id] = marker;
      bounds.push([loc.latitude, loc.longitude]);
    });

    // Draw routes connecting sequentially (Today's active route)
    if (visibleLayers.routes && locations.length > 1) {
      // Sort locations for drawing paths (Timeline events sorted by time)
      const sortedGeoPoints = locations
        .filter(l => l.type !== 'airport' || l.name.includes('Destino')) // Draw routes only for destination
        .sort((a, b) => {
          if (a.type === 'congress') return -1;
          if (b.type === 'congress') return 1;
          return a.id.localeCompare(b.id);
        });

      const latlngs = sortedGeoPoints.map(p => [p.latitude, p.longitude]);
      
      if (latlngs.length > 1) {
        // Neon Glowing Polyline
        const polylineGlow = L.polyline(latlngs, {
          color: '#00D1FF',
          weight: 6,
          opacity: 0.3,
          lineJoin: 'round'
        }).addTo(map);

        const polylineCore = L.polyline(latlngs, {
          color: '#ffffff',
          weight: 2.5,
          opacity: 0.9,
          dashArray: '8, 8',
          lineJoin: 'round'
        }).addTo(map);

        routesRef.current.push(polylineGlow, polylineCore);
      }
    }

    // Auto-fit bounds if we have markers
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }

  }, [leafletLoaded, isOpen, locations, visibleLayers]);

  // Recenter Map Helper
  const handleRecenter = () => {
    if (!mapInstanceRef.current || locations.length === 0) return;
    const L = (window as any).L;
    const bounds = locations.map(l => [l.latitude, l.longitude]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    setSelectedLocation(null);
  };

  // Fly to location helper
  const handleSelectLocation = (loc: MapLocation) => {
    if (!mapInstanceRef.current) return;
    setSelectedLocation(loc);
    mapInstanceRef.current.flyTo([loc.latitude, loc.longitude], 16, { animate: true, duration: 1.2 });
  };

  const toggleLayer = (layer: string) => {
    setVisibleLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex flex-col md:flex-row bg-black select-none text-white font-sans overflow-hidden">
      
      {/* 1. Map Canvas Section (Fills background/space) */}
      <div className="relative flex-1 h-[55vh] md:h-full w-full">
        {/* Leaflet container */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />
        
        {/* Apple Maps / Uber Styled UI Elements over map */}
        
        {/* Top Control Bar */}
        <div className="absolute top-6 left-6 right-6 z-10 flex justify-between items-center pointer-events-none">
          {/* Back/Close Button */}
          <button 
            onClick={onClose}
            className="pointer-events-auto p-4 rounded-3xl bg-black/70 backdrop-blur-xl border border-white/10 text-white hover:bg-black/90 active:scale-95 transition-all flex items-center gap-2 shadow-2xl"
          >
            <X size={18} />
            <span className="text-[10px] font-black uppercase tracking-wider pr-1">Salir del Mapa</span>
          </button>

          {/* Minimalist Layer Panel (Toggles) */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button 
              onClick={handleRecenter}
              className="p-4 rounded-3xl bg-black/70 backdrop-blur-xl border border-white/10 text-[#00D1FF] hover:bg-black/90 active:scale-95 transition-all shadow-2xl"
              title="Centrar Mapa"
            >
              <Compass size={18} className="animate-spin-slow" />
            </button>
          </div>
        </div>

        {/* Floating Quick Filters (Apple Maps Style) */}
        <div className="absolute bottom-6 left-6 right-6 md:right-auto z-10 flex gap-2 overflow-x-auto no-scrollbar py-2 pointer-events-auto max-w-full">
          {[
            { id: 'hotel', label: 'Hoteles', color: 'text-emerald-400 bg-emerald-500/10' },
            { id: 'congress', label: 'Sede Congreso', color: 'text-indigo-400 bg-indigo-500/10' },
            { id: 'airport', label: 'Aeropuertos', color: 'text-blue-400 bg-blue-500/10' },
            { id: 'restaurant', label: 'Restaurantes', color: 'text-orange-400 bg-orange-500/10' },
            { id: 'hospitality', label: 'VIP Events', color: 'text-cyan-400 bg-cyan-400/10' },
            { id: 'transfer', label: 'Traslados', color: 'text-amber-400 bg-amber-500/10' },
            { id: 'routes', label: 'Ver Rutas', color: 'text-white bg-white/10' }
          ].map(lay => (
            <button
              key={lay.id}
              onClick={() => toggleLayer(lay.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-full border text-[9px] font-black uppercase tracking-wider transition-all backdrop-blur-md whitespace-nowrap",
                visibleLayers[lay.id] 
                  ? "bg-white border-white text-black shadow-lg shadow-white/10" 
                  : "bg-black/70 border-white/10 text-white/60 hover:text-white"
              )}
            >
              <div className={cn("w-1.5 h-1.5 rounded-full", visibleLayers[lay.id] ? "bg-black" : "bg-white/40")} />
              {lay.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Premium Operational Sheet/Panel (Floating Drawer) */}
      <div className="w-full md:w-[420px] h-[45vh] md:h-full bg-surface-subtle/95 backdrop-blur-3xl border-t md:border-t-0 md:border-l border-white/10 flex flex-col z-20 shadow-2xl relative">
        
        {/* Drag handle / Mobile indicator */}
        <div className="md:hidden flex justify-center py-3 flex-shrink-0">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* Dynamic Panel Header */}
        <div className="px-6 pt-3 pb-4 border-b border-white/5 flex-shrink-0 flex justify-between items-center">
          <div className="space-y-0.5">
            <p className="text-[9px] font-black text-accent uppercase tracking-[0.25em]">Experiencia Operacional</p>
            <h3 className="text-xl font-black text-white tracking-tighter leading-none">Live Map Platform</h3>
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest border border-emerald-500/30">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Engine
          </div>
        </div>

        {/* Tab Controls (Apple Maps / Flighty design) */}
        <div className="px-6 py-3 flex gap-2 border-b border-white/5 flex-shrink-0">
          {[
            { id: 'timeline', label: 'Hoy', icon: Calendar },
            { id: 'insights', label: 'IA & Tráfico', icon: Sparkles },
            { id: 'airport', label: 'Aeropuerto', icon: Plane }
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all",
                  activeTab === t.id 
                    ? "bg-[#00D1FF] border-[#00D1FF] text-white shadow-lg shadow-[#00D1FF]/20" 
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                )}
              >
                <Icon size={12} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents (Scrollable list) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 pb-20 no-scrollbar">
          
          {/* A. TODAY VIEW / TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Cronología de Hoy</h4>
                <span className="text-[9px] text-accent font-black uppercase tracking-widest bg-accent/10 px-2 py-0.5 rounded-full">
                  19 de Mayo
                </span>
              </div>

              {todayTimelineEvents.length > 0 ? (
                <div className="space-y-3">
                  {todayTimelineEvents.map((event) => {
                    const matchedLoc = locations.find(l => l.name === event.location || event.title.toLowerCase().includes(l.name.toLowerCase()));
                    return (
                      <div 
                        key={event.id}
                        onClick={() => {
                          if (matchedLoc) handleSelectLocation(matchedLoc);
                        }}
                        className={cn(
                          "p-4 rounded-[1.5rem] bg-white/5 border border-white/5 flex flex-col gap-3 hover:bg-white/10 active:scale-[0.98] transition-all cursor-pointer",
                          selectedLocation?.name === event.location && "border-[#00D1FF]/30 bg-white/10 shadow-lg shadow-[#00D1FF]/5"
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", 
                            event.type.includes('flight') && 'bg-blue-500/10 text-blue-400',
                            event.type === 'transfer' && 'bg-amber-500/10 text-amber-400',
                            event.type.includes('hotel') && 'bg-emerald-500/10 text-emerald-400',
                            event.type === 'dinner' && 'bg-orange-500/10 text-orange-400',
                            event.type === 'hospitality' && 'bg-cyan-400/10 text-cyan-400'
                          )}>
                            {event.type.includes('flight') ? <Plane size={16} /> :
                             event.type === 'transfer' ? <Car size={16} /> :
                             event.type.includes('hotel') ? <Building2 size={16} /> :
                             event.type === 'dinner' ? <Utensils size={16} /> : <MapPin size={16} />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase text-white/40 tracking-wider font-mono">{event.time}</span>
                              {matchedLoc && (
                                <span className="text-[8px] font-bold text-accent uppercase tracking-widest flex items-center gap-1">
                                  <Navigation size={8} /> Localizado
                                </span>
                              )}
                            </div>
                            <h5 className="text-xs font-black text-white leading-tight mt-0.5 truncate">{event.title}</h5>
                            <p className="text-[10px] text-white/60 truncate mt-1">{event.location}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 mx-auto">
                    <Calendar size={20} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">Sin actividades hoy</p>
                    <p className="text-[10px] text-white/40 max-w-[200px] mx-auto leading-relaxed">Tu itinerario de hoy no tiene paradas registradas.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* B. INSIGHTS & IA ENGINE TAB */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              
              {/* Traffic & ETA Panel */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Estado de Tráfico y ETA</h4>
                
                {liveStatus?.activeTrafficStatus ? (
                  <div className="p-5 rounded-[2rem] bg-accent/5 border border-accent/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
                          <Car size={18} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-accent">Ruta Principal</p>
                          <h5 className="text-sm font-black text-white">{liveStatus.activeTrafficStatus.distanceText || '12 km'}</h5>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-white">
                          {Math.round(liveStatus.activeTrafficStatus.durationInTrafficSeconds / 60) || 28} min
                        </p>
                        <p className="text-[8px] font-black uppercase text-emerald-400 tracking-wider">Tráfico Fluido</p>
                      </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Congestión</p>
                        <p className="font-bold text-white uppercase tracking-wider text-[10px]">{liveStatus.activeTrafficStatus.congestionLevel || 'BAJA'}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Retraso Estimado</p>
                        <p className="font-bold text-amber-400 text-[10px]">+{liveStatus.activeTrafficStatus.delayMinutes || 0} min</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-[2rem] bg-white/5 border border-white/10 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 shrink-0">
                      <Car size={18} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black text-white uppercase tracking-tight">Tráfico en Tiempo Real</p>
                      <p className="text-[9px] text-white/40 leading-relaxed">No hay traslados activos previstos para las próximas 4 horas.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Weather Info */}
              {liveStatus?.activeWeatherStatus && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Climatología Local</h4>
                  <div className="p-5 rounded-[2rem] bg-white/5 border border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {liveStatus.activeWeatherStatus.condition === 'RAIN' ? '🌧️' : 
                         liveStatus.activeWeatherStatus.condition === 'WINDY' ? '💨' : 
                         liveStatus.activeWeatherStatus.condition === 'HEAT_WAVE' ? '🔥' : 
                         liveStatus.activeWeatherStatus.condition === 'CLOUDY' ? '☁️' : '☀️'}
                      </span>
                      <div>
                        <h5 className="text-xs font-black text-white">{liveStatus.activeWeatherStatus.location || 'París'}</h5>
                        <p className="text-[9px] text-white/40 capitalize">{liveStatus.activeWeatherStatus.description}</p>
                      </div>
                    </div>
                    <span className="text-2xl font-black text-white">{liveStatus.activeWeatherStatus.temperatureCelsius}°C</span>
                  </div>
                </div>
              )}

              {/* AI Recommendations */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Recomendaciones IA del Asistente</h4>
                
                {liveStatus?.recommendations && liveStatus.recommendations.length > 0 ? (
                  <div className="space-y-3.5">
                    {liveStatus.recommendations.map((rec: any, idx: number) => (
                      <div key={rec.id || idx} className="p-5 rounded-[2rem] bg-white/5 border border-white/5 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#00D1FF]/10 flex items-center justify-center text-[#00D1FF] shrink-0 mt-0.5">
                            <Sparkles size={14} className="animate-pulse" />
                          </div>
                          <div className="space-y-1 min-w-0">
                            <h5 className="text-xs font-black text-white tracking-tight leading-snug">{rec.title}</h5>
                            <p className="text-[10px] text-white/60 leading-relaxed">{rec.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-5 rounded-[2rem] bg-[#00D1FF]/5 border border-[#00D1FF]/20 flex items-start gap-4 text-[#00D1FF]">
                    <Sparkles className="shrink-0 mt-0.5" size={16} />
                    <div className="space-y-0.5">
                      <p className="text-xs font-black uppercase tracking-widest leading-none">Briefing Seguro</p>
                      <p className="text-[9px] text-white/60 leading-relaxed mt-1">El motor IA de JP Intelligence indica que tu itinerario actual está 100% libre de retrasos u obstáculos.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* C. AIRPORT MODE TAB */}
          {activeTab === 'airport' && (
            <div className="space-y-6">
              {airportModeData ? (
                <div className="space-y-6">
                  
                  {/* Flight Status Header Card */}
                  <div className="p-5 rounded-[2rem] bg-white text-black space-y-4 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-[#00D1FF]" />
                    
                    <div className="flex justify-between items-center border-b border-black/5 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center">
                          <Plane size={20} className="text-black" />
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest opacity-40">
                            {airportModeData.flight.airline || 'Air France'}
                          </p>
                          <h4 className="text-lg font-black tracking-tighter leading-none">
                            {airportModeData.flight.flight_number || 'AF1420'}
                          </h4>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Estado</p>
                        <p className="text-xs font-black text-accent uppercase tracking-wider">
                          {airportModeData.statusText}
                        </p>
                      </div>
                    </div>

                    {/* QR Code / Boarding pass */}
                    <div className="flex flex-col items-center justify-center py-2 space-y-3">
                      <div className="p-3 bg-white rounded-2xl border border-black/5">
                        {(airportModeData.boardingPass?.qr_raw_payload || airportModeData.boardingPass?.qr_code) ? (
                          <QRCodeSVG 
                            value={airportModeData.boardingPass.qr_raw_payload || airportModeData.boardingPass.qr_code || ''} 
                            size={140} 
                            level="H" 
                          />
                        ) : (
                          <div className="w-[140px] h-[140px] flex flex-col items-center justify-center text-black/20 gap-2">
                            <QrCode size={40} strokeWidth={1} />
                            <p className="text-[8px] font-black uppercase tracking-widest">QR NO CARGADO</p>
                          </div>
                        )}
                      </div>
                      <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Escanea para embarcar</p>
                    </div>

                    {/* Quick Flight Info Grid */}
                    <div className="grid grid-cols-3 gap-2 border-t border-black/5 pt-4 text-center">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Asiento</p>
                        <p className="text-sm font-black tracking-tight">{airportModeData.flight.seat || '12A'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Puerta</p>
                        <p className="text-sm font-black tracking-tight text-accent">{airportModeData.flight.gate || 'TBA'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Grupo</p>
                        <p className="text-sm font-black tracking-tight">{airportModeData.flight.boarding_group || '1'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Transfer & Post-flight Details */}
                  {airportModeData.associatedTransfer && (
                    <div className="p-5 rounded-[2rem] bg-white/5 border border-white/5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                          <Car size={16} />
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Enlace Terrestre</p>
                          <h5 className="text-xs font-black text-white">Traslado Premium a la llegada</h5>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-[9px] text-white/50 leading-relaxed">
                          🚗 <span className="font-bold text-white">{airportModeData.associatedTransfer.vehicle_type || 'Premium Sedan'}</span>
                        </p>
                        <p className="text-[9px] text-white/50 leading-relaxed">
                          📍 Punto de Encuentro: <span className="font-bold text-accent">{airportModeData.associatedTransfer.meeting_point || 'Hall de Llegadas'}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Departure Status / Progress Panel */}
                  <div className="p-5 rounded-[2rem] bg-accent/5 border border-accent/20 flex justify-between items-center text-accent">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Clock size={16} />
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Tiempo para Embarque</p>
                        <h5 className="text-xs font-black text-white">Puerta cierra pronto</h5>
                      </div>
                    </div>
                    <span className="text-lg font-black">{airportModeData.diffMin > 0 ? `-${airportModeData.diffMin} min` : 'Embarcando'}</span>
                  </div>

                </div>
              ) : (
                <div className="py-16 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 mx-auto">
                    <Plane size={20} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">Modo Aeropuerto Inactivo</p>
                    <p className="text-[10px] text-white/40 max-w-[220px] mx-auto leading-relaxed">Esta vista se activará automáticamente 8 horas antes de tu próximo vuelo.</p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Selected Marker Floating Overlay / Detail Sheet */}
        <AnimatePresence>
          {selectedLocation && (
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="absolute bottom-6 left-6 right-6 z-30 p-5 rounded-[2rem] bg-black border border-white/15 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[8px] font-black uppercase tracking-widest">
                    {selectedLocation.type}
                  </div>
                  <h4 className="text-sm font-black text-white truncate leading-tight mt-1">{selectedLocation.name}</h4>
                  {selectedLocation.address && (
                    <p className="text-[10px] text-white/60 truncate leading-relaxed">{selectedLocation.address}</p>
                  )}
                </div>
                
                <button 
                  onClick={() => setSelectedLocation(null)}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {selectedLocation.extra && (
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-[9px] font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                  <Info size={12} />
                  {selectedLocation.extra}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const dest = `${selectedLocation.latitude},${selectedLocation.longitude}`;
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-white text-black hover:bg-white/90 active:scale-95 transition-all text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"
                >
                  <Navigation2 size={12} className="rotate-45" /> Cómo llegar
                </button>
                
                <button 
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo([selectedLocation.latitude, selectedLocation.longitude], 18, { animate: true, duration: 1.2 });
                    }
                  }}
                  className="py-3.5 px-5 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/15 active:scale-95 transition-all text-[9px] font-black uppercase tracking-widest"
                >
                  Acercar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
