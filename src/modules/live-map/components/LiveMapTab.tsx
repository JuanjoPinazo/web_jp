'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { MapLocation, Coordinates, RouteMetrics, ETAEngineResult, MapLocationType } from '../types';
import { RouteEngine } from '../route-engine';
import {
  Navigation, Compass, Clock, Info,
  AlertTriangle, Car, Footprints, Bus,
  Phone, ExternalLink, HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

// Lazy load Google Maps component to prevent server-side rendering issues and optimize bundle size
const LiveMap = dynamic(() => import('./LiveMap'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#09090A] z-20 gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-muted">Inicializando mapa encriptado...</p>
    </div>
  )
});

interface LiveMapTabProps {
  activePlan: any;
  timelineEvents: any[];
  planRoutes: any[];
  smartDeparture?: any;
  nextAction?: any;
  initialSelectedLocationId?: string;
  onClose?: () => void;
  onOpenSupport?: (entity?: any) => void;
}

export default function LiveMapTab({
  activePlan,
  timelineEvents,
  planRoutes,
  smartDeparture,
  nextAction,
  initialSelectedLocationId,
  onOpenSupport
}: LiveMapTabProps) {
  const searchParams = useSearchParams();
  const [showUserLocation, setShowUserLocation] = useState(false);
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<'DRIVING' | 'WALKING' | 'TRANSIT'>('DRIVING');
  const [presetRoute, setPresetRoute] = useState<'aeropuerto_hotel' | 'hotel_congreso' | 'hotel_cena' | 'hotel_aeropuerto' | null>(null);

  // States synced from LiveMap route evaluation
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);
  const [etaResult, setEtaResult] = useState<ETAEngineResult | null>(null);

  // 1. Inject database cached routes into RouteEngine cache on mount
  useEffect(() => {
    if (planRoutes && planRoutes.length > 0) {
      RouteEngine.injectCachedRoutes(planRoutes);
    }
  }, [planRoutes]);

  // 2. Map timelineEvents into MapLocations (Single Source of Truth)
  const locations = useMemo((): MapLocation[] => {
    const locs: MapLocation[] = [];

    timelineEvents.forEach(e => {
      if (e.lat && e.lng) {
        const exists = locs.some(l => 
          l.id === e.id || 
          (Math.abs(l.coordinates.lat - e.lat) < 0.0001 && 
           Math.abs(l.coordinates.lng - e.lng) < 0.0001)
        );

        if (!exists) {
          let mapType: MapLocationType = 'hospitality';
          if (e.type === 'flight' || e.type === 'flight_arrival') mapType = 'airport';
          else if (e.type === 'transfer') mapType = 'transfer';
          else if (e.type?.includes('hotel')) mapType = 'hotel';
          else if (e.type === 'dinner' || e.type === 'restaurant') mapType = 'restaurant';
          else if (e.type === 'agenda' || e.type === 'congress') mapType = 'congress';

          locs.push({
            id: e.id,
            name: e.title,
            type: mapType,
            coordinates: { lat: e.lat, lng: e.lng },
            address: e.location,
            time: e.time,
            details: e.description
          });
        }
      }
    });

    // Add Congress context from activePlan if not present
    if (activePlan?.contexts) {
      const ctx = activePlan.contexts;
      if (ctx.latitude && ctx.longitude) {
        const exists = locs.some(l => l.type === 'congress');
        if (!exists) {
          locs.push({
            id: `context-${ctx.id || 'main'}`,
            name: ctx.name || 'Sede Central',
            type: 'congress',
            coordinates: { lat: ctx.latitude, lng: ctx.longitude },
            address: ctx.address || 'Sede de operaciones',
            details: 'Sede central del evento'
          });
        }
      }
    }

    // Add EuroPCR Medical & Safety Hotspots if context is Paris
    const isParis = activePlan?.contexts?.name?.toLowerCase().includes('europcr') || 
                    activePlan?.contexts?.name?.toLowerCase().includes('parís') || 
                    activePlan?.contexts?.name?.toLowerCase().includes('paris');
    if (isParis) {
      locs.push(
        {
          id: 'europcr-safety-first-aid',
          name: 'Socorro EuroPCR (Hall A)',
          type: 'hospitality',
          coordinates: { lat: 48.8831, lng: 2.2825 },
          address: 'Palais des Congrès de Paris (Hall A, Nivel 1)',
          details: 'Puesto médico de emergencia oficial dentro del congreso. Tel: +33140682222'
        },
        {
          id: 'europcr-safety-hospital',
          name: 'Hôpital Marmottan',
          type: 'hospitality',
          coordinates: { lat: 48.8778, lng: 2.2905 },
          address: '17 Rue d\'Armaillé, 75017 Paris',
          details: 'Hospital público general de urgencia cercano a Porte Maillot. Tel: +33145740007'
        },
        {
          id: 'europcr-safety-pharmacy',
          name: 'Pharmacie des Ternes (24/7)',
          type: 'hospitality',
          coordinates: { lat: 48.8810, lng: 2.2915 },
          address: '82 Avenue des Ternes, 75017 Paris',
          details: 'Farmacia 24 horas abierta de guardia cerca del congreso. Tel: +33145741355'
        }
      );
    }

    // Add shared meeting location if present in searchParams
    const shareLat = searchParams.get('share_lat');
    const shareLng = searchParams.get('share_lng');
    const shareName = searchParams.get('share_name');
    const shareUser = searchParams.get('share_user');

    if (shareLat && shareLng && shareName && shareUser) {
      locs.push({
        id: 'shared-meeting-point',
        name: `Encuentro: ${shareName}`,
        type: 'hospitality',
        coordinates: { lat: parseFloat(shareLat), lng: parseFloat(shareLng) },
        address: `Punto de encuentro compartido por ${shareUser}`,
        details: `Coordenadas: ${shareLat}, ${shareLng}`
      });
    }

    return locs;
  }, [timelineEvents, activePlan, searchParams]);

  // Find key locations for presets
  const airportLoc = useMemo(() => locations.find(l => l.type === 'airport'), [locations]);
  const hotelLoc = useMemo(() => locations.find(l => l.type === 'hotel'), [locations]);
  const congressLoc = useMemo(() => locations.find(l => l.type === 'congress'), [locations]);
  const dinnerLoc = useMemo(() => locations.find(l => l.type === 'restaurant'), [locations]);

  // Initialize selected location ID from props or default to next action or first location
  useEffect(() => {
    if (initialSelectedLocationId) {
      setSelectedLocId(initialSelectedLocationId);
    } else if (nextAction && nextAction.lat && nextAction.lng) {
      // Find matching location in mapped array
      const match = locations.find(l => 
        l.id === nextAction.id || 
        (Math.abs(l.coordinates.lat - nextAction.lat) < 0.001 && 
         Math.abs(l.coordinates.lng - nextAction.lng) < 0.001)
      );
      if (match) setSelectedLocId(match.id);
    } else if (locations.length > 0) {
      setSelectedLocId(locations[0].id);
    }
  }, [initialSelectedLocationId, nextAction, locations]);

  // Get active selected location object
  const selectedLocation = useMemo((): MapLocation | null => {
    if (!selectedLocId) return null;
    return locations.find(l => l.id === selectedLocId) || null;
  }, [selectedLocId, locations]);

  // Determine coordinate overrides for preset routes
  const originOverride = useMemo((): Coordinates | undefined => {
    if (!presetRoute) return undefined;
    switch (presetRoute) {
      case 'aeropuerto_hotel':
        return airportLoc?.coordinates;
      case 'hotel_congreso':
      case 'hotel_cena':
      case 'hotel_aeropuerto':
        return hotelLoc?.coordinates;
      default:
        return undefined;
    }
  }, [presetRoute, airportLoc, hotelLoc]);

  // Handle preset route selection
  const handleSelectPreset = (preset: 'aeropuerto_hotel' | 'hotel_congreso' | 'hotel_cena' | 'hotel_aeropuerto') => {
    setPresetRoute(preset);
    
    // Set matching destination
    switch (preset) {
      case 'aeropuerto_hotel':
        if (hotelLoc) setSelectedLocId(hotelLoc.id);
        break;
      case 'hotel_congreso':
        if (congressLoc) setSelectedLocId(congressLoc.id);
        break;
      case 'hotel_cena':
        if (dinnerLoc) setSelectedLocId(dinnerLoc.id);
        break;
      case 'hotel_aeropuerto':
        if (airportLoc) setSelectedLocId(airportLoc.id);
        break;
    }
  };

  // Synchronize route calculation results
  const handleRouteCalculated = (metrics: RouteMetrics | null, eta: ETAEngineResult | null) => {
    setRouteMetrics(metrics);
    setEtaResult(eta);
  };

  // Google Maps Deep Link
  const handleOpenGoogleMaps = () => {
    if (!selectedLocation) return;
    const dest = selectedLocation.address || `${selectedLocation.coordinates.lat},${selectedLocation.coordinates.lng}`;
    let origin = '';
    if (originOverride) {
      origin = `&origin=${originOverride.lat},${originOverride.lng}`;
    } else if (showUserLocation) {
      // Browsers handle GPS relative navigation automatically if origin is blank
      origin = '';
    } else if (hotelLoc) {
      origin = `&origin=${hotelLoc.coordinates.lat},${hotelLoc.coordinates.lng}`;
    }
    const modeMap = {
      DRIVING: 'd',
      WALKING: 'w',
      TRANSIT: 'r'
    };
    const mode = `&dirflg=${modeMap[travelMode]}`;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}${origin}${mode}`, '_blank');
  };

  const handleCallCoordinator = () => {
    if (onOpenSupport) {
      onOpenSupport(selectedLocation ? {
        type: selectedLocation.type || 'place',
        id: selectedLocation.id,
        name: selectedLocation.name
      } : undefined);
    } else {
      const phone = activePlan?.logistic_contact?.phone;
      if (phone) {
        window.open(`tel:${phone}`);
      } else {
        alert('Teléfono de coordinación no disponible en este plan.');
      }
    }
  };

  // Order transport simulation
  const handleOrderTaxi = () => {
    const phone = activePlan?.logistic_contact?.phone || '';
    const name = activePlan?.logistic_contact?.name || 'Coordinador';
    const isConfirmed = window.confirm(`¿Deseas llamar a la central de traslados o a tu coordinador (${name}) para gestionar un vehículo?`);
    if (isConfirmed && phone) {
      window.open(`tel:${phone}`);
    }
  };

  // Smart departure format
  const formattedSmartDeparture = useMemo(() => {
    if (!smartDeparture || !selectedLocation || !nextAction) return null;
    
    // Only show smart departure if the selected location is indeed the next action
    const isNextActionSelected = selectedLocation.id === nextAction.id || 
      (Math.abs(selectedLocation.coordinates.lat - nextAction.lat) < 0.001 && 
       Math.abs(selectedLocation.coordinates.lng - nextAction.lng) < 0.001);

    if (!isNextActionSelected) return null;

    const depTime = new Date(smartDeparture.recommendedTime);
    if (isNaN(depTime.getTime())) return null;

    return depTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  }, [smartDeparture, selectedLocation, nextAction]);

  return (
    <div className="w-full relative bg-[#09090A] rounded-[2.5rem] overflow-hidden border border-white/5 flex flex-col" style={{ height: 'calc(100dvh - 9rem)', minHeight: 480 }}>
      {/* Absolute Map Layout */}
      <div className="absolute inset-0 z-0">
        <LiveMap
          locations={locations}
          activeLocationId={selectedLocId || undefined}
          onSelectLocation={(loc) => {
            if (loc) {
              setSelectedLocId(loc.id);
              setPresetRoute(null);
            }
          }}
          showUserLocation={showUserLocation}
          showRoutes={true}
          interactive={true}
          hideInternalUI={true}
          originOverride={originOverride}
          travelModeOverride={travelMode}
          onRouteCalculated={handleRouteCalculated}
        />
      </div>

      {/* Suggested Routes Floating Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-2 overflow-x-auto no-scrollbar py-1">
        {[
          { id: 'aeropuerto_hotel', label: 'Aeropuerto ➔ Hotel', available: !!airportLoc && !!hotelLoc },
          { id: 'hotel_congreso', label: 'Hotel ➔ Congreso', available: !!hotelLoc && !!congressLoc },
          { id: 'hotel_cena', label: 'Hotel ➔ Cena', available: !!hotelLoc && !!dinnerLoc },
          { id: 'hotel_aeropuerto', label: 'Hotel ➔ Aeropuerto', available: !!hotelLoc && !!airportLoc },
        ].map(route => {
          if (!route.available) return null;
          const isActive = presetRoute === route.id;
          return (
            <button
              key={route.id}
              onClick={() => handleSelectPreset(route.id as any)}
              className={cn(
                "px-4 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest border backdrop-blur-md shadow-lg transition-all shrink-0",
                isActive 
                  ? "bg-accent border-accent text-white" 
                  : "bg-[#111115]/80 border-white/5 text-white/80 hover:text-white"
              )}
            >
              {route.label}
            </button>
          );
        })}
      </div>

      {/* Manual GPS Security Request Button */}
      {!showUserLocation && (
        <button
          onClick={() => setShowUserLocation(true)}
          className="absolute right-4 bottom-[280px] z-10 w-12 h-12 rounded-2xl bg-accent border border-accent/20 flex items-center justify-center text-white shadow-xl animate-bounce hover:bg-accent/90"
          title="Usar mi ubicación actual"
        >
          <Compass size={20} className="animate-spin-slow" />
        </button>
      )}

      {/* Bottom Sheet Card */}
      {selectedLocation && (
        <div className="absolute bottom-4 left-4 right-4 z-10 max-w-lg mx-auto animate-in slide-in-from-bottom duration-300">
          <div className="bg-[#111115]/90 border border-white/10 rounded-[2.5rem] p-5 backdrop-blur-xl shadow-2xl flex flex-col gap-4 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                  selectedLocation.id.startsWith('europcr-safety') && 'bg-red-500/10 text-red-400 border-red-500/20',
                  selectedLocation.id === 'shared-meeting-point' && 'bg-[#00D1FF]/10 text-[#00D1FF]/80 border-[#00D1FF]/20 animate-pulse',
                  selectedLocation.type === 'hotel' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  selectedLocation.type === 'airport' && 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                  selectedLocation.type === 'congress' && 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                  selectedLocation.type === 'restaurant' && 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                  selectedLocation.type === 'hospitality' && selectedLocation.id !== 'shared-meeting-point' && !selectedLocation.id.startsWith('europcr-safety') && 'bg-pink-500/10 text-pink-400 border-pink-500/20',
                  selectedLocation.type === 'transfer' && 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                )}>
                  {selectedLocation.id.startsWith('europcr-safety') ? 'Seguridad Médica' : selectedLocation.id === 'shared-meeting-point' ? 'Punto de Encuentro' : (selectedLocation.type || 'Punto Operativo')}
                </span>
                <h3 className="text-base font-black tracking-tight text-white line-clamp-1">{selectedLocation.name}</h3>
                {selectedLocation.address && (
                  <p className="text-xs text-muted leading-tight line-clamp-1">{selectedLocation.address}</p>
                )}
              </div>
            </div>

            {/* Travel Mode Toggle Selector */}
            <div className="grid grid-cols-3 gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
              {[
                { id: 'DRIVING', label: 'Coche', icon: Car },
                { id: 'WALKING', label: 'Andar', icon: Footprints },
                { id: 'TRANSIT', label: 'Tránsito', icon: Bus },
              ].map(mode => {
                const isActive = travelMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setTravelMode(mode.id as any);
                    }}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      isActive ? "bg-accent text-white shadow-md" : "text-muted hover:text-white/80"
                    )}
                  >
                    <mode.icon size={14} />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Route Metrics / ETA (Google Maps powered) */}
            {etaResult && routeMetrics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 border-y border-white/5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center text-accent shrink-0">
                      <Clock size={16} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-muted tracking-wider leading-none">ETA</p>
                      <p className="text-xs font-bold text-white mt-1 leading-none">{etaResult.durationText}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center text-accent shrink-0">
                      <Navigation size={16} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-muted tracking-wider leading-none">Distancia</p>
                      <p className="text-xs font-bold text-white mt-1 leading-none">{routeMetrics.distanceText}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                      etaResult.trafficStatus === 'light' && 'bg-emerald-500/10 text-emerald-400',
                      etaResult.trafficStatus === 'moderate' && 'bg-yellow-500/10 text-yellow-400',
                      etaResult.trafficStatus === 'heavy' && 'bg-red-500/10 text-red-400'
                    )}>
                      <Car size={16} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-muted tracking-wider leading-none">Tráfico</p>
                      <p className="text-xs font-bold text-white mt-1 leading-none">{etaResult.trafficText}</p>
                    </div>
                  </div>
                </div>

                {/* Smart Departure Alert (Requirement 5) */}
                {formattedSmartDeparture && (
                  <div className="px-4 py-3 rounded-2xl bg-accent/15 border border-accent/30 flex items-center gap-2.5 text-accent animate-pulse">
                    <Clock size={14} className="shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      Salida recomendada: {formattedSmartDeparture}
                    </span>
                  </div>
                )}

                {/* AI recommendation context card */}
                <div className="p-3.5 rounded-2xl bg-accent/10 border border-accent/20 flex gap-3 items-start text-left">
                  <Info size={14} className="text-accent shrink-0 mt-0.5" />
                  <p className="text-[11px] text-white/90 leading-relaxed font-medium">
                    {etaResult.aiRecommendation}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-3 text-muted">
                <AlertTriangle size={16} className="text-yellow-500 shrink-0" />
                <p className="text-[11px] leading-relaxed text-left">
                  Calculando ruta óptima y métricas en vivo...
                </p>
              </div>
            )}

            {/* CTAs Bar */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={handleOpenGoogleMaps}
                className="py-3 px-2 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors text-white"
              >
                <ExternalLink size={16} className="text-accent" />
                <span className="text-[8px] font-black uppercase tracking-widest text-muted">Navegar</span>
              </button>

              <button
                onClick={handleOrderTaxi}
                className="py-3 px-2 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors text-white"
              >
                <Car size={16} className="text-accent" />
                <span className="text-[8px] font-black uppercase tracking-widest text-muted">Pedir Taxi</span>
              </button>

              <button
                onClick={handleCallCoordinator}
                className="py-3 px-2 rounded-2xl bg-accent/20 border border-accent/30 flex flex-col items-center justify-center gap-1 hover:bg-accent/30 transition-colors text-white animate-pulse"
              >
                {onOpenSupport ? (
                  <>
                    <HelpCircle size={16} className="text-accent" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-accent">Soporte</span>
                  </>
                ) : (
                  <>
                    <Phone size={16} className="text-accent" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-accent">Coordinador</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
