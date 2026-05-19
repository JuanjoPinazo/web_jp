'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { FullTravelPlan } from '@/hooks/useTravelPlans';
import { LiveMapService } from '../live-map.service';
import { MapLocation } from '../types';
import { Maximize2, MapPin, Navigation, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

const LiveMap = dynamic(() => import('./LiveMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#09090A]">
      <div className="w-5 h-5 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
    </div>
  )
});

interface TodayMiniMapProps {
  activePlan: FullTravelPlan | null;
  nextAction: any;
  className?: string;
  onExpand?: (locationId?: string) => void;
}

export default function TodayMiniMap({
  activePlan,
  nextAction,
  className,
  onExpand
}: TodayMiniMapProps) {
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);

  // 1. Extraer y complementar las ubicaciones operativas
  const locations = useMemo(() => {
    if (!activePlan) return [];
    
    const extracted = LiveMapService.extractLocationsFromPlan(activePlan);
    
    // Si la siguiente acción del timeline tiene coordenadas, nos aseguramos de que esté en el mapa
    if (nextAction && nextAction.lat && nextAction.lng) {
      const exists = extracted.some(loc => 
        (loc.id === nextAction.id) ||
        (Math.abs(loc.coordinates.lat - nextAction.lat) < 0.0001 && 
         Math.abs(loc.coordinates.lng - nextAction.lng) < 0.0001)
      );

      if (!exists) {
        // Mapear tipos de timeline a tipos de mapa
        let mapType: MapLocation['type'] = 'hospitality';
        if (nextAction.type === 'flight') mapType = 'airport';
        else if (nextAction.type === 'transfer') mapType = 'transfer';
        else if (nextAction.type?.includes('hotel')) mapType = 'hotel';
        else if (nextAction.type === 'dinner') mapType = 'restaurant';
        else if (nextAction.type === 'congress') mapType = 'congress';

        extracted.push({
          id: nextAction.id || 'next-action-id',
          name: nextAction.title || 'Siguiente Destino',
          type: mapType,
          coordinates: { lat: nextAction.lat, lng: nextAction.lng },
          address: nextAction.location,
          time: nextAction.time
        });
      }
    }

    // Add shared meeting location if present in searchParams
    const shareLat = searchParams.get('share_lat');
    const shareLng = searchParams.get('share_lng');
    const shareName = searchParams.get('share_name');
    const shareUser = searchParams.get('share_user');

    if (shareLat && shareLng && shareName && shareUser) {
      extracted.push({
        id: 'shared-meeting-point',
        name: `Encuentro: ${shareName}`,
        type: 'hospitality',
        coordinates: { lat: parseFloat(shareLat), lng: parseFloat(shareLng) },
        address: `Punto de encuentro compartido por ${shareUser}`,
        details: `Coordenadas: ${shareLat}, ${shareLng}`
      });
    }

    return extracted;
  }, [activePlan, nextAction, searchParams]);

  // 2. Determinar la ubicación de destino activa (la siguiente acción)
  const activeLocationId = useMemo(() => {
    const hasShared = locations.some(l => l.id === 'shared-meeting-point');
    if (hasShared) return 'shared-meeting-point';

    if (!nextAction) return undefined;
    
    // Buscar coincidencia por ID
    const matchById = locations.find(l => l.id === nextAction.id);
    if (matchById) return matchById.id;

    // Buscar coincidencia por proximidad de coordenadas
    if (nextAction.lat && nextAction.lng) {
      const matchByCoords = locations.find(l => 
        Math.abs(l.coordinates.lat - nextAction.lat) < 0.001 &&
        Math.abs(l.coordinates.lng - nextAction.lng) < 0.001
      );
      return matchByCoords?.id;
    }

    return undefined;
  }, [locations, nextAction]);

  // Si no hay plan ni ubicaciones, no renderizamos nada o mostramos un skeleton premium
  if (!activePlan || locations.length === 0) {
    return (
      <div className="w-full h-48 rounded-[2rem] bg-[#111115]/30 border border-white/5 flex flex-col items-center justify-center p-6 text-center gap-2">
        <MapPin size={24} className="text-muted/40 animate-pulse" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted">Buscando radar operacional...</p>
      </div>
    );
  }

  const activeLoc = locations.find(l => l.id === activeLocationId);

  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Contenedor del Mini Mapa */}
      <div 
        onClick={() => {
          if (onExpand) {
            onExpand(activeLocationId);
          } else {
            setIsExpanded(true);
          }
        }}
        className="relative w-full h-[200px] rounded-[2.5rem] bg-[#111115]/40 border border-white/10 overflow-hidden shadow-xl cursor-pointer hover:border-accent/40 transition-all group"
      >
        {/* Mapa embebido estático */}
        <div className="absolute inset-0 pointer-events-none">
          <LiveMap
            locations={locations}
            activeLocationId={activeLocationId}
            showUserLocation={true}
            showRoutes={true}
            interactive={false}
            hideInternalUI={true}
          />
        </div>

        {/* Capa de degrade premium oscuro superior */}
        <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />

        {/* Badge superior "En Vivo" */}
        <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-white/95">MAPA OPERATIVO EN VIVO</span>
        </div>

        {/* Botón flotante para expandir */}
        <div className="absolute bottom-4 right-4 z-10">
          <div className="w-9 h-9 rounded-xl bg-black/80 border border-white/10 flex items-center justify-center text-white group-hover:bg-accent group-hover:text-white transition-all shadow-lg backdrop-blur-md">
            <Maximize2 size={14} />
          </div>
        </div>
      </div>

      {/* Tarjeta de estado de ruta rápida inferior */}
      {activeLoc && (
        <div className="p-4 rounded-3xl bg-[#111115]/20 border border-white/5 flex items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center text-accent shrink-0">
              <Navigation size={14} className="animate-pulse" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-muted tracking-wider leading-none">Próximo trayecto</p>
              <h4 className="text-xs font-bold text-white mt-1 leading-tight line-clamp-1">{activeLoc.name}</h4>
            </div>
          </div>
          <button 
            onClick={() => {
              if (onExpand) {
                onExpand(activeLocationId);
              } else {
                setIsExpanded(true);
              }
            }}
            className="text-[9px] font-black uppercase tracking-widest bg-accent/10 border border-accent/20 text-accent px-4 py-2 rounded-2xl hover:bg-accent hover:text-white transition-all"
          >
            Ver Ruta
          </button>
        </div>
      )}

      {/* Modal interactivo de Pantalla Completa */}
      {isExpanded && (
        <div className="fixed inset-0 z-[150] bg-black flex flex-col animate-in fade-in duration-200">
          {/* Header del Modal */}
          <div className="bg-[#09090A] border-b border-white/5 px-6 py-4 flex items-center justify-between z-10 shrink-0">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">JP INTELLIGENCE RADAR</span>
              </div>
              <h2 className="text-lg font-black tracking-tighter text-white uppercase">Mapa de Operaciones</h2>
            </div>
            <button 
              onClick={() => setIsExpanded(false)}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Mapa Interactivo de Pantalla Completa */}
          <div className="flex-1 relative">
            <LiveMap
              locations={locations}
              activeLocationId={activeLocationId}
              showUserLocation={true}
              showRoutes={true}
              interactive={true}
              hideInternalUI={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
