'use client';

import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Star, 
  Phone, 
  Globe, 
  ExternalLink, 
  Loader2, 
  AlertCircle,
  Map as MapIcon,
  Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchPlacesAction, getPlaceDetailsAction, saveHotelMasterFromPlaceAction } from '@/actions/google-places-actions';
import { useDialog } from '@/context/DialogContext';

export default function GooglePlacesTest() {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { alert } = useDialog();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResults([]);
    setSelectedPlace(null);

    try {
      const response = await searchPlacesAction(query, city);
      if (response.success) {
        setResults(response.results);
        if (response.results.length === 0) {
          setError('No se encontraron resultados para esta búsqueda.');
        }
      } else {
        setError(response.error || 'Error al buscar lugares');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = async (placeId: string) => {
    setIsDetailsLoading(true);
    setError(null);
    try {
      const response = await getPlaceDetailsAction(placeId);
      if (response.success) {
        setSelectedPlace(response.place);
        // Scroll to details
        setTimeout(() => {
          document.getElementById('place-details')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        setError(response.error || 'Error al obtener detalles');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión al obtener detalles.');
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleSaveToCatalog = async () => {
    if (!selectedPlace) return;
    
    setIsSaving(true);
    try {
      const response = await saveHotelMasterFromPlaceAction(selectedPlace);
      if (response.success) {
        await alert({
          title: 'Hotel Guardado',
          message: response.message || 'El hotel ha sido guardado exitosamente en el catálogo maestro.',
          type: 'success'
        });
      } else {
        setError(response.error || 'Error al guardar el hotel');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión al guardar el hotel.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Search Block */}
      <section className="p-8 rounded-[2.5rem] bg-surface border border-border shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full -mr-16 -mt-16" />
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
            <Search size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black font-heading">Test Google Places</h3>
            <p className="text-xs text-muted font-bold uppercase tracking-widest">Validación de API en tiempo real</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-4 mb-2 block">
              Búsqueda (Nombre, tipo, etc.)
            </label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ej: Hotel Wellington"
                className="w-full bg-background border border-border rounded-2xl py-4 px-6 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all font-medium"
              />
              <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-muted/30" size={20} />
            </div>
          </div>
          <div className="md:col-span-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-4 mb-2 block">
              Ciudad (Opcional)
            </label>
            <div className="relative">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ej: Madrid"
                className="w-full bg-background border border-border rounded-2xl py-4 px-6 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all font-medium"
              />
              <MapPin className="absolute right-5 top-1/2 -translate-y-1/2 text-muted/30" size={20} />
            </div>
          </div>
          <div className="md:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="w-full bg-accent text-white font-black py-4 rounded-2xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <Search size={20} />
                  <span>BUSCAR</span>
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3"
          >
            <AlertCircle size={20} />
            <p className="text-sm font-bold">{error}</p>
          </motion.div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Results List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-4">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted"> Resultados ({results.length})</h4>
          </div>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
            {results.length === 0 && !isLoading && (
              <div className="p-12 rounded-[2.5rem] border border-dashed border-border flex flex-col items-center justify-center text-center opacity-50">
                <MapPin size={48} className="text-muted mb-4" />
                <p className="text-sm font-bold text-muted">Inicia una búsqueda para ver resultados</p>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {results.map((place, index) => (
                <motion.div
                  key={place.place_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer group ${
                    selectedPlace?.place_id === place.place_id 
                      ? 'bg-accent/5 border-accent shadow-md' 
                      : 'bg-surface border-border hover:border-accent/30 hover:bg-surface/80 shadow-sm'
                  }`}
                  onClick={() => handleViewDetails(place.place_id)}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h5 className="font-black text-sm group-hover:text-accent transition-colors line-clamp-1">{place.name}</h5>
                      <p className="text-[10px] text-muted font-bold mt-1 line-clamp-2 leading-relaxed uppercase tracking-tight">
                        {place.formatted_address}
                      </p>
                      
                      <div className="flex items-center gap-3 mt-3">
                        {place.rating && (
                          <div className="flex items-center gap-1 text-[10px] font-black text-amber-500">
                            <Star size={10} fill="currentColor" />
                            {place.rating}
                          </div>
                        )}
                        <div className="text-[10px] font-black text-muted uppercase tracking-tighter">
                          ID: {place.place_id.substring(0, 10)}...
                        </div>
                      </div>
                    </div>
                    <button 
                      className={`p-2 rounded-xl transition-all ${
                        selectedPlace?.place_id === place.place_id
                          ? 'bg-accent text-white'
                          : 'bg-muted/10 text-muted group-hover:bg-accent/10 group-hover:text-accent'
                      }`}
                    >
                      {isDetailsLoading && selectedPlace?.place_id === place.place_id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <ExternalLink size={16} />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Place Details */}
        <section id="place-details">
          <div className="flex items-center justify-between px-4 mb-4">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted">Detalles del Lugar</h4>
          </div>

          <div className="relative min-h-[400px]">
            <AnimatePresence mode="wait">
              {selectedPlace ? (
                <motion.div
                  key={selectedPlace.place_id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-8 rounded-[3.5rem] bg-surface border border-accent/20 shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-3xl rounded-full -mr-32 -mt-32" />
                  
                  <div className="relative z-10 space-y-8">
                    {/* Header */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-accent text-[10px] font-black uppercase tracking-widest mb-1">
                        <MapIcon size={12} />
                        <span>Google Place Verified</span>
                      </div>
                      <h2 className="text-3xl font-black font-heading leading-tight">{selectedPlace.name}</h2>
                      <p className="text-sm text-muted font-medium">{selectedPlace.formatted_address}</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 rounded-3xl bg-background border border-border space-y-1">
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest">Valoración</p>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black">{selectedPlace.rating || 'N/A'}</span>
                          {selectedPlace.rating && (
                            <div className="flex text-amber-500">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={14} 
                                  fill={i < Math.floor(selectedPlace.rating) ? "currentColor" : "none"} 
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-5 rounded-3xl bg-background border border-border space-y-1">
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest">Coordenadas</p>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-accent">
                          <Navigation size={12} />
                          {selectedPlace.geometry?.location?.lat.toFixed(4)}, {selectedPlace.geometry?.location?.lng.toFixed(4)}
                        </div>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-3">
                      {selectedPlace.formatted_phone_number && (
                        <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted/5 transition-colors border border-transparent hover:border-border">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                            <Phone size={18} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-muted uppercase tracking-widest">Teléfono</p>
                            <p className="font-bold text-sm">{selectedPlace.formatted_phone_number}</p>
                          </div>
                        </div>
                      )}

                      {selectedPlace.website && (
                        <a 
                          href={selectedPlace.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 p-4 rounded-2xl hover:bg-accent/5 transition-colors border border-transparent hover:border-accent/20 group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0 group-hover:bg-accent group-hover:text-white transition-all">
                            <Globe size={18} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-muted uppercase tracking-widest">Sitio Web</p>
                            <p className="font-bold text-sm truncate text-accent">{selectedPlace.website.replace(/^https?:\/\/(www\.)?/, '')}</p>
                          </div>
                          <ExternalLink size={14} className="text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      )}

                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/5 border border-border/50">
                        <div className="w-10 h-10 rounded-xl bg-muted/10 text-muted flex items-center justify-center shrink-0">
                          <AlertCircle size={18} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-muted uppercase tracking-widest">Place ID</p>
                          <p className="font-mono text-[10px] break-all">{selectedPlace.place_id}</p>
                        </div>
                      </div>
                    </div>
                    {/* Save to Catalog Button */}
                    <div className="pt-4 border-t border-border">
                      <button
                        onClick={handleSaveToCatalog}
                        disabled={isSaving}
                        className="w-full bg-accent text-white font-black py-4 rounded-2xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
                      >
                        {isSaving ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          <>
                            <Star size={20} />
                            <span>GUARDAR EN CATÁLOGO</span>
                          </>
                        )}
                      </button>
                      <p className="text-[9px] text-center text-muted font-bold uppercase tracking-widest mt-3">
                        Esto guardará el lugar verificado en la tabla maestra de hoteles
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full min-h-[400px] rounded-[3.5rem] border border-dashed border-border flex flex-col items-center justify-center p-12 text-center text-muted opacity-50">
                  <div className="w-20 h-20 rounded-[2.5rem] bg-muted/5 flex items-center justify-center mb-6">
                    <Navigation size={40} />
                  </div>
                  <h5 className="text-lg font-black font-heading mb-2">Sin detalles</h5>
                  <p className="text-xs font-bold uppercase tracking-widest max-w-[200px]">Selecciona un resultado para ver su información completa</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
}
