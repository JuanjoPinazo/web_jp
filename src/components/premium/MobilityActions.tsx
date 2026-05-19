'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Car, Zap, Phone, Navigation, Train, Info, 
  Map, Eye, Compass, Loader2, Footprints, AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MobilityActionsProps {
  destinationLat: number;
  destinationLng: number;
  destinationName: string;
  destinationAddress?: string;
  className?: string;
}

export function MobilityActions({
  destinationLat,
  destinationLng,
  destinationName,
  destinationAddress,
  className
}: MobilityActionsProps) {
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState<boolean>(true);

  // 1. Get User Location (GPS)
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocLoading(false);
        },
        (err) => {
          console.warn('Mobility geolocation blocked/failed:', err);
          // Fallback to Paris center (operational context)
          setUserLoc({ lat: 48.8566, lng: 2.3522 });
          setLocLoading(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setUserLoc({ lat: 48.8566, lng: 2.3522 });
      setLocLoading(false);
    }
  }, []);

  // 2. Haversine distance calculations
  const distanceMeters = useMemo(() => {
    if (!userLoc) return 0;
    
    const R = 6371e3; // Earth radius in meters
    const lat1 = (userLoc.lat * Math.PI) / 180;
    const lat2 = (destinationLat * Math.PI) / 180;
    const deltaLat = ((destinationLat - userLoc.lat) * Math.PI) / 180;
    const deltaLng = ((destinationLng - userLoc.lng) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }, [userLoc, destinationLat, destinationLng]);

  // Adjust straight line distance to road distance estimate (1.25x scaling)
  const estimatedRoadDistanceKm = useMemo(() => {
    return (distanceMeters * 1.25) / 1000;
  }, [distanceMeters]);

  // 3. Traffic Status Estimate based on Local Time of Day
  const trafficStatus = useMemo(() => {
    if (typeof window === 'undefined') return { delayMin: 0, text: 'Fluido', color: 'text-emerald-400' };

    const hours = new Date().getHours();
    
    // Paris Rush hours: 8:00 - 10:00 and 17:00 - 19:30
    if ((hours >= 8 && hours <= 10) || (hours >= 17 && (hours < 19 || (hours === 19 && new Date().getMinutes() <= 30)))) {
      const delay = Math.round(5 + Math.random() * 8); // 5-13 mins delay
      return {
        delayMin: delay,
        text: `Congestión Alta (+${delay}m)`,
        color: 'text-rose-400'
      };
    } else if (hours >= 22 || hours <= 6) {
      return {
        delayMin: 0,
        text: 'Despejado',
        color: 'text-emerald-400'
      };
    } else {
      const delay = Math.round(1 + Math.random() * 3); // 1-4 mins delay
      return {
        delayMin: delay,
        text: `Moderado (+${delay}m)`,
        color: 'text-amber-400'
      };
    }
  }, [distanceMeters]);

  // 4. ETAs (in minutes)
  const etas = useMemo(() => {
    const walkSpeed = 5; // km/h
    const driveSpeed = 26; // km/h average in Paris
    const transitSpeed = 22; // km/h average metro/RER

    const walkMin = Math.round((distanceMeters / 1000 / walkSpeed) * 60);
    const driveMin = Math.round((estimatedRoadDistanceKm / driveSpeed) * 60) + trafficStatus.delayMin;
    const transitMin = Math.round((estimatedRoadDistanceKm / transitSpeed) * 60) + 4; // Add 4 mins for wait/walk time

    return {
      walking: Math.max(1, walkMin),
      driving: Math.max(2, driveMin),
      transit: Math.max(3, transitMin)
    };
  }, [distanceMeters, estimatedRoadDistanceKm, trafficStatus]);

  // 5. Pricing Estimates
  const pricing = useMemo(() => {
    // Uber Paris Pricing structure
    const uberBase = 3.0;
    const uberPerKm = 1.3;
    const uberPerMin = 0.35;
    const uberPrice = uberBase + (estimatedRoadDistanceKm * uberPerKm) + (etas.driving * uberPerMin);
    const uberMin = Math.round(uberPrice * 0.9);
    const uberMax = Math.round(uberPrice * 1.15);

    // Bolt Paris Pricing structure
    const boltBase = 2.8;
    const boltPerKm = 1.25;
    const boltPerMin = 0.3;
    const boltPrice = boltBase + (estimatedRoadDistanceKm * boltPerKm) + (etas.driving * boltPerMin);
    const boltMin = Math.round(boltPrice * 0.85);
    const boltMax = Math.round(boltPrice * 1.12);

    // Taxi Paris structure
    const taxiBase = 4.1;
    const taxiPerKm = 1.7;
    const taxiPerMin = 0.45;
    const taxiPrice = taxiBase + (estimatedRoadDistanceKm * taxiPerKm) + (etas.driving * taxiPerMin);
    const taxiMin = Math.round(taxiPrice * 0.95);
    const taxiMax = Math.round(taxiPrice * 1.2);

    return {
      uber: `${Math.max(8, uberMin)}-${Math.max(12, uberMax)}€`,
      bolt: `${Math.max(7, boltMin)}-${Math.max(10, boltMax)}€`,
      taxi: `${Math.max(10, taxiMin)}-${Math.max(15, taxiMax)}€`,
      metro: '2.15€',
      walking: 'Gratis'
    };
  }, [estimatedRoadDistanceKm, etas.driving]);

  // 6. Action Deep Links
  const handleUberClick = () => {
    const pickup = userLoc ? `${userLoc.lat},${userLoc.lng}` : 'my_location';
    const dropoff = `${destinationLat},${destinationLng}`;
    const name = encodeURIComponent(destinationName);
    
    // Uber universal deep link
    window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${destinationLat}&dropoff[longitude]=${destinationLng}&dropoff[nickname]=${name}`, '_blank');
  };

  const handleBoltClick = () => {
    // Bolt universal deep link
    window.open(`https://bolt.eu/r/ride?dropoff_lat=${destinationLat}&dropoff_lng=${destinationLng}`, '_blank');
  };

  const handleTaxiClick = () => {
    // Paris Taxis G7 dialer
    window.open('tel:+33145303030', '_blank');
  };

  const handleGoogleMapsClick = (mode: 'w' | 'r' | 'd' = 'd') => {
    const dest = `${destinationLat},${destinationLng}`;
    let dirflg = 'd'; // driving
    if (mode === 'w') dirflg = 'walking';
    if (mode === 'r') dirflg = 'transit';
    
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&destination_place_id=${encodeURIComponent(destinationName)}&travelmode=${dirflg}`, '_blank');
  };

  const handleAppleMapsClick = (mode: 'w' | 'r' | 'd' = 'd') => {
    const dest = `${destinationLat},${destinationLng}`;
    let dirflg = 'd'; // driving
    if (mode === 'w') dirflg = 'w';
    if (mode === 'r') dirflg = 'r';

    window.open(`maps://maps.apple.com/?daddr=${dest}&dirflg=${dirflg}`, '_blank');
  };

  if (locLoading) {
    return (
      <div className="py-6 flex items-center justify-center gap-2 text-muted">
        <Loader2 className="animate-spin text-accent" size={16} />
        <span className="text-[10px] font-black uppercase tracking-widest">Calculando opciones de movilidad...</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4 pt-4 border-t border-border/40", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="space-y-0.5">
          <p className="text-[9px] font-black text-accent uppercase tracking-widest">Opciones de Movilidad</p>
          <h4 className="text-xs font-bold text-white uppercase tracking-tight">Acceso Rápido Real</h4>
        </div>
        <div className={cn("text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5", trafficStatus.color)}>
          <div className={cn("w-1.5 h-1.5 rounded-full bg-current", trafficStatus.delayMin > 4 && "animate-pulse")} />
          Tráfico: {trafficStatus.text}
        </div>
      </div>

      {/* Grid of Mobility Services */}
      <div className="grid grid-cols-2 gap-2.5">
        
        {/* Uber */}
        <button
          onClick={handleUberClick}
          className="p-3.5 rounded-2xl bg-black border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-left flex items-center gap-3 active:scale-[0.98]"
        >
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
            <Car size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white">Uber</span>
              <span className="text-[9px] text-muted-foreground font-mono bg-white/5 px-1 rounded">{etas.driving}m</span>
            </div>
            <p className="text-[10px] text-accent font-black tracking-tight">{pricing.uber}</p>
          </div>
        </button>

        {/* Bolt */}
        <button
          onClick={handleBoltClick}
          className="p-3.5 rounded-2xl bg-black border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-left flex items-center gap-3 active:scale-[0.98]"
        >
          <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 shrink-0">
            <Zap size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white">Bolt</span>
              <span className="text-[9px] text-muted-foreground font-mono bg-white/5 px-1 rounded">{etas.driving}m</span>
            </div>
            <p className="text-[10px] text-emerald-400 font-black tracking-tight">{pricing.bolt}</p>
          </div>
        </button>

        {/* Taxi G7 Paris */}
        <button
          onClick={handleTaxiClick}
          className="p-3.5 rounded-2xl bg-black border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-left flex items-center gap-3 active:scale-[0.98]"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
            <Phone size={14} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white">Taxi G7</span>
              <span className="text-[9px] text-muted-foreground font-mono bg-white/5 px-1 rounded">{etas.driving}m</span>
            </div>
            <p className="text-[10px] text-amber-400 font-black tracking-tight">{pricing.taxi}</p>
          </div>
        </button>

        {/* Metro */}
        <button
          onClick={() => handleGoogleMapsClick('r')}
          className="p-3.5 rounded-2xl bg-black border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-left flex items-center gap-3 active:scale-[0.98]"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
            <Train size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white">Metro</span>
              <span className="text-[9px] text-muted-foreground font-mono bg-white/5 px-1 rounded">{etas.transit}m</span>
            </div>
            <p className="text-[10px] text-blue-400 font-black tracking-tight">{pricing.metro}</p>
          </div>
        </button>

        {/* Walking */}
        <button
          onClick={() => handleGoogleMapsClick('w')}
          className="p-3.5 rounded-2xl bg-black border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-left flex items-center gap-3 active:scale-[0.98] col-span-2"
        >
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
            <Footprints size={16} />
          </div>
          <div className="min-w-0 flex-1 flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-white">Andando</span>
              <p className="text-[10px] text-cyan-400 font-black tracking-tight">{pricing.walking}</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-black text-white font-mono">{etas.walking} min</span>
              <p className="text-[8px] text-muted uppercase tracking-wider font-semibold">Tiempo Estimado</p>
            </div>
          </div>
        </button>
      </div>

      {/* Map Launch Grid */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleAppleMapsClick('d')}
          className="py-3 rounded-xl bg-surface/80 border border-border/40 hover:bg-surface transition-all text-center flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/90 active:scale-[0.98]"
        >
          <Compass size={12} className="text-indigo-400" /> Apple Maps
        </button>
        <button
          onClick={() => handleGoogleMapsClick('d')}
          className="py-3 rounded-xl bg-surface/80 border border-border/40 hover:bg-surface transition-all text-center flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/90 active:scale-[0.98]"
        >
          <Map size={12} className="text-orange-400" /> Google Maps
        </button>
      </div>
    </div>
  );
}
