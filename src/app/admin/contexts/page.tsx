'use client';

import React, { useEffect, useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { User } from '@/types/platform';
import { Trophy, Navigation, Plus, Users, Calendar, MapPin, X, CheckCircle2, Building2, Loader2, Edit2, Trash2, AlignLeft, Info, Search, Plane } from 'lucide-react';
import { Button } from '@/components/Button';
import { useDialog } from '@/context/DialogContext';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { searchPlacesAction, getPlaceDetailsAction } from '@/actions/google-places-actions';

export default function AdminContextsPage() {
  const { 
    getContexts, 
    getClients, 
    getUsers, 
    assignUserToContext, 
    createContext, 
    updateContext, 
    deleteContext,
    assignClientToContext,
    removeClientFromContext 
  } = useAdmin();

  const [contexts, setContexts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingContext, setEditingContext] = useState<any | null>(null);
  const [assigningTo, setAssigningTo] = useState<any | null>(null);
  const [assigningClientTo, setAssigningClientTo] = useState<any | null>(null);
  const [placeSearch, setPlaceSearch] = useState('');
  const [placeResults, setPlaceResults] = useState<any[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [showPlaceList, setShowPlaceList] = useState(false);
  const { confirm, alert } = useDialog();

  const [newContext, setNewContext] = useState({
    name: '',
    type: 'event',
    location: '',
    description: '',
    start_date: '',
    end_date: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined
  });

  useEffect(() => {
    loadData();
  }, [getContexts]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ctxData, clData, userData] = await Promise.all([getContexts(), getClients(), getUsers()]);
      setContexts(ctxData);
      setClients(clData);
      setUsers(userData);
      
      if (assigningTo) {
        const updated = ctxData.find((c: any) => c.id === assigningTo.id);
        if (updated) setAssigningTo(updated);
      }
      if (assigningClientTo) {
        const updated = ctxData.find((c: any) => c.id === assigningClientTo.id);
        if (updated) setAssigningClientTo(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContext = async () => {
    if (!newContext.name) return;
    try {
      if (editingContext) {
        await updateContext(editingContext.id, newContext);
      } else {
        await createContext(newContext);
      }
      setIsCreating(false);
      setEditingContext(null);
      setNewContext({ 
        name: '', type: 'event', location: '', description: '', 
        start_date: '', end_date: '', 
        latitude: undefined, longitude: undefined 
      });
      loadData();
    } catch (err) {
      console.error(err);
      await alert({ title: 'Error', message: 'Error al procesar el evento.', type: 'danger' });
    }
  };

  const startEditing = (ctx: any) => {
    setEditingContext(ctx);
    setNewContext({
      name: ctx.name || '',
      type: ctx.type || 'event',
      location: ctx.location || '',
      description: ctx.description || '',
      start_date: ctx.start_date ? ctx.start_date.slice(0, 10) : '',
      end_date: ctx.end_date ? ctx.end_date.slice(0, 10) : '',
      latitude: ctx.latitude,
      longitude: ctx.longitude
    });
    setIsCreating(true);
  };

  const handleAssignUser = async (userId: string, contextId: string) => {
    try {
      await assignUserToContext(userId, contextId);
      await loadData();
    } catch (err: any) {
      console.error(err);
      await alert({ title: 'Error', message: 'No se pudo asignar el usuario.', type: 'danger' });
    }
  };

  const handleUnassignUser = async (userId: string, contextId: string) => {
    try {
      const { error } = await supabase.from('context_users').delete().eq('user_id', userId).eq('context_id', contextId);
      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error(err);
      await alert({ title: 'Error', message: 'No se pudo desvincular el usuario.', type: 'danger' });
    }
  };

  const handleAssignClient = async (clientId: string, contextId: string) => {
    try {
      await assignClientToContext(clientId, contextId);
      await loadData();
    } catch (err: any) {
      console.error(err);
      await alert({ title: 'Error', message: 'No se pudo vincular el cliente.', type: 'danger' });
    }
  };

  const handleRemoveClient = async (clientId: string, contextId: string) => {
    try {
      await removeClientFromContext(clientId, contextId);
      await loadData();
    } catch (err) {
      console.error(err);
      await alert({ title: 'Error', message: 'No se pudo desvincular el cliente.', type: 'danger' });
    }
  };

  const handleSearchPlaces = async () => {
    if (!placeSearch) return;
    setIsSearchingPlaces(true);
    try {
      const res = await searchPlacesAction(placeSearch);
      if (res.success) {
        setPlaceResults(res.results || []);
        setShowPlaceList(true);
      } else {
        await alert({ title: 'Error', message: res.error || 'Error al buscar en Google', type: 'danger' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingPlaces(false);
    }
  };

  const handleSelectPlace = async (placeId: string) => {
    try {
      const res = await getPlaceDetailsAction(placeId);
      if (res.success && res.place) {
        const place = res.place;
        setNewContext(prev => ({
          ...prev,
          name: prev.name || place.name,
          location: place.formatted_address,
          latitude: place.geometry?.location?.lat,
          longitude: place.geometry?.location?.lng
        }));
        setPlaceSearch('');
        setShowPlaceList(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && contexts.length === 0) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-5xl font-black font-heading tracking-tight text-foreground">Eventos Globales.</h1>
          <p className="text-muted text-sm font-medium uppercase tracking-widest">Configuración única para múltiples clientes y asistentes.</p>
        </div>
        <Button className="gap-2 rounded-2xl px-6 py-6 shadow-xl shadow-accent/10" onClick={() => setIsCreating(true)}>
          <Plus size={20} />
          Nuevo Evento
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {contexts.map((ctx) => (
          <div key={ctx.id} className="group bg-surface border border-border rounded-[2.5rem] overflow-hidden hover:border-accent/30 transition-all flex flex-col shadow-sm hover:shadow-2xl hover:shadow-accent/5">
            <div className="p-8 space-y-6 flex-1">
              <div className="flex justify-between items-start">
                <div className={`w-14 h-14 rounded-2xl ${ctx.type === 'event' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'} border border-current/20 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
                  {ctx.type === 'event' ? <Trophy size={28} /> : <Navigation size={28} />}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEditing(ctx)} className="p-3 rounded-xl bg-background border border-border text-muted hover:text-accent transition-all"><Edit2 size={16} /></button>
                  <button onClick={async () => {
                    const ok = await confirm({ title: 'Eliminar Evento', message: '¿Estás seguro?', type: 'danger' });
                    if (ok) { await deleteContext(ctx.id); loadData(); }
                  }} className="p-3 rounded-xl bg-background border border-border text-muted hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black font-heading leading-tight tracking-tight">{ctx.name}</h3>
                {ctx.description && <p className="text-xs text-muted line-clamp-2">{ctx.description}</p>}
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-muted">
                  <MapPin size={14} className="text-accent" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{ctx.location || 'Ubicación no definida'}</span>
                </div>
                <div className="flex items-center gap-3 text-muted">
                  <Calendar size={14} className="text-accent" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {ctx.start_date ? new Date(ctx.start_date).toLocaleDateString() : 'TBD'} — {ctx.end_date ? new Date(ctx.end_date).toLocaleDateString() : 'TBD'}
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-border/50 space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[9px] font-black text-muted uppercase tracking-[0.2em]">Clientes asociados</p>
                    <button onClick={() => setAssigningClientTo(ctx)} className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent hover:text-white transition-all"><Building2 size={14} /></button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ctx.context_clients?.map((cc: any) => (
                      <span key={cc.client_id} className="px-2.5 py-1 rounded-lg bg-background border border-border text-foreground text-[8px] font-black uppercase tracking-widest">
                        {cc.clients?.name}
                      </span>
                    ))}
                    {(!ctx.context_clients || ctx.context_clients.length === 0) && (
                      <span className="text-[9px] text-muted italic">Sin clientes vinculados</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[9px] font-black text-muted uppercase tracking-[0.2em]">Asistentes confirmados</p>
                    <button onClick={() => setAssigningTo(ctx)} className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent hover:text-white transition-all"><Users size={14} /></button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {users.filter(u => u.context_users?.some((cu: any) => cu.context_id === ctx.id)).map(u => (
                      <div key={u.id} className="group/user relative">
                        <div className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center text-[10px] font-bold text-accent shadow-sm overflow-hidden" title={u.name || u.email}>
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{(u.name || u.email).split(' ').map((n:string)=>n[0]).slice(0,2).join('').toUpperCase()}</span>
                          )}
                        </div>
                        <button onClick={() => handleUnassignUser(u.id, ctx.id)} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/user:opacity-100 transition-opacity"><X size={10} /></button>
                      </div>
                    ))}
                    {users.filter(u => u.context_users?.some((cu: any) => cu.context_id === ctx.id)).length === 0 && (
                      <span className="text-[10px] text-muted italic py-1">Sin asistentes asignados</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 text-foreground">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface border border-border w-full max-w-xl rounded-[3rem] shadow-2xl p-10 relative overflow-y-auto max-h-[90vh]">
              <button onClick={() => { setIsCreating(false); setEditingContext(null); }} className="absolute top-8 right-8 text-muted hover:text-accent"><X size={24} /></button>
              <h2 className="text-3xl font-black font-heading mb-8 uppercase tracking-tighter">{editingContext ? 'Editar Evento' : 'Nuevo Evento'}</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Nombre del Evento</label>
                  <input className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none focus:border-accent" placeholder="Ej: EuroPCR 2026" value={newContext.name} onChange={e => setNewContext({...newContext, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-accent/5 rounded-3xl border border-accent/10">
                  <div className="col-span-full space-y-2">
                    <label className="text-[10px] font-black uppercase text-accent tracking-widest px-1 flex items-center gap-2">
                      <Search size={12} /> Buscar Ubicación en Google
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none focus:border-accent" 
                          placeholder="Nombre del recinto, palacio de congresos..." 
                          value={placeSearch} 
                          onChange={e => setPlaceSearch(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSearchPlaces()}
                        />
                        {isSearchingPlaces && <Loader2 size={16} className="absolute right-4 top-4 animate-spin text-accent" />}
                        
                        <AnimatePresence>
                          {showPlaceList && placeResults.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }} 
                              animate={{ opacity: 1, y: 0 }} 
                              className="absolute left-0 right-0 top-full mt-2 bg-surface border border-border rounded-2xl shadow-2xl z-[110] max-h-60 overflow-y-auto"
                            >
                              {placeResults.map(place => (
                                <button
                                  key={place.place_id}
                                  type="button"
                                  className="w-full text-left p-4 hover:bg-accent/10 border-b border-border/50 last:border-0 flex justify-between items-center group"
                                  onClick={() => handleSelectPlace(place.place_id)}
                                >
                                  <div>
                                    <p className="text-xs font-black text-foreground group-hover:text-accent transition-colors">{place.name}</p>
                                    <p className="text-[10px] text-muted">{place.formatted_address}</p>
                                  </div>
                                  <Plus size={16} className="text-accent opacity-0 group-hover:opacity-100 transition-all" />
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <Button variant="outline" className="rounded-xl px-4 border-accent/20 text-accent hover:bg-accent/10" onClick={handleSearchPlaces} disabled={isSearchingPlaces}>
                        Buscar
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Tipo</label>
                    <select className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none appearance-none" value={newContext.type} onChange={e => setNewContext({...newContext, type: e.target.value})}>
                      <option value="event">Evento / Congreso</option>
                      <option value="trip">Viaje / Itinerario</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Ubicación Seleccionada</label>
                    <input className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none focus:border-accent" placeholder="Ciudad, País" value={newContext.location} onChange={e => setNewContext({...newContext, location: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Latitud</label>
                    <input type="number" step="any" className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none focus:border-accent" placeholder="0.0000" value={newContext.latitude || ''} onChange={e => setNewContext({...newContext, latitude: parseFloat(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Longitud</label>
                    <input type="number" step="any" className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none focus:border-accent" placeholder="0.0000" value={newContext.longitude || ''} onChange={e => setNewContext({...newContext, longitude: parseFloat(e.target.value)})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Descripción</label>
                  <textarea className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none focus:border-accent resize-none" rows={3} placeholder="Detalles operativos del evento..." value={newContext.description} onChange={e => setNewContext({...newContext, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Fecha Inicio</label>
                    <input type="date" className="w-full bg-background border border-border rounded-xl p-4 text-xs" value={newContext.start_date} onChange={e => setNewContext({...newContext, start_date: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Fecha Fin</label>
                    <input type="date" className="w-full bg-background border border-border rounded-xl p-4 text-xs" value={newContext.end_date} onChange={e => setNewContext({...newContext, end_date: e.target.value})} />
                  </div>
                </div>
                <Button className="w-full py-6 rounded-2xl shadow-xl shadow-accent/20" onClick={handleCreateContext}>
                  {editingContext ? 'Guardar Cambios' : 'Crear Evento Global'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* CLIENT ASSIGNMENT MODAL */}
        {assigningClientTo && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 text-foreground">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-surface border border-border w-full max-w-xl rounded-[3rem] shadow-2xl p-10 relative">
              <button onClick={() => setAssigningClientTo(null)} className="absolute top-8 right-8 text-muted hover:text-accent"><X size={24} /></button>
              <h2 className="text-2xl font-black font-heading mb-2 uppercase tracking-tighter">Clientes asociados</h2>
              <p className="text-xs text-muted mb-8 italic">{assigningClientTo.name}</p>
              <div className="max-h-96 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {clients.map(client => {
                  const isAssigned = assigningClientTo.context_clients?.some((cc: any) => cc.client_id === client.id);
                  return (
                    <div key={client.id} className={`p-4 rounded-2xl border transition-all flex justify-between items-center ${isAssigned ? 'bg-accent/5 border-accent/20' : 'bg-background border-border hover:border-accent/20'}`}>
                      <div>
                        <p className="text-sm font-bold">{client.name}</p>
                        <p className="text-[10px] text-muted">{client.hospitals?.name || 'Independiente'}</p>
                      </div>
                      <button onClick={() => isAssigned ? handleRemoveClient(client.id, assigningClientTo.id) : handleAssignClient(client.id, assigningClientTo.id)} className={`p-2 rounded-xl transition-all ${isAssigned ? 'text-red-500 hover:bg-red-500/10' : 'text-muted hover:text-accent hover:bg-accent/10'}`}>
                        {isAssigned ? <Trash2 size={18} /> : <Plus size={18} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}

        {/* ASSISTANT ASSIGNMENT MODAL */}
        {assigningTo && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 text-foreground">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-surface border border-border w-full max-w-xl rounded-[3rem] shadow-2xl p-10 relative">
              <button onClick={() => setAssigningTo(null)} className="absolute top-8 right-8 text-muted hover:text-accent"><X size={24} /></button>
              <h2 className="text-2xl font-black font-heading mb-2 uppercase tracking-tighter">Asistentes confirmados</h2>
              <p className="text-xs text-muted mb-8 italic">{assigningTo.name}</p>
              <div className="max-h-96 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {users.map(user => {
                  const isAssigned = user.context_users?.some(cu => cu.context_id === assigningTo.id);
                  return (
                    <div key={user.id} className={`p-4 rounded-2xl border transition-all flex justify-between items-center ${isAssigned ? 'bg-accent/5 border-accent/20' : 'bg-background border-border hover:border-accent/20'}`}>
                      <div>
                        <p className="text-sm font-bold">{user.name || user.email}</p>
                        <p className="text-[10px] text-muted">{user.email}</p>
                      </div>
                      <button onClick={() => isAssigned ? handleUnassignUser(user.id, assigningTo.id) : handleAssignUser(user.id, assigningTo.id)} className={`p-2 rounded-xl transition-all ${isAssigned ? 'text-red-500 hover:bg-red-500/10' : 'text-muted hover:text-accent hover:bg-accent/10'}`}>
                        {isAssigned ? <Trash2 size={18} /> : <Plus size={18} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
