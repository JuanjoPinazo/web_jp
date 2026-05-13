'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Home, Briefcase, Building2, Check, Loader2, Info } from 'lucide-react';
import { getUserLocationsAction, saveUserLocationAction, deleteUserLocationAction, UserLocation } from '@/actions/user-location-actions';
import { cn } from '@/lib/utils';

export const UserLocationsManager = ({ profileId }: { profileId: string }) => {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState(false);
  
  const [newLoc, setNewLoc] = useState({
    label: 'Casa',
    address: '',
    latitude: 0,
    longitude: 0,
    is_default: true
  });

  useEffect(() => {
    loadLocations();
  }, [profileId]);

  const loadLocations = async () => {
    setLoading(true);
    const res = await getUserLocationsAction(profileId);
    if (res.success) {
      setLocations(res.data || []);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!newLoc.address || !consent) return;
    
    setSaving(true);
    // In a real app, we would geocode the address here or use the Autocomplete result
    // For this demo, we'll use a mock geocode if it's not provided
    const res = await saveUserLocationAction({
      profile_id: profileId,
      label: newLoc.label,
      address: newLoc.address,
      latitude: newLoc.latitude || 40.4168, // Madrid default
      longitude: newLoc.longitude || -3.7038,
      is_default_departure: newLoc.is_default,
      consent_given: consent
    });

    if (res.success) {
      setIsAdding(false);
      setNewLoc({ label: 'Casa', address: '', latitude: 0, longitude: 0, is_default: true });
      loadLocations();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Borrar esta ubicación?')) return;
    const res = await deleteUserLocationAction(id);
    if (res.success) loadLocations();
  };

  const getIcon = (label: string) => {
    if (label.toLowerCase().includes('casa')) return Home;
    if (label.toLowerCase().includes('trabajo')) return Briefcase;
    if (label.toLowerCase().includes('hospital')) return Building2;
    return MapPin;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Mis Ubicaciones</h3>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="p-2 rounded-full bg-accent/10 text-accent hover:bg-accent hover:text-white transition-all"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      {isAdding && (
        <div className="p-6 rounded-[2rem] bg-surface border border-accent/20 space-y-6 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-2 gap-2">
            {['Casa', 'Trabajo', 'Hospital', 'Otro'].map(l => (
              <button
                key={l}
                onClick={() => setNewLoc(prev => ({ ...prev, label: l }))}
                className={cn(
                  "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                  newLoc.label === l ? "bg-accent border-accent text-white" : "bg-surface-subtle border-border text-muted"
                )}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted uppercase tracking-widest px-1">Dirección Completa</label>
            <input 
              value={newLoc.address}
              onChange={e => setNewLoc(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Ej: Calle Serrano 1, Madrid"
              className="w-full bg-surface-subtle border border-border rounded-xl p-4 text-xs focus:border-accent outline-none"
            />
          </div>

          <label className="flex gap-3 p-4 rounded-2xl bg-accent/5 border border-accent/10 cursor-pointer group">
            <div className="pt-0.5">
              <input 
                type="checkbox" 
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                className="w-4 h-4 rounded border-accent text-accent focus:ring-accent"
              />
            </div>
            <p className="text-[10px] text-muted leading-relaxed font-medium group-hover:text-foreground transition-colors">
              Autorizo a JP Intelligence a usar esta ubicación para calcular avisos de salida inteligente hacia aeropuertos y eventos.
            </p>
          </label>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => setIsAdding(false)}
              className="flex-1 py-4 rounded-xl border border-border text-muted text-[10px] font-black uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={saving || !newLoc.address || !consent}
              className="flex-1 py-4 rounded-xl bg-accent text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/20 disabled:opacity-30"
            >
              {saving ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="animate-spin text-accent" size={24} />
          </div>
        ) : locations.length === 0 ? (
          <div className="p-8 rounded-[2rem] bg-surface-subtle border border-dashed border-border text-center space-y-2">
            <p className="text-xs font-medium text-muted">No tienes ubicaciones guardadas.</p>
            <p className="text-[9px] text-muted/60 uppercase tracking-widest font-black">Añade una para activar Smart Departure</p>
          </div>
        ) : (
          locations.map(loc => {
            const Icon = getIcon(loc.label);
            return (
              <div key={loc.id} className="p-5 rounded-2xl bg-surface border border-border flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <Icon size={20} />
                  </div>
                  <div className="text-left overflow-hidden">
                    <p className="text-xs font-black text-foreground uppercase tracking-tight">{loc.label}</p>
                    <p className="text-[10px] text-muted truncate max-w-[180px]">{loc.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {loc.is_default_departure && (
                    <div className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase">Principal</div>
                  )}
                  <button 
                    onClick={() => handleDelete(loc.id)}
                    className="p-2 rounded-lg text-muted/40 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex gap-4">
        <div className="shrink-0 pt-1">
          <Info size={16} className="text-indigo-500" />
        </div>
        <p className="text-[10px] text-muted leading-relaxed font-medium">
          Tus ubicaciones son privadas. Solo se utilizan para cálculos logísticos y nunca se muestran a otros usuarios.
        </p>
      </div>
    </div>
  );
};
