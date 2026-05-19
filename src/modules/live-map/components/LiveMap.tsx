'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapLocation, Coordinates, RouteMetrics, ETAEngineResult } from '../types';
import { RouteEngine } from '../route-engine';
import { ETAEngine } from '../eta-engine';
import { MapMarkers } from '../map-markers';
import { 
  Navigation, ZoomIn, ZoomOut, Compass, 
  MapPin, Clock, Info, AlertTriangle, X, Car
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Constantes estéticas
const JP_BLUE = '#00D1FF';
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#09090A' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#09090A' }, { weight: 2 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6B7280' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#374151' }, { visibility: 'simplified' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9CA3AF' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1F2937' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#4B5563' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#374151' }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#4B5563' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1F2937' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#374151' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#030712' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#374151' }] }
];

interface LiveMapProps {
  locations: MapLocation[];
  activeLocationId?: string;
  onSelectLocation?: (location: MapLocation | null) => void;
  showUserLocation?: boolean;
  showRoutes?: boolean;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function LiveMap({
  locations,
  activeLocationId,
  onSelectLocation,
  showUserLocation = true,
  showRoutes = true,
  interactive = true,
  className,
  style
}: LiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);
  const [etaResult, setEtaResult] = useState<ETAEngineResult | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);

  // Referencias a objetos nativos de Google Maps
  const googleMapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Record<string, google.maps.Marker>>({});
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const routeAnimationInterval = useRef<NodeJS.Timeout | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);

  // 1. Carga dinámica del SDK de Google Maps
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey) {
      console.error('[LiveMap] NEXT_PUBLIC_GOOGLE_MAPS_KEY no configurada');
      return;
    }

    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    // Inyectar script
    const scriptId = 'google-maps-client-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    } else {
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          setMapLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
    }
  }, []);

  // 2. Seguimiento de la posición del usuario
  useEffect(() => {
    if (!showUserLocation || typeof navigator === 'undefined') return;

    const handleSuccess = (position: GeolocationPosition) => {
      setUserCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      console.warn('[LiveMap] Error obteniendo geolocalización:', error.message);
      // Fallback a coordenadas del primer hotel si falla
      if (locations.length > 0) {
        const hotel = locations.find(l => l.type === 'hotel');
        if (hotel) setUserCoords({ lat: hotel.coordinates.lat - 0.002, lng: hotel.coordinates.lng - 0.002 });
      }
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000
    });

    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [showUserLocation, locations]);

  // 3. Inicializar el mapa
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    // Centro inicial: primera ubicación disponible o centro por defecto
    const initialCenter = locations.length > 0 
      ? new google.maps.LatLng(locations[0].coordinates.lat, locations[0].coordinates.lng)
      : new google.maps.LatLng(40.416775, -3.703790); // Madrid

    const mapOptions: google.maps.MapOptions = {
      center: initialCenter,
      zoom: 14,
      styles: DARK_MAP_STYLE,
      disableDefaultUI: true,
      gestureHandling: interactive ? 'cooperative' : 'none',
      backgroundColor: '#09090A',
      maxZoom: 18,
      minZoom: 10
    };

    const map = new google.maps.Map(mapRef.current, mapOptions);
    googleMapInstance.current = map;

    return () => {
      // Limpiar marcadores y rutas en desmontaje
      Object.values(markersRef.current).forEach(m => m.setMap(null));
      markersRef.current = {};
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      if (routeAnimationInterval.current) {
        clearInterval(routeAnimationInterval.current);
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
    };
  }, [mapLoaded, interactive]);

  // 4. Actualizar Marcador del Usuario
  useEffect(() => {
    const map = googleMapInstance.current;
    if (!mapLoaded || !map || !userCoords) return;

    if (!userMarkerRef.current) {
      userMarkerRef.current = new google.maps.Marker({
        position: new google.maps.LatLng(userCoords.lat, userCoords.lng),
        map,
        icon: MapMarkers.createMarkerOptions(google.maps, 'user'),
        title: 'Mi Ubicación',
        zIndex: 999
      });
    } else {
      userMarkerRef.current.setPosition(new google.maps.LatLng(userCoords.lat, userCoords.lng));
    }
  }, [mapLoaded, userCoords]);

  // 5. Actualizar Marcadores Operacionales
  useEffect(() => {
    const map = googleMapInstance.current;
    if (!mapLoaded || !map) return;

    // Crear/actualizar marcadores para cada ubicación activa
    const activeIds = new Set(locations.map(l => l.id));

    // Eliminar marcadores obsoletos
    Object.keys(markersRef.current).forEach(id => {
      if (!activeIds.has(id)) {
        markersRef.current[id].setMap(null);
        delete markersRef.current[id];
      }
    });

    // Crear o mover marcadores
    locations.forEach(loc => {
      const position = new google.maps.LatLng(loc.coordinates.lat, loc.coordinates.lng);
      const isActive = loc.id === activeLocationId || loc.id === selectedLocation?.id;

      if (!markersRef.current[loc.id]) {
        const marker = new google.maps.Marker({
          position,
          map,
          icon: MapMarkers.createMarkerOptions(google.maps, loc.type, isActive),
          title: loc.name,
          zIndex: isActive ? 100 : 10
        });

        marker.addListener('click', () => {
          setSelectedLocation(loc);
          if (onSelectLocation) onSelectLocation(loc);
        });

        markersRef.current[loc.id] = marker;
      } else {
        const marker = markersRef.current[loc.id];
        marker.setPosition(position);
        marker.setIcon(MapMarkers.createMarkerOptions(google.maps, loc.type, isActive));
        marker.setZIndex(isActive ? 100 : 10);
      }
    });
  }, [mapLoaded, locations, activeLocationId, selectedLocation?.id, onSelectLocation]);

  // 6. Autofit de los marcadores para que todos quepan en pantalla
  useEffect(() => {
    const map = googleMapInstance.current;
    if (!mapLoaded || !map || locations.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    locations.forEach(loc => {
      bounds.extend(new google.maps.LatLng(loc.coordinates.lat, loc.coordinates.lng));
    });
    
    if (userCoords) {
      bounds.extend(new google.maps.LatLng(userCoords.lat, userCoords.lng));
    }

    // Centrar con un pequeño retardo para permitir que el layout se asiente
    const timer = setTimeout(() => {
      map.fitBounds(bounds, {
        top: 80,
        bottom: interactive ? 260 : 20, // Más espacio abajo si el panel interactivo está abierto
        left: 40,
        right: 40
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [mapLoaded, locations, userCoords, interactive]);

  // 7. Calcular y Dibujar la Ruta Activa
  useEffect(() => {
    const map = googleMapInstance.current;
    if (!mapLoaded || !map || !showRoutes) return;

    // Destino: ubicación seleccionada (o activa por prop)
    const destination = selectedLocation || locations.find(l => l.id === activeLocationId);
    // Origen: ubicación del usuario o primer hotel si no hay GPS
    const originCoords = userCoords || (locations.find(l => l.type === 'hotel')?.coordinates);

    if (!destination || !originCoords) {
      // Limpiar ruta previa si no hay destino
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      if (routeAnimationInterval.current) {
        clearInterval(routeAnimationInterval.current);
        routeAnimationInterval.current = null;
      }
      setRouteMetrics(null);
      setEtaResult(null);
      return;
    }

    const loadRoute = async () => {
      setCalculatingRoute(true);
      try {
        // Por defecto coche para distancias medias, andar para cortas
        const isNear = RouteEngine.calculateHaversineDistance(originCoords, destination.coordinates) < 900;
        const mode = isNear ? 'WALKING' : 'DRIVING';

        const metrics = await RouteEngine.calculateRoute(originCoords, destination.coordinates, mode);
        setRouteMetrics(metrics);

        const eta = ETAEngine.calculateETA(metrics, destination.time);
        setEtaResult(eta);

        // Dibujar polilínea en el mapa
        if (polylineRef.current) {
          polylineRef.current.setMap(null);
        }
        if (routeAnimationInterval.current) {
          clearInterval(routeAnimationInterval.current);
        }

        let path: google.maps.LatLng[] = [];
        if (metrics.polyline && window.google.maps.geometry?.encoding) {
          path = google.maps.geometry.encoding.decodePath(metrics.polyline);
        } else {
          // Línea recta si no hay polyline
          path = [
            new google.maps.LatLng(originCoords.lat, originCoords.lng),
            new google.maps.LatLng(destination.coordinates.lat, destination.coordinates.lng)
          ];
        }

        // Crear símbolo animado (glowing dot)
        const lineSymbol = {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 4,
          strokeColor: '#FFFFFF',
          fillColor: JP_BLUE,
          fillOpacity: 1,
          strokeWeight: 1.5
        };

        const polyline = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: JP_BLUE,
          strokeOpacity: 0.75,
          strokeWeight: 4,
          map,
          icons: [{
            icon: lineSymbol,
            offset: '0%'
          }]
        });

        polylineRef.current = polyline;

        // Animar el símbolo a lo largo de la ruta
        let count = 0;
        routeAnimationInterval.current = setInterval(() => {
          count = (count + 1) % 200;
          const offsetId = (count / 2) + '%';
          polyline.set('icons', [{
            icon: lineSymbol,
            offset: offsetId
          }]);
        }, 60);

      } catch (err) {
        console.error('[LiveMap] Error trazando ruta:', err);
      } finally {
        setCalculatingRoute(false);
      }
    };

    loadRoute();
  }, [mapLoaded, locations, activeLocationId, selectedLocation, userCoords, showRoutes]);

  // Controles flotantes interactivos
  const zoomIn = () => {
    const map = googleMapInstance.current;
    if (map) map.setZoom((map.getZoom() || 14) + 1);
  };

  const zoomOut = () => {
    const map = googleMapInstance.current;
    if (map) map.setZoom((map.getZoom() || 14) - 1);
  };

  const recenter = () => {
    const map = googleMapInstance.current;
    if (map && userCoords) {
      map.panTo(new google.maps.LatLng(userCoords.lat, userCoords.lng));
      map.setZoom(15);
    }
  };

  const handleClosePanel = () => {
    setSelectedLocation(null);
    if (onSelectLocation) onSelectLocation(null);
  };

  return (
    <div className={cn("relative w-full h-full bg-[#09090A] overflow-hidden", className)} style={style}>
      {/* Contenedor del mapa de Google */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Cargando inicial del mapa */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#09090A] z-20 gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted">Inicializando mapa encriptado...</p>
        </div>
      )}

      {/* Controles del mapa flotantes (solo en modo interactivo) */}
      {interactive && mapLoaded && (
        <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
          <button 
            onClick={zoomIn}
            className="w-10 h-10 rounded-xl bg-[#111115]/80 border border-white/5 flex items-center justify-center text-white hover:text-accent hover:bg-[#15151b] transition-all backdrop-blur-md shadow-lg"
          >
            <ZoomIn size={18} />
          </button>
          <button 
            onClick={zoomOut}
            className="w-10 h-10 rounded-xl bg-[#111115]/80 border border-white/5 flex items-center justify-center text-white hover:text-accent hover:bg-[#15151b] transition-all backdrop-blur-md shadow-lg"
          >
            <ZoomOut size={18} />
          </button>
          {userCoords && (
            <button 
              onClick={recenter}
              className="w-10 h-10 rounded-xl bg-[#111115]/80 border border-white/5 flex items-center justify-center text-white hover:text-accent hover:bg-[#15151b] transition-all backdrop-blur-md shadow-lg"
            >
              <Compass size={18} />
            </button>
          )}
        </div>
      )}

      {/* Panel Inferior de Información Contextual (Glassmorphism Bottom Sheet) */}
      {interactive && mapLoaded && (selectedLocation || routeMetrics) && (
        <div className="absolute bottom-4 left-4 right-4 z-10 max-w-md mx-auto animate-in slide-in-from-bottom duration-300">
          <div className="bg-[#111115]/90 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-xl shadow-2xl flex flex-col gap-4 relative overflow-hidden">
            {/* Header del Lugar */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                  selectedLocation?.type === 'hotel' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  selectedLocation?.type === 'airport' && 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                  selectedLocation?.type === 'congress' && 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                  selectedLocation?.type === 'restaurant' && 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                  selectedLocation?.type === 'hospitality' && 'bg-pink-500/10 text-pink-400 border-pink-500/20',
                  selectedLocation?.type === 'transfer' && 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                )}>
                  {selectedLocation?.type || 'Ubicación'}
                </span>
                <h3 className="text-base font-black tracking-tight text-white">{selectedLocation?.name || 'Destino operativo'}</h3>
                {selectedLocation?.address && (
                  <p className="text-xs text-muted leading-tight line-clamp-1">{selectedLocation.address}</p>
                )}
              </div>
              <button 
                onClick={handleClosePanel}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Fila de Métricas / ETA en Vivo */}
            {calculatingRoute ? (
              <div className="py-4 flex items-center gap-3 text-muted">
                <div className="w-4 h-4 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest">Calculando ruta y tráfico en vivo...</span>
              </div>
            ) : etaResult && routeMetrics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 border-y border-white/5 py-4">
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

                {/* AI Recommendation Panel */}
                <div className="p-3.5 rounded-2xl bg-accent/10 border border-accent/20 flex gap-3 items-start">
                  <div className="w-5 h-5 rounded-lg bg-accent/20 flex items-center justify-center text-accent shrink-0 mt-0.5">
                    <Info size={12} />
                  </div>
                  <p className="text-[11px] text-white/90 leading-relaxed font-medium">
                    {etaResult.aiRecommendation}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-3 text-muted">
                <AlertTriangle size={16} className="text-yellow-500 shrink-0" />
                <p className="text-[11px] leading-relaxed">Selecciona un punto operativo para trazar la ruta en tiempo real.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
