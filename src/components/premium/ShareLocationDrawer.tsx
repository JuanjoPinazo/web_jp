'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapPin, Share2, Clipboard, Navigation, Star, 
  Sparkles, Coffee, Building, Landmark, Compass, 
  Loader2, Check, MessageCircle, Send, X
} from 'lucide-react';
import { BottomActionSheet } from './BottomActionSheet';
import { cn } from '@/lib/utils';

interface ShareLocationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activePlan: any;
}

export function ShareLocationDrawer({
  isOpen,
  onClose,
  activePlan
}: ShareLocationDrawerProps) {
  const [selectedOption, setSelectedOption] = useState<'gps' | 'hotel' | 'venue' | 'stand' | 'exact'>('gps');
  const [standNumber, setStandNumber] = useState<string>('');
  const [customLabel, setCustomLabel] = useState<string>('');
  
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // 1. Obtener la ubicación GPS del usuario
  useEffect(() => {
    if (isOpen) {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setLocLoading(false);
          },
          (err) => {
            console.warn('Share geolocation failed:', err);
            // Coordenadas de París centro por defecto
            setUserLoc({ lat: 48.8566, lng: 2.3522 });
            setLocLoading(false);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        setUserLoc({ lat: 48.8566, lng: 2.3522 });
        setLocLoading(false);
      }
    }
  }, [isOpen]);

  // Resetear estados al cerrar/abrir
  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  // 2. Extraer datos del plan activo
  const hotelDetails = useMemo(() => {
    if (!activePlan?.hotel_stay) return null;
    return {
      name: activePlan.hotel_stay.hotel_name || 'Hotel',
      address: activePlan.hotel_stay.address || '',
      lat: activePlan.hotel_stay.latitude || 48.8566,
      lng: activePlan.hotel_stay.longitude || 2.3522
    };
  }, [activePlan]);

  const venueDetails = useMemo(() => {
    if (activePlan?.contexts) {
      return {
        name: activePlan.contexts.name || 'Sede del Evento',
        address: activePlan.contexts.address || 'París, Francia',
        lat: activePlan.contexts.latitude || 48.8781,
        lng: activePlan.contexts.longitude || 2.2821 // Palais des Congrès default
      };
    }
    // Fallback EuroPCR Palais des Congrès de París
    return {
      name: 'Palais des Congrès de París (EuroPCR)',
      address: '2 Place de la Porte Maillot, 75017 Paris',
      lat: 48.8781,
      lng: 2.2821
    };
  }, [activePlan]);

  // 3. Determinar coordenadas del punto seleccionado
  const selectedDetails = useMemo(() => {
    switch (selectedOption) {
      case 'gps':
        return {
          name: 'Mi Ubicación actual',
          lat: userLoc?.lat || 48.8566,
          lng: userLoc?.lng || 2.3522,
          type: 'gps'
        };
      case 'hotel':
        return {
          name: hotelDetails?.name || 'Mi Hotel de Alojamiento',
          lat: hotelDetails?.lat || 48.8566,
          lng: hotelDetails?.lng || 2.3522,
          type: 'hotel'
        };
      case 'venue':
        return {
          name: venueDetails?.name || 'Sede del Congreso',
          lat: venueDetails?.lat || 48.8781,
          lng: venueDetails?.lng || 2.2821,
          type: 'venue'
        };
      case 'stand':
        return {
          name: standNumber ? `Stand ${standNumber}` : 'Mi Stand',
          lat: userLoc?.lat || 48.8566,
          lng: userLoc?.lng || 2.3522,
          type: 'stand'
        };
      case 'exact':
        return {
          name: customLabel || 'Punto exacto de encuentro',
          lat: userLoc?.lat || 48.8566,
          lng: userLoc?.lng || 2.3522,
          type: 'exact'
        };
    }
  }, [selectedOption, userLoc, hotelDetails, venueDetails, standNumber, customLabel]);

  // 4. Calcular distancia Haversine y ETA desde la posición del usuario al punto seleccionado
  const metrics = useMemo(() => {
    if (!userLoc || !selectedDetails) return { km: 0, etaMin: 0 };
    
    // Si es GPS o Stand (que usa el GPS del usuario), el ETA y distancia son 0
    if (selectedOption === 'gps' || selectedOption === 'stand' || selectedOption === 'exact') {
      return { km: 0, etaMin: 0 };
    }

    const R = 6371; // Earth radius in km
    const lat1 = (userLoc.lat * Math.PI) / 180;
    const lat2 = (selectedDetails.lat * Math.PI) / 180;
    const dLat = ((selectedDetails.lat - userLoc.lat) * Math.PI) / 180;
    const dLng = ((selectedDetails.lng - userLoc.lng) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const km = R * c * 1.25; // 1.25x road factor

    const walkSpeed = 5; // km/h
    const etaMin = Math.round((km / walkSpeed) * 60);

    return {
      km: parseFloat(km.toFixed(2)),
      etaMin: Math.max(1, etaMin)
    };
  }, [userLoc, selectedDetails, selectedOption]);

  // 5. Generar enlace dinámico para compartir
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const params = new URLSearchParams();
    
    params.set('share_lat', selectedDetails.lat.toString());
    params.set('share_lng', selectedDetails.lng.toString());
    params.set('share_name', selectedDetails.name);
    params.set('share_type', selectedDetails.type);
    
    // Obtener nombre del usuario activo
    const userName = activePlan?.client_name || 'Juanjo';
    params.set('share_user', userName);

    return `${origin}/dashboard?${params.toString()}`;
  }, [selectedDetails, activePlan]);

  const shareText = useMemo(() => {
    return `📍 Estoy aquí: ${selectedDetails.name}. Abre mi mapa operacional en vivo de JP Concierge para encontrarnos: ${shareUrl}`;
  }, [selectedDetails, shareUrl]);

  // 6. Lanzadores de Compartir
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Punto de Encuentro - JP Platform',
          text: `Estoy aquí: ${selectedDetails.name}`,
          url: shareUrl,
        });
      } catch (err) {
        console.warn('Native share failed or dismissed:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <BottomActionSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Compartir Ubicación"
      subtitle="Estoy aquí - Enlace de Encuentro Operativo"
    >
      <div className="space-y-6 pt-2 pb-2">
        {/* Selector de opciones */}
        <div className="grid grid-cols-5 gap-1.5 p-1 bg-white/5 border border-white/5 rounded-2xl">
          {[
            { id: 'gps', label: 'Mi GPS', icon: MapPin },
            { id: 'hotel', label: 'Hotel', icon: Building, disabled: !hotelDetails },
            { id: 'venue', label: 'Sede', icon: Landmark },
            { id: 'stand', label: 'Stand', icon: Coffee },
            { id: 'exact', label: 'Exacto', icon: Compass }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setSelectedOption(opt.id as any)}
              disabled={opt.disabled}
              className={cn(
                "py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1.5 transition-all",
                selectedOption === opt.id 
                  ? "bg-accent text-white shadow-md" 
                  : "text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              )}
            >
              <opt.icon size={15} />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Inputs dinámicos */}
        {selectedOption === 'stand' && (
          <div className="space-y-2 animate-in slide-in-from-top duration-200">
            <label className="text-[10px] font-black text-muted uppercase tracking-widest pl-1">Número de Stand / Expositor</label>
            <input
              type="text"
              value={standNumber}
              onChange={(e) => setStandNumber(e.target.value)}
              placeholder="Ej. Stand 24B - Medtronic"
              className="w-full px-5 py-4 rounded-2xl bg-surface-subtle border border-border/40 focus:border-accent focus:outline-none text-sm text-white font-bold"
            />
          </div>
        )}

        {selectedOption === 'exact' && (
          <div className="space-y-2 animate-in slide-in-from-top duration-200">
            <label className="text-[10px] font-black text-muted uppercase tracking-widest pl-1">Nombre del punto exacto</label>
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Ej. Entrada Principal / Café de la Sede"
              className="w-full px-5 py-4 rounded-2xl bg-surface-subtle border border-border/40 focus:border-accent focus:outline-none text-sm text-white font-bold"
            />
          </div>
        )}

        {/* Mini mapa / Preview Container */}
        <div className="relative p-5 rounded-[2rem] bg-surface-subtle border border-border/40 overflow-hidden flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-accent uppercase tracking-widest bg-accent/10 border border-accent/15 px-2.5 py-1 rounded-full">
              {selectedOption === 'gps' && 'Mi GPS'}
              {selectedOption === 'hotel' && 'Hotel'}
              {selectedOption === 'venue' && 'Sede Congreso'}
              {selectedOption === 'stand' && 'Stand'}
              {selectedOption === 'exact' && 'Punto exacto'}
            </span>
            <div className="text-[9px] font-mono text-muted">
              {selectedDetails.lat.toFixed(4)}, {selectedDetails.lng.toFixed(4)}
            </div>
          </div>

          <div className="space-y-0.5 text-left">
            <h4 className="text-sm font-black text-white">{selectedDetails.name}</h4>
            <p className="text-xs text-muted leading-snug">
              {selectedOption === 'hotel' && hotelDetails?.address}
              {selectedOption === 'venue' && venueDetails?.address}
              {(selectedOption === 'gps' || selectedOption === 'stand' || selectedOption === 'exact') && 'París, Francia (Coordenadas en vivo)'}
            </p>
          </div>

          {/* Distancia y ETA andando en vivo */}
          {metrics.km > 0 && (
            <div className="pt-3 border-t border-border/30 flex justify-between items-center text-[10px] font-black uppercase text-accent tracking-widest">
              <span>Distancia al punto:</span>
              <span className="text-white">{metrics.km} km (~{metrics.etaMin} min andando)</span>
            </div>
          )}

          {locLoading && selectedOption === 'gps' && (
            <div className="absolute inset-0 bg-[#09090A]/80 flex items-center justify-center gap-2">
              <Loader2 className="animate-spin text-accent" size={16} />
              <span className="text-[9px] font-black text-white uppercase tracking-widest">Calculando coordenadas GPS...</span>
            </div>
          )}
        </div>

        {/* Rejilla de Acciones de Compartido */}
        <div className="grid grid-cols-3 gap-3">
          {/* WhatsApp */}
          <button
            onClick={handleWhatsAppShare}
            className="py-4.5 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-2 hover:bg-[#25D366]/15 transition-all"
          >
            <MessageCircle size={18} />
            WhatsApp
          </button>

          {/* Copiar enlace */}
          <button
            onClick={handleCopyLink}
            className="py-4.5 rounded-2xl bg-surface border border-border/40 text-white font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-2 hover:bg-surface-subtle transition-all"
          >
            {copied ? (
              <>
                <Check size={18} className="text-green-400" />
                Copiado
              </>
            ) : (
              <>
                <Clipboard size={18} className="text-[#00D1FF]" />
                Copiar Enlace
              </>
            )}
          </button>

          {/* Compartir nativo */}
          <button
            onClick={handleNativeShare}
            className="py-4.5 rounded-2xl bg-accent text-white font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-accent/15"
          >
            <Share2 size={18} />
            Compartir
          </button>
        </div>

      </div>
    </BottomActionSheet>
  );
}
