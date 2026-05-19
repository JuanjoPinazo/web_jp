'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapLocation, Coordinates, RouteMetrics, ETAEngineResult } from '../types';
import { RouteEngine } from '../route-engine';
import { ETAEngine } from '../eta-engine';
import { MapMarkers } from '../map-markers';
import {
  Navigation, ZoomIn, ZoomOut, Compass,
  Clock, Info, AlertTriangle, X, Car, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  /** When true, hides zoom controls and info panel (used when parent manages UI) */
  hideInternalUI?: boolean;
  className?: string;
  style?: React.CSSProperties;
  originOverride?: Coordinates;
  travelModeOverride?: 'DRIVING' | 'WALKING' | 'TRANSIT';
  onRouteCalculated?: (metrics: RouteMetrics | null, eta: ETAEngineResult | null) => void;
}

export default function LiveMap({
  locations,
  activeLocationId,
  onSelectLocation,
  showUserLocation = false,
  showRoutes = true,
  interactive = true,
  hideInternalUI = false,
  className,
  style,
  originOverride,
  travelModeOverride,
  onRouteCalculated
}: LiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);
  const [etaResult, setEtaResult] = useState<ETAEngineResult | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);

  const googleMapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Record<string, google.maps.Marker>>({});
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const routeAnimationInterval = useRef<NodeJS.Timeout | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const tilesLoadedRef = useRef(false);

  // 1. Carga dinámica del SDK de Google Maps con error handling completo
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey) {
      console.error('[LiveMap] ❌ API key: NO ENCONTRADA (NEXT_PUBLIC_GOOGLE_MAPS_KEY)');
      setMapError('Configuración de mapa incompleta.');
      return;
    }
    console.log(`[LiveMap] ✅ API key present: ${apiKey.slice(0, 8)}...`);

    if (window.google && window.google.maps) {
      console.log('[LiveMap] ✅ Google Maps: ya cargado en window.google.maps');
      setMapLoaded(true);
      return;
    }

    console.log('[LiveMap] ⏳ Google Maps: cargando SDK desde CDN...');

    const scriptId = 'google-maps-client-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    // Timeout de seguridad: si en 15s no carga, mostrar fallback
    const loadTimeout = setTimeout(() => {
      if (!window.google || !window.google.maps) {
        console.error('[LiveMap] Timeout: Google Maps no respondió en 15s');
        setMapError('Tiempo de carga agotado. Comprueba tu conexión.');
      }
    }, 15000);

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        clearTimeout(loadTimeout);
        console.log('[LiveMap] ✅ Google Maps: SDK cargado correctamente');
        setMapLoaded(true);
      };
      script.onerror = () => {
        clearTimeout(loadTimeout);
        console.error('[LiveMap] ❌ Google Maps: error al cargar el script. Comprueba API key, billing y conexión.');
        setMapError('No se pudo cargar el mapa. Verifica tu conexión.');
      };
      document.head.appendChild(script);
    } else {
      // Script ya está en el DOM, esperar a que termine de cargar
      const existingOnerror = script.onerror;
      script.onerror = (e) => {
        clearTimeout(loadTimeout);
        console.error('[LiveMap] Error en script existente de Google Maps');
        setMapError('Error al cargar el mapa.');
        if (typeof existingOnerror === 'function') existingOnerror.call(script, e as any);
      };

      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearTimeout(loadTimeout);
          clearInterval(checkInterval);
          console.log('[LiveMap] Google Maps SDK detectado tras espera');
          setMapLoaded(true);
        }
      }, 100);

      return () => {
        clearInterval(checkInterval);
        clearTimeout(loadTimeout);
      };
    }

    return () => clearTimeout(loadTimeout);
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
      console.warn('[LiveMap] Geolocalización no disponible:', error.message);
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

  useEffect(() => {
    if (!showUserLocation) setUserCoords(null);
  }, [showUserLocation]);

  // 3. Inicializar el mapa
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapError) return;

    const containerW = mapRef.current.offsetWidth;
    const containerH = mapRef.current.offsetHeight;
    if (containerH === 0 || containerW === 0) {
      console.warn(`[LiveMap] ⚠️ Map container size: ${containerW}x${containerH}px — height 0 puede causar pantalla negra`);
    } else {
      console.log(`[LiveMap] ✅ Map container size: ${containerW}x${containerH}px`);
    }

    const initialCenter = locations.length > 0
      ? new google.maps.LatLng(locations[0].coordinates.lat, locations[0].coordinates.lng)
      : new google.maps.LatLng(40.416775, -3.703790); // Madrid fallback

    console.log(`[LiveMap] 📍 Center coordinates: lat=${initialCenter.lat().toFixed(5)}, lng=${initialCenter.lng().toFixed(5)}`);

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
    console.log('[LiveMap] ⏳ Google Maps: instancia creada, esperando tiles...');

    // Trigger resize tras layout settle — crítico para h-full en móvil
    const resizeTimer = setTimeout(() => {
      google.maps.event.trigger(map, 'resize');
      const w = mapRef.current?.offsetWidth ?? 0;
      const h = mapRef.current?.offsetHeight ?? 0;
      console.log(`[LiveMap] 🔄 Resize triggered — container post-layout: ${w}x${h}px`);
    }, 200);

    // Detectar render success: tilesloaded O idle (el que llegue primero)
    tilesLoadedRef.current = false;
    const markReady = () => {
      if (tilesLoadedRef.current) return;
      tilesLoadedRef.current = true;
      setTilesLoaded(true);
      console.log('[LiveMap] ✅ Render success — mapa visible y listo');
    };
    const tilesListener = google.maps.event.addListenerOnce(map, 'tilesloaded', markReady);
    const idleListener = google.maps.event.addListenerOnce(map, 'idle', markReady);

    // Watchdog 20s: advertencia si tiles tardan — NO bloquea el mapa con error UI
    const tilesWatchdog = setTimeout(() => {
      if (!tilesLoadedRef.current) {
        console.warn('[LiveMap] ⚠️ Tiles lentos (>20s) — conexión lenta o posible restricción de API key/billing. El mapa sigue intentando cargar.');
      }
    }, 20000);

    return () => {
      clearTimeout(resizeTimer);
      clearTimeout(tilesWatchdog);
      google.maps.event.removeListener(tilesListener);
      google.maps.event.removeListener(idleListener);
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
  }, [mapLoaded, mapError, interactive]);

  // 4. Actualizar Marcador del Usuario
  useEffect(() => {
    const map = googleMapInstance.current;
    if (!mapLoaded || !map) return;

    if (!showUserLocation || !userCoords) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
      return;
    }

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
  }, [mapLoaded, userCoords, showUserLocation]);

  // 5. Actualizar Marcadores Operacionales
  useEffect(() => {
    const map = googleMapInstance.current;
    if (!mapLoaded || !map) return;

    const activeIds = new Set(locations.map(l => l.id));

    Object.keys(markersRef.current).forEach(id => {
      if (!activeIds.has(id)) {
        markersRef.current[id].setMap(null);
        delete markersRef.current[id];
      }
    });

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
          console.log('[LiveMap] Marker clicked:', loc.name);
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

    console.log(`[LiveMap] 📍 Markers count: ${locations.length} (activo: ${activeLocationId || 'ninguno'})`);
  }, [mapLoaded, locations, activeLocationId, selectedLocation?.id, onSelectLocation]);

  // 6. Autofit bounds
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

    const timer = setTimeout(() => {
      map.fitBounds(bounds, {
        top: 80,
        bottom: interactive && !hideInternalUI ? 260 : 20,
        left: 40,
        right: 40
      });
      console.log('[LiveMap] Bounds ajustados a', locations.length, 'ubicaciones');
    }, 350);

    return () => clearTimeout(timer);
  }, [mapLoaded, locations, userCoords, interactive, hideInternalUI]);

  // 7. Calcular y Dibujar Ruta Activa
  useEffect(() => {
    const map = googleMapInstance.current;
    if (!mapLoaded || !map || !showRoutes) return;

    const destination = selectedLocation || locations.find(l => l.id === activeLocationId);
    const originCoords = originOverride || userCoords || (locations.find(l => l.type === 'hotel')?.coordinates);

    if (!destination || !originCoords) {
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
      if (onRouteCalculated) onRouteCalculated(null, null);
      return;
    }

    const loadRoute = async () => {
      setCalculatingRoute(true);
      try {
        const isNear = RouteEngine.calculateHaversineDistance(originCoords, destination.coordinates) < 900;
        const mode = travelModeOverride || (isNear ? 'WALKING' : 'DRIVING');

        console.log(`[LiveMap] Calculando ruta ${mode} hacia ${destination.name}...`);
        const metrics = await RouteEngine.calculateRoute(originCoords, destination.coordinates, mode);
        setRouteMetrics(metrics);

        const eta = ETAEngine.calculateETA(metrics, destination.time);
        setEtaResult(eta);

        if (onRouteCalculated) onRouteCalculated(metrics, eta);

        console.log(`[LiveMap] Ruta: ${metrics.distanceText} / ${metrics.durationText}`);

        if (polylineRef.current) polylineRef.current.setMap(null);
        if (routeAnimationInterval.current) clearInterval(routeAnimationInterval.current);

        let path: google.maps.LatLng[] = [];
        if (metrics.polyline && window.google.maps.geometry?.encoding) {
          path = google.maps.geometry.encoding.decodePath(metrics.polyline);
        } else {
          path = [
            new google.maps.LatLng(originCoords.lat, originCoords.lng),
            new google.maps.LatLng(destination.coordinates.lat, destination.coordinates.lng)
          ];
        }

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
          icons: [{ icon: lineSymbol, offset: '0%' }]
        });

        polylineRef.current = polyline;

        let count = 0;
        routeAnimationInterval.current = setInterval(() => {
          count = (count + 1) % 200;
          polyline.set('icons', [{ icon: lineSymbol, offset: `${count / 2}%` }]);
        }, 60);

      } catch (err) {
        console.error('[LiveMap] Error trazando ruta:', err);
      } finally {
        setCalculatingRoute(false);
      }
    };

    loadRoute();
  }, [mapLoaded, locations, activeLocationId, selectedLocation, userCoords, showRoutes, originOverride, travelModeOverride, onRouteCalculated]);

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

  const handleRetry = () => {
    setMapError(null);
    setMapLoaded(false);
    setTilesLoaded(false);
    tilesLoadedRef.current = false;
    // Forzar recarga del script eliminándolo del DOM
    const scriptId = 'google-maps-client-script';
    const existing = document.getElementById(scriptId);
    if (existing) existing.remove();
  };

  return (
    <div className={cn("relative w-full h-full bg-[#09090A] overflow-hidden", className)} style={style}>
      {/* Contenedor del mapa */}
      <div ref={mapRef} className="absolute inset-0" />

      {/* Fallback: error de carga — nunca pantalla negra */}
      {mapError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#09090A] z-30 gap-5 p-8">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <div className="text-center space-y-2 max-w-xs">
            <p className="text-sm font-black uppercase tracking-widest text-white">Mapa no disponible</p>
            <p className="text-xs text-muted leading-relaxed">{mapError}</p>
          </div>
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-accent text-white text-[10px] font-black uppercase tracking-widest hover:bg-accent/90 transition-colors"
          >
            <RefreshCw size={12} />
            Reintentar
          </button>
        </div>
      )}

      {/* Skeleton de carga — visible hasta que los tiles cargan (nunca pantalla negra) */}
      {(!mapLoaded || !tilesLoaded) && !mapError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#09090A] z-20 gap-4 pointer-events-none">
          {/* Grid de fondo */}
          <div className="absolute inset-0 opacity-[0.04]">
            <div className="w-full h-full" style={{
              backgroundImage: 'linear-gradient(#00D1FF 1px, transparent 1px), linear-gradient(90deg, #00D1FF 1px, transparent 1px)',
              backgroundSize: '56px 56px'
            }} />
          </div>
          {/* Puntos pulsantes simulando markers */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            {[
              { top: '30%', left: '25%' }, { top: '45%', left: '60%' },
              { top: '60%', left: '35%' }, { top: '25%', left: '70%' }
            ].map((pos, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-full bg-accent animate-pulse"
                style={{ top: pos.top, left: pos.left, animationDelay: `${i * 0.3}s` }}
              />
            ))}
          </div>
          <div className="relative flex flex-col items-center gap-3 z-10">
            <div className="w-10 h-10 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
            <div className="space-y-1 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-accent">
                {!mapLoaded ? 'Inicializando mapa' : 'Cargando mapa operativo'}
              </p>
              <p className="text-[9px] text-muted uppercase tracking-wider">
                {!mapLoaded ? 'Conectando con Google Maps...' : 'Descargando tiles...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Controles flotantes — solo si se permite UI interna */}
      {interactive && mapLoaded && !hideInternalUI && (
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

      {/* Panel info interno — solo si no hay UI externa que lo gestione */}
      {interactive && mapLoaded && !hideInternalUI && (selectedLocation || routeMetrics) && (
        <div className="absolute bottom-4 left-4 right-4 z-10 max-w-md mx-auto animate-in slide-in-from-bottom duration-300">
          <div className="bg-[#111115]/90 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-xl shadow-2xl flex flex-col gap-4 relative overflow-hidden">
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
