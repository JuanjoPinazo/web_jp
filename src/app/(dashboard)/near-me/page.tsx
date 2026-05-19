'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  MapPin, Utensils, Coffee, Train, Car, Pill, ShoppingCart, Landmark, 
  Activity, Calendar, Star, Sparkles, Navigation, Phone, Share2, 
  Heart, X, Compass, ExternalLink, Loader2, ArrowLeft, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence, useScroll } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTravelPlans, FullTravelPlan } from '@/hooks/useTravelPlans';
import { searchNearbyPlacesAction, saveSavedPlaceAction } from '@/actions/google-places-actions';
import { getAIRecommendationsAction } from '@/actions/ai-recommendation-actions';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BottomActionSheet } from '@/components/premium/BottomActionSheet';
import { MobilityActions } from '@/components/premium/MobilityActions';

// Categories mapping to Google Place types & styles
const CATEGORIES = [
  { id: 'museums', label: 'Museos', icon: Landmark, googleType: 'museum', intent: 'tourist_walk', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  { id: 'tourist_attractions', label: 'Atracciones', icon: Landmark, googleType: 'tourist_attraction', intent: 'tourist_walk', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
  { id: 'cafes', label: 'Cafeterías', icon: Coffee, googleType: 'cafe', intent: 'coffee_nearby', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  { id: 'restaurants', label: 'Restaurantes', icon: Utensils, googleType: 'restaurant', intent: 'business_dinner', color: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/20' },
  { id: 'pharmacy', label: 'Farmacias', icon: Pill, googleType: 'pharmacy', intent: 'pharmacy', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
  { id: 'metro_station', label: 'Metro', icon: Train, googleType: 'subway_station', intent: 'transport_option', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  { id: 'taxi_stand', label: 'Taxis', icon: Car, googleType: 'taxi_stand', intent: 'transport_option', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
  { id: 'supermarket', label: 'Súper', icon: ShoppingCart, googleType: 'supermarket', intent: 'quick_lunch', color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20' }
];

interface EnrichedPlace {
  place_id: string;
  name: string;
  vicinity?: string;
  address?: string;
  rating?: number;
  latitude: number;
  longitude: number;
  open_now?: boolean;
  distance_meters?: number;
  duration_minutes?: number;
  aiScore?: number;
  aiReason?: string;
  aiBestFor?: string[];
  aiWarnings?: string[];
  suggestedAction?: string;
  phone?: string;
  website?: string;
  isCustomEvent?: boolean;
}

export default function NearMePage() {
  const { session } = useAuth();
  const { getMyActivePlan } = useTravelPlans();
  const router = useRouter();

  const [activePlan, setActivePlan] = useState<FullTravelPlan | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [locationName, setLocationName] = useState<string>('París (EuroPCR)'); // default reference context
  const [selectedCategory, setSelectedCategory] = useState<string>('restaurants');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingAI, setLoadingAI] = useState<boolean>(false);
  const [places, setPlaces] = useState<EnrichedPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<EnrichedPlace | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const [savingFavId, setSavingFavId] = useState<string | null>(null);
  const [locationDenied, setLocationDenied] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Travel Plan Context & Hotels
  useEffect(() => {
    const loadPlanContext = async () => {
      if (!session?.user?.id) return;
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: contextUsers } = await supabase
          .from('context_users')
          .select('context_id, contexts(*)')
          .eq('user_id', session.user.id);

        if (contextUsers && contextUsers.length > 0) {
          const ctx = (contextUsers[0] as any).contexts;
          if (ctx) {
            const plan = await getMyActivePlan(ctx.id);
            setActivePlan(plan);
            if (ctx.name) setLocationName(ctx.name);
          }
        }
      } catch (err) {
        console.error('Error loading plan context:', err);
      }
    };
    loadPlanContext();
  }, [session, getMyActivePlan]);

  // 2. Fetch Real User Location (GPS)
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          setLocationDenied(false);
        },
        (error) => {
          console.warn('Geolocation blocked or error:', error);
          setLocationDenied(true);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Calculate Reference Location (GPS -> Hotel -> Event Sede -> Paris Fallback)
  const referenceCoords = useMemo(() => {
    if (userLocation) return userLocation;
    
    // Fallback 1: Hotel location from active plan
    const hotel = activePlan?.hotel_stays?.[0];
    if (hotel?.latitude && hotel?.longitude) {
      return { lat: hotel.latitude, lng: hotel.longitude };
    }

    // Fallback 2: Congress/Sede location
    const congress = activePlan?.contexts;
    if (congress?.latitude && congress?.longitude) {
      return { lat: congress.latitude, lng: congress.longitude };
    }

    // Fallback 3: Paris Palais des Congrès (EuroPCR Context)
    return { lat: 48.8833, lng: 2.2833 }; // Palais des Congrès de Paris
  }, [userLocation, activePlan]);

  // Haversine Distance Formula (straight line)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
  };

  // Estimate walking and driving ETA
  const calculateETA = (distanceMeters: number) => {
    const walkingSpeed = 83; // meters per minute (approx 5 km/h)
    const drivingSpeed = 400; // meters per minute (approx 24 km/h in city traffic)
    
    const walkingMin = Math.round(distanceMeters / walkingSpeed);
    const drivingMin = Math.round(distanceMeters / drivingSpeed);

    if (walkingMin <= 15) {
      return { time: `${walkingMin} min`, mode: 'andando' };
    } else {
      return { time: `${drivingMin} min`, mode: 'en coche' };
    }
  };

  // 3. Load Places based on Category & Coordinates
  useEffect(() => {
    const fetchPlaces = async () => {
      setLoading(true);
      setPlaces([]);
      
      const currentCategory = CATEGORIES.find(c => c.id === selectedCategory);
      if (!currentCategory) return;

      // Handle Events / Congress category locally from plan context
      if (selectedCategory === 'events') {
        const eventsList: EnrichedPlace[] = [];

        // Add Main Congress
        const congress = activePlan?.contexts;
        if (congress) {
          const lat = congress.latitude || 48.8833;
          const lng = congress.longitude || 2.2833;
          const dist = calculateDistance(referenceCoords.lat, referenceCoords.lng, lat, lng);
          const eta = calculateETA(dist);
          eventsList.push({
            place_id: congress.id || 'congress-sede',
            name: congress.name || 'Sede del Congreso (EuroPCR)',
            vicinity: congress.address || 'Palais des Congrès de Paris',
            latitude: lat,
            longitude: lng,
            rating: 4.8,
            open_now: true,
            distance_meters: Math.round(dist),
            duration_minutes: parseInt(eta.time),
            aiReason: 'Sede oficial de tu congreso principal de esta semana.',
            aiScore: 99,
            aiBestFor: ['Congreso', 'Eventos'],
            isCustomEvent: true
          });
        }

        // Add Hospitality Events from plan
        if (activePlan?.hospitality_events) {
          activePlan.hospitality_events.forEach((he) => {
            const lat = he.venue_lat || referenceCoords.lat;
            const lng = he.venue_lng || referenceCoords.lng;
            const dist = calculateDistance(referenceCoords.lat, referenceCoords.lng, lat, lng);
            const eta = calculateETA(dist);
            eventsList.push({
              place_id: he.id,
              name: he.title,
              vicinity: he.venue_name || he.venue_address || 'París',
              latitude: lat,
              longitude: lng,
              rating: 5.0,
              open_now: true,
              distance_meters: Math.round(dist),
              duration_minutes: parseInt(eta.time),
              aiReason: `Evento privado programado el ${new Date(he.start_datetime).toLocaleDateString('es-ES', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}.`,
              aiScore: 95,
              aiBestFor: [he.type || 'Evento VIP'],
              isCustomEvent: true
            });
          });
        }

        setPlaces(eventsList.sort((a, b) => (a.distance_meters || 0) - (b.distance_meters || 0)));
        setLoading(false);
        return;
      }

      try {
        // Run Nearby Search server action
        const res = await searchNearbyPlacesAction(
          referenceCoords, 
          currentCategory.googleType, 
          2000 // 2 km radius
        );

        if (res.success && res.results) {
          // Format & map results
          const mappedPlaces: EnrichedPlace[] = res.results.map((p: any) => {
            const lat = p.geometry?.location?.lat || referenceCoords.lat;
            const lng = p.geometry?.location?.lng || referenceCoords.lng;
            const dist = calculateDistance(referenceCoords.lat, referenceCoords.lng, lat, lng);
            
            return {
              place_id: p.place_id,
              name: p.name,
              vicinity: p.vicinity || p.formatted_address,
              rating: p.rating,
              latitude: lat,
              longitude: lng,
              open_now: p.opening_hours?.open_now,
              distance_meters: Math.round(dist)
            };
          });

          // Sort by distance initially
          const sortedPlaces = mappedPlaces.sort((a, b) => (a.distance_meters || 0) - (b.distance_meters || 0)).slice(0, 10);
          setPlaces(sortedPlaces);
          setLoading(false);

          // 4. Asynchronously fetch Contextual AI ranking/enrichment
          if (sortedPlaces.length > 0 && activePlan?.id && session?.user?.id) {
            setLoadingAI(true);
            const candidates = sortedPlaces.map(p => ({
              google_place_id: p.place_id,
              name: p.name,
              category: currentCategory.googleType,
              rating: p.rating,
              address: p.vicinity || '',
              latitude: p.latitude,
              longitude: p.longitude,
              distance_meters: p.distance_meters,
              open_now: p.open_now
            }));

            const aiRes = await getAIRecommendationsAction({
              planId: activePlan.id,
              profileId: session.user.id,
              places: candidates,
              intent: currentCategory.intent as any,
              category: currentCategory.googleType
            });

            if (aiRes.success && aiRes.recommendations) {
              setPlaces(prevPlaces => {
                return prevPlaces.map(p => {
                  const match = aiRes.recommendations!.find((r: any) => r.place_id === p.place_id);
                  if (match) {
                    return {
                      ...p,
                      aiScore: match.score,
                      aiReason: match.reason,
                      aiBestFor: match.best_for,
                      aiWarnings: match.warnings,
                      suggestedAction: match.suggested_action
                    };
                  }
                  return p;
                });
              });
            }
            setLoadingAI(false);
          }
        } else {
          setPlaces([]);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching places:', err);
        setPlaces([]);
        setLoading(false);
      }
    };

    fetchPlaces();
  }, [selectedCategory, referenceCoords, activePlan?.id]);

  // Actions
  const handleOpenGoogleMaps = (place: EnrichedPlace) => {
    const dest = `${place.latitude},${place.longitude}`;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`, '_blank');
  };

  const handleDirections = (place: EnrichedPlace) => {
    const dest = `${place.latitude},${place.longitude}`;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&destination_place_id=${place.place_id}&travelmode=walking`, '_blank');
  };

  const handleCall = (phoneNum?: string) => {
    if (phoneNum) {
      window.open(`tel:${phoneNum}`);
    }
  };

  const handleShare = async (place: EnrichedPlace) => {
    const shareText = `Echa un vistazo a este lugar en París: ${place.name} (${place.vicinity})`;
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: place.name,
          text: shareText,
          url: mapsLink,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText} - ${mapsLink}`);
        alert('Enlace copiado al portapapeles.');
      } catch (err) {
        console.warn('Clipboard write blocked:', err);
      }
    }
  };

  const handleSaveFavorite = async (place: EnrichedPlace) => {
    if (!activePlan?.id || !session?.user?.id) return;
    setSavingFavId(place.place_id);
    try {
      const res = await saveSavedPlaceAction({
        plan_id: activePlan.id,
        profile_id: session.user.id,
        place: {
          place_id: place.place_id,
          name: place.name,
          vicinity: place.vicinity,
          geometry: {
            location: {
              lat: place.latitude,
              lng: place.longitude
            }
          }
        },
        category: selectedCategory
      });
      if (res.success) {
        alert('Guardado en favoritos correctamente.');
      } else {
        alert(res.error || 'Error al guardar.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingFavId(null);
    }
  };

  // Categories JSX Filter Row
  const renderCategoryRow = () => (
    <div className="flex gap-2.5 overflow-x-auto pb-4 pt-1 px-4 -mx-4 scrollbar-hide no-scrollbar snap-x snap-mandatory">
      {CATEGORIES.map(cat => {
        const IconComponent = cat.icon;
        const isSelected = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-full border whitespace-nowrap snap-align-start transition-all duration-300 backdrop-blur-md",
              isSelected 
                ? "bg-foreground border-foreground text-background scale-105 shadow-md shadow-black/10 dark:shadow-white/5" 
                : "bg-surface/50 border-border/40 text-muted hover:bg-surface/80"
            )}
          >
            <IconComponent size={14} className={cn(isSelected ? "text-background" : cat.color)} />
            <span className="text-[10px] font-black uppercase tracking-wider">{cat.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-32 pt-2 px-4 md:px-0">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.push('/dashboard')}
          className="p-3.5 rounded-2xl bg-surface/50 border border-border/40 text-foreground/60 hover:text-foreground active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <ArrowLeft size={16} />
          <span className="text-[10px] font-black uppercase tracking-wider">Inicio</span>
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[9px] font-black uppercase tracking-widest">
          <Sparkles size={12} className="animate-pulse" />
          <span>Local Assistant</span>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-foreground leading-none">
          Cerca de mí.
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted font-semibold">
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-accent shrink-0" />
            <span>
              {userLocation 
                ? `Ubicación GPS: París`
                : `Contexto EuroPCR: ${locationName}`}
            </span>
          </div>
          
          {userLocation ? (
            <span className="px-2 py-0.5 rounded bg-[#00D1FF]/10 border border-[#00D1FF]/20 text-[#00D1FF] text-[9px] font-black uppercase tracking-wider">
              Precisión: +/- {userLocation.accuracy ? Math.round(userLocation.accuracy) : '10'}m
            </span>
          ) : (
            <button 
              onClick={() => {
                if (typeof window !== 'undefined' && navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                      });
                      setLocationDenied(false);
                    },
                    (error) => {
                      console.warn(error);
                      alert("Por favor, permite el acceso al GPS en tu navegador para ver los lugares más cercanos.");
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                  );
                }
              }}
              className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-wider animate-pulse hover:bg-red-500/20 transition-colors"
            >
              GPS Inactivo (Activar)
            </button>
          )}
        </div>
      </div>

      {/* Category selector */}
      {renderCategoryRow()}

      {/* Special UI Block for Taxi/Uber */}
      {selectedCategory === 'taxi_stand' && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="p-6 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 rounded-2xl text-white">
              <Car size={22} />
            </div>
            <div>
              <h4 className="text-base font-black text-foreground">Solicitud de Transporte en París</h4>
              <p className="text-xs text-muted">Acceso directo a servicios de movilidad urbana.</p>
            </div>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Puedes solicitar un Uber directamente a tu posición actual o utilizar la parada de taxi local más cercana listada a continuación.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button 
              onClick={() => window.open('https://m.uber.com/ul/?action=setPickup&pickup=my_location', '_blank')}
              className="py-4 rounded-xl bg-foreground text-background font-black text-[10px] uppercase tracking-widest text-center hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Pedir Uber <ArrowUpRight size={12} />
            </button>
            <button 
              onClick={() => window.open('tel:+33145303030', '_blank')} // Taxis G7 Paris
              className="py-4 rounded-xl bg-amber-500 text-white font-black text-[10px] uppercase tracking-widest text-center hover:bg-amber-500/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Llamar G7 Taxis <Phone size={12} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Places List (Apple Maps / Concierge Style - Borderless rows, flat list) */}
      <div ref={containerRef} className="space-y-1">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted">
            <Loader2 className="animate-spin text-accent" size={32} />
            <p className="text-xs font-black uppercase tracking-widest">Buscando lugares cercanos...</p>
          </div>
        ) : places.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-border/40 rounded-[2.5rem] p-8 space-y-3">
            <Compass size={40} className="mx-auto text-muted/20" />
            <h3 className="text-base font-black text-foreground">No se encontraron resultados</h3>
            <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">
              Prueba a cambiar de categoría o a acercarte al área del congreso.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {places.map((place, index) => {
              const etaInfo = calculateETA(place.distance_meters || 500);
              return (
                <motion.div
                  key={place.place_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.3 }}
                  onClick={() => {
                    setSelectedPlace(place);
                    setIsSheetOpen(true);
                  }}
                  className="py-4.5 flex items-start gap-4.5 cursor-pointer hover:bg-surface-subtle/30 px-3 -mx-3 rounded-2xl active:scale-[0.99] transition-all group"
                >
                  {/* Category Pin Icon (Apple Maps Circle style) */}
                  <div className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                    CATEGORIES.find(c => c.id === selectedCategory)?.bg || 'bg-accent/10',
                    CATEGORIES.find(c => c.id === selectedCategory)?.color || 'text-accent'
                  )}>
                    {React.createElement(
                      CATEGORIES.find(c => c.id === selectedCategory)?.icon || MapPin,
                      { size: 18 }
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-black text-sm text-foreground leading-tight group-hover:text-accent transition-colors truncate">
                        {place.name}
                      </h3>
                      {place.rating && (
                        <div className="flex items-center gap-0.5 shrink-0 text-[10px] font-black text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded-full border border-amber-500/10">
                          <Star size={10} fill="currentColor" />
                          {place.rating.toFixed(1)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted font-bold uppercase tracking-tight">
                      <span>{place.distance_meters ? `${(place.distance_meters / 1000).toFixed(1)} km` : 'Cerca'}</span>
                      <span className="text-muted/30">•</span>
                      <span className="text-accent">{etaInfo.time} {etaInfo.mode}</span>
                      {place.open_now !== undefined && (
                        <>
                          <span className="text-muted/30">•</span>
                          <span className={place.open_now ? "text-emerald-500" : "text-red-400"}>
                            {place.open_now ? 'Abierto' : 'Cerrado'}
                          </span>
                        </>
                      )}
                    </div>

                    {/* AI Contextual Suggestion (Concierge notes) */}
                    {(place.aiReason || loadingAI) && (
                      <div className="mt-2.5 p-3 rounded-2xl bg-accent/5 border border-accent/10 text-xs text-foreground/90 font-medium leading-relaxed relative overflow-hidden flex items-start gap-2 animate-in fade-in duration-300">
                        <Sparkles size={13} className="text-accent shrink-0 mt-0.5 animate-pulse" />
                        <div className="flex-1">
                          {place.aiReason ? (
                            <p className="italic">{place.aiReason}</p>
                          ) : (
                            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-accent tracking-wider">
                              <Loader2 size={10} className="animate-spin" /> Analizando contexto de viaje...
                            </div>
                          )}
                          {place.aiBestFor && place.aiBestFor.length > 0 && (
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                              {place.aiBestFor.map(tag => (
                                <span key={tag} className="px-2 py-0.5 rounded-md bg-accent/10 text-[8px] font-black uppercase tracking-wider text-accent border border-accent/10">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Place Details Sheet (Apple Maps style slider drawer) */}
      <BottomActionSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={selectedPlace?.name}
        subtitle={selectedPlace?.vicinity}
      >
        {selectedPlace && (
          <div className="space-y-6 pt-2 pb-6">
            
            {/* Rating and Distance Banner */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-4.5 rounded-2xl bg-surface-subtle border border-border/40 space-y-1">
                <p className="text-[9px] font-black text-muted uppercase tracking-widest">Valoración</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black">{selectedPlace.rating || 'N/A'}</span>
                  {selectedPlace.rating && (
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={13} 
                          fill={i < Math.floor(selectedPlace.rating || 0) ? "currentColor" : "none"} 
                          className="shrink-0"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4.5 rounded-2xl bg-surface-subtle border border-border/40 space-y-1">
                <p className="text-[9px] font-black text-muted uppercase tracking-widest">Distancia & ETA</p>
                <div className="flex items-center gap-1.5 text-xs font-black text-accent uppercase tracking-tight">
                  <Navigation size={12} className="rotate-45" />
                  {selectedPlace.distance_meters ? `${(selectedPlace.distance_meters / 1000).toFixed(2)} km` : 'Cerca'} ({calculateETA(selectedPlace.distance_meters || 500).time})
                </div>
              </div>
            </div>

            {/* AI Insights Block */}
            {selectedPlace.aiReason && (
              <div className="p-5.5 rounded-[1.5rem] bg-accent/5 border border-accent/20 space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-2xl rounded-full" />
                <div className="flex items-center gap-2 text-accent text-[9px] font-black uppercase tracking-widest">
                  <Sparkles size={12} className="animate-pulse" />
                  <span>Análisis de JP Concierge</span>
                </div>
                <p className="text-sm font-medium text-foreground leading-relaxed italic">
                  "{selectedPlace.aiReason}"
                </p>
                {selectedPlace.aiWarnings && selectedPlace.aiWarnings.length > 0 && (
                  <div className="pt-2 border-t border-accent/10 space-y-1">
                    {selectedPlace.aiWarnings.map((warn, i) => (
                      <p key={i} className="text-[10px] text-amber-500 font-bold flex items-center gap-1.5">
                        ⚠️ {warn}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

             {/* Actions Grid */}
             <div className="space-y-3">
               <MobilityActions
                 destinationLat={selectedPlace.latitude}
                 destinationLng={selectedPlace.longitude}
                 destinationName={selectedPlace.name}
                 destinationAddress={selectedPlace.vicinity}
                 className="mt-2"
               />

              <div className="grid grid-cols-3 gap-2.5 pt-1.5">
                <button
                  onClick={() => handleShare(selectedPlace)}
                  className="py-4 rounded-xl bg-surface/50 border border-border/30 text-muted hover:text-foreground font-black text-[9px] uppercase tracking-widest flex flex-col items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                >
                  <Share2 size={14} className="text-muted" />
                  Compartir
                </button>
                
                <button
                  onClick={() => handleSaveFavorite(selectedPlace)}
                  disabled={savingFavId === selectedPlace.place_id}
                  className="py-4 rounded-xl bg-surface/50 border border-border/30 text-muted hover:text-foreground font-black text-[9px] uppercase tracking-widest flex flex-col items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                >
                  {savingFavId === selectedPlace.place_id ? (
                    <Loader2 size={14} className="animate-spin text-accent" />
                  ) : (
                    <Heart size={14} className="text-muted" />
                  )}
                  Favorito
                </button>

                <button
                  onClick={() => handleCall(selectedPlace.phone)}
                  disabled={!selectedPlace.phone}
                  className={cn(
                    "py-4 rounded-xl bg-surface/50 border border-border/30 text-muted hover:text-foreground font-black text-[9px] uppercase tracking-widest flex flex-col items-center justify-center gap-1.5 active:scale-[0.98] transition-all",
                    !selectedPlace.phone && "opacity-40 cursor-not-allowed"
                  )}
                >
                  <Phone size={14} className="text-muted" />
                  Llamar
                </button>
              </div>
            </div>
            
          </div>
        )}
      </BottomActionSheet>
    </div>
  );
}
