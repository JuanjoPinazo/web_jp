'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Utensils, Plus, Edit2, Trash2, Users, UserPlus, X, Loader2,
  Check, ChevronDown, Calendar, MapPin, Clock, Search, Filter,
  Building2, RefreshCw, Navigation, Mail, Phone, Star,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { useTravelPlans } from '@/hooks/useTravelPlans';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface EventWithMeta {
  id: string;
  plan_id: string;
  type: 'dinner' | 'lunch' | 'meeting' | 'experience';
  title: string;
  description?: string;
  venue_name?: string;
  venue_address?: string;
  start_datetime: string;
  end_datetime?: string;
  dress_code?: string;
  notes?: string;
  contact_name?: string;
  contact_phone?: string;
  reservation_name?: string;
  reservation_code?: string;
  private_room: boolean;
  visible_to_client: boolean;
  status: 'planned' | 'confirmed' | 'cancelled';
  image_url?: string;
  created_at: string;
  deleted_at?: string | null;
  // Joined
  attendees?: AttendeeWithProfile[];
  plan?: {
    id: string;
    user_id: string;
    profiles?: { nombre?: string; apellidos?: string; email?: string };
    contexts?: { id: string; name?: string; city?: string; location?: string };
  };
}

interface AttendeeWithProfile {
  id: string;
  event_id: string;
  profile_id?: string | null;
  guest_name?: string;
  guest_email?: string;
  attendance_status: 'pending' | 'confirmed' | 'declined';
  dietary_restrictions?: string;
  transport_required: boolean;
  notes?: string;
  deleted_at?: string | null;
  profiles?: { nombre?: string; apellidos?: string; email?: string; avatar_url?: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  dinner: 'Cena VIP',
  lunch: 'Comida VIP',
  meeting: 'Reunión',
  experience: 'Experiencia',
};

const STATUS_STYLES: Record<string, string> = {
  planned: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  confirmed: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  cancelled: 'bg-red-400/10 text-red-400 border-red-400/20',
};

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planificado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
};

const ATTENDANCE_STYLES: Record<string, string> = {
  pending: 'bg-amber-400/10 text-amber-400',
  confirmed: 'bg-emerald-400/10 text-emerald-400',
  declined: 'bg-red-400/10 text-red-400',
};

const ATTENDANCE_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  declined: 'Declinado',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function formatDateTime(dt?: string) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  });
}

function getDisplayName(a: AttendeeWithProfile) {
  if (a.profiles?.nombre) return `${a.profiles.nombre} ${a.profiles.apellidos || ''}`.trim();
  if (a.guest_name) return a.guest_name;
  return a.guest_email || '—';
}

// ─────────────────────────────────────────────────────────────────────────────
// FieldInput — reusable inline input
// ─────────────────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value?: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent transition-colors"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function HospitalityAdminPage() {
  const { saveAttendee, getEventAttendees, deleteAttendee } = useTravelPlans();

  const [events, setEvents] = useState<EventWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterContext, setFilterContext] = useState<string>('all');

  // Event edit modal
  const [editingEvent, setEditingEvent] = useState<EventWithMeta | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);

  // Attendee modal
  const [editingAttendee, setEditingAttendee] = useState<Partial<AttendeeWithProfile> | null>(null);
  const [savingAttendee, setSavingAttendee] = useState(false);
  const [attendeeError, setAttendeeError] = useState<string | null>(null);
  
  // Data for creation
  const [allContexts, setAllContexts] = useState<any[]>([]);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [contextProfiles, setContextProfiles] = useState<any[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);

  // ─── Load all events ──────────────────────────────────────────────────────

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsRes, contextsRes, plansRes] = await Promise.all([
        supabase
          .from('hospitality_events')
          .select(`
            *,
            attendees:hospitality_event_attendees(
              *,
              profiles:profile_id(nombre, apellidos, email, avatar_url)
            ),
            plan:contact_travel_plans(
              id, user_id,
              profiles:user_id(nombre, apellidos, email),
              contexts:context_id(id, name, location)
            )
          `)
          .is('deleted_at', null)
          .order('start_datetime', { ascending: false }),
        supabase.from('contexts').select('*').order('name'),
        supabase.from('contact_travel_plans').select('*, profiles:user_id(nombre, apellidos, email)').is('deleted_at', null)
      ]);

      if (eventsRes.error) throw eventsRes.error;
      if (contextsRes.error) throw contextsRes.error;
      if (plansRes.error) throw plansRes.error;

      setEvents((eventsRes.data as EventWithMeta[]) || []);
      setAllContexts(contextsRes.data || []);
      setAllPlans(plansRes.data || []);
    } catch (err: any) {
      console.error('Error loading hospitality data:', err.message || err);
      if (err.details) console.error('Error details:', err.details);
      if (err.hint) console.error('Error hint:', err.hint);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // ─── Contexts for filter ──────────────────────────────────────────────────

  const contexts = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach(ev => {
      const ctx = ev.plan?.contexts;
      if (ctx?.id) map.set(ctx.id, ctx.name || ctx.id);
    });
    return Array.from(map.entries());
  }, [events]);

  // ─── Filtered events ──────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return events.filter(ev => {
      if (filterStatus !== 'all' && ev.status !== filterStatus) return false;
      if (filterContext !== 'all' && ev.plan?.contexts?.id !== filterContext) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const haystack = `${ev.title} ${ev.venue_name || ''} ${ev.plan?.profiles?.nombre || ''} ${ev.plan?.contexts?.name || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [events, filterStatus, filterContext, searchQuery]);

  // ─── Save event ───────────────────────────────────────────────────────────

  const handleSaveEvent = async () => {
    if (!editingEvent) return;
    if (!editingEvent.title || !editingEvent.start_datetime) {
      setEventError('Título y fecha de inicio son obligatorios.');
      return;
    }
    setSavingEvent(true);
    setEventError(null);
    try {
      // Strip all joined/virtual fields before upserting
      const {
        attendees: _a,
        plan: _pl,
        hospitality_event_attendees: _hea,
        profiles: _p,
        contexts: _ctx,
        ...payload
      } = editingEvent as any;

      const { data: { user } } = await supabase.auth.getUser();
      
      const cleanPayload = {
        ...payload,
        plan_id: payload.plan_id || null,
        last_updated_by: user?.id,
        last_updated_at: new Date().toISOString(),
        source: payload.source || 'manual',
      };

      // If id is empty string, remove it so Postgres generates a new UUID
      if (!cleanPayload.id) {
        delete cleanPayload.id;
      }

      const { error } = await supabase
        .from('hospitality_events')
        .upsert(cleanPayload);
      if (error) throw error;

      await loadEvents();
      setEditingEvent(null);
    } catch (err: any) {
      setEventError(err.message || 'Error al guardar el evento.');
    } finally {
      setSavingEvent(false);
    }
  };

  // ─── Delete event (soft) ──────────────────────────────────────────────────

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('¿Eliminar este evento? Esta acción es reversible.')) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('hospitality_events').update({
      deleted_at: new Date().toISOString(),
      last_updated_by: user?.id,
    }).eq('id', id);
    await loadEvents();
  };

  // ─── Save attendee ────────────────────────────────────────────────────────

  const handleSaveAttendee = async () => {
    if (!editingAttendee) return;
    if (!editingAttendee.guest_name && !editingAttendee.profile_id) {
      setAttendeeError('Indica un nombre o selecciona un usuario.');
      return;
    }
    if (!editingAttendee.event_id) {
      setAttendeeError('Error interno: Falta el ID del evento.');
      return;
    }
    setSavingAttendee(true);
    setAttendeeError(null);
    try {
      await saveAttendee({
        id: editingAttendee.id,
        event_id: editingAttendee.event_id,
        profile_id: editingAttendee.profile_id || null,
        guest_name: editingAttendee.guest_name || '',
        guest_email: editingAttendee.guest_email || '',
        attendance_status: editingAttendee.attendance_status || 'pending',
        dietary_restrictions: editingAttendee.dietary_restrictions || '',
        transport_required: editingAttendee.transport_required || false,
        notes: editingAttendee.notes || '',
      });
      // Reload attendees for this event
      const fresh = await getEventAttendees(editingAttendee.event_id);
      setEvents(prev => prev.map(ev =>
        ev.id === editingAttendee.event_id ? { ...ev, attendees: fresh as AttendeeWithProfile[] } : ev
      ));
      // Also update editingEvent if open
      setEditingEvent(prev => {
        if (!prev || prev.id !== editingAttendee.event_id) return prev;
        return { ...prev, attendees: fresh as AttendeeWithProfile[] };
      });
      setEditingAttendee(null);
    } catch (err: any) {
      setAttendeeError(err.message || 'Error al guardar el asistente.');
    } finally {
      setSavingAttendee(false);
    }
  };

  // ─── Delete attendee ──────────────────────────────────────────────────────

  const handleDeleteAttendee = async (attendee: AttendeeWithProfile) => {
    if (!confirm('¿Eliminar asistente?')) return;
    await deleteAttendee(attendee.id);
    const fresh = await getEventAttendees(attendee.event_id);
    setEvents(prev => prev.map(ev =>
      ev.id === attendee.event_id ? { ...ev, attendees: fresh as AttendeeWithProfile[] } : ev
    ));
    setEditingEvent(prev => prev?.id === attendee.event_id
      ? { ...prev, attendees: fresh as AttendeeWithProfile[] }
      : prev
    );
  };

  const loadContextProfiles = async (contextId: string) => {
    setProfilesLoading(true);
    try {
      const { data: cuData } = await supabase.from('context_users').select('user_id').eq('context_id', contextId);
      const ids = (cuData || []).map(cu => cu.user_id);
      if (ids.length === 0) { setContextProfiles([]); return; }
      const { data } = await supabase.from('profiles').select('id, nombre, apellidos, email').in('id', ids).order('nombre');
      setContextProfiles(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setProfilesLoading(false);
    }
  };

  useEffect(() => {
    if (editingEvent?.plan?.contexts?.id) {
      loadContextProfiles(editingEvent.plan.contexts.id);
    }
  }, [editingEvent?.plan?.contexts?.id]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest mb-3">
            <Utensils size={12} /> Hospitality VIP
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground">Eventos & Asistentes</h1>
          <p className="text-sm text-muted mt-1">Gestión centralizada de todos los eventos VIP de todos los planes.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditingEvent({
              id: '', plan_id: '', type: 'dinner', title: '', start_datetime: '', 
              private_room: false, visible_to_client: true, status: 'planned', 
              created_at: new Date().toISOString()
            })}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-accent text-background text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-accent/20 active:scale-95"
          >
            <Plus size={16} />
            Nuevo Evento
          </button>
          <button
            onClick={loadEvents}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-border text-muted text-xs font-bold hover:text-foreground transition-all active:scale-95"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-border bg-surface text-xs flex-1 min-w-[200px]">
          <Search size={14} className="text-muted flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar evento, cliente, sede…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="appearance-none bg-surface border border-border rounded-2xl px-4 py-2.5 pr-8 text-xs font-bold outline-none focus:border-accent cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            <option value="planned">Planificado</option>
            <option value="confirmed">Confirmado</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        </div>

        {/* Context filter */}
        {contexts.length > 0 && (
          <div className="relative">
            <select
              value={filterContext}
              onChange={e => setFilterContext(e.target.value)}
              className="appearance-none bg-surface border border-border rounded-2xl px-4 py-2.5 pr-8 text-xs font-bold outline-none focus:border-accent cursor-pointer max-w-[200px]"
            >
              <option value="all">Todos los congresos</option>
              {contexts.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        )}
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total eventos', value: events.length, color: 'text-accent' },
          { label: 'Confirmados', value: events.filter(e => e.status === 'confirmed').length, color: 'text-emerald-400' },
          { label: 'Planificados', value: events.filter(e => e.status === 'planned').length, color: 'text-amber-400' },
          { label: 'Asistentes totales', value: events.reduce((acc, ev) => acc + (ev.attendees?.filter(a => !a.deleted_at).length || 0), 0), color: 'text-blue-400' },
        ].map(stat => (
          <div key={stat.label} className="p-4 rounded-2xl bg-surface border border-border">
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] font-black text-muted uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Events list ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-[2rem]">
          <Utensils size={40} className="text-muted/20 mx-auto mb-3" />
          <p className="text-sm text-muted font-medium">No se encontraron eventos</p>
          <p className="text-xs text-muted/60 mt-1">Prueba a cambiar los filtros o crea un evento desde el plan del cliente.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(ev => {
            const activeAttendees = ev.attendees?.filter(a => !a.deleted_at) || [];
            const confirmedCount = activeAttendees.filter(a => a.attendance_status === 'confirmed').length;
            const clientName = ev.plan?.profiles?.nombre
              ? `${ev.plan.profiles.nombre} ${ev.plan.profiles.apellidos || ''}`.trim()
              : ev.plan?.profiles?.email || '—';
            const contextName = ev.plan?.contexts?.name || '—';

            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface border border-border rounded-[1.5rem] overflow-hidden hover:border-accent/20 transition-all"
              >
                {/* Card header */}
                <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                  {/* Icon + info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                      <Utensils size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black text-foreground">{ev.title}</p>
                        <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest ${STATUS_STYLES[ev.status]}`}>
                          {STATUS_LABELS[ev.status]}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-surface-subtle border border-border text-[9px] font-black uppercase text-muted">
                          {TYPE_LABELS[ev.type] || ev.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-[10px] text-muted flex items-center gap-1">
                          <Calendar size={10} /> {formatDateTime(ev.start_datetime)}
                        </span>
                        {ev.venue_name && (
                          <span className="text-[10px] text-muted flex items-center gap-1">
                            <MapPin size={10} /> {ev.venue_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-accent font-bold flex items-center gap-1">
                          <Building2 size={10} /> {contextName}
                        </span>
                        <span className="text-[10px] text-muted flex items-center gap-1">
                          <Users size={10} /> {clientName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Attendee count + actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-black text-foreground">{confirmedCount}<span className="text-muted font-bold">/{activeAttendees.length}</span></p>
                      <p className="text-[9px] font-black text-muted uppercase tracking-widest">confirmados</p>
                    </div>

                    <button
                      onClick={() => setEditingEvent(ev)}
                      className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent active:scale-90 transition-transform"
                      title="Gestionar evento"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setEditingAttendee({ event_id: ev.id, attendance_status: 'pending', transport_required: false })}
                      className="w-9 h-9 rounded-xl bg-blue-400/10 flex items-center justify-center text-blue-400 active:scale-90 transition-transform"
                      title="Añadir asistente"
                    >
                      <UserPlus size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="w-9 h-9 rounded-xl bg-red-400/10 flex items-center justify-center text-red-400 active:scale-90 transition-transform"
                      title="Eliminar evento"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Attendees row */}
                {activeAttendees.length > 0 && (
                  <div className="px-5 pb-5">
                    <div className="border-t border-border/50 pt-4 flex flex-wrap gap-2">
                      {activeAttendees.map(a => (
                        <div
                          key={a.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border border-border text-[10px] group"
                        >
                          {a.profiles?.avatar_url ? (
                            <img src={a.profiles.avatar_url} alt={getDisplayName(a)} className="w-4 h-4 rounded-full object-cover mr-1" />
                          ) : (
                            <span className={`w-1.5 h-1.5 rounded-full ${a.attendance_status === 'confirmed' ? 'bg-emerald-400' : a.attendance_status === 'declined' ? 'bg-red-400' : 'bg-amber-400'}`} />
                          )}
                          <span className="font-bold text-foreground">{getDisplayName(a)}</span>
                          {a.dietary_restrictions && (
                            <span className="text-muted">{a.dietary_restrictions}</span>
                          )}
                          <button
                            onClick={() => setEditingAttendee({ ...a, event_id: a.event_id })}
                            className="text-muted/40 hover:text-accent opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Edit2 size={10} />
                          </button>
                          <button
                            onClick={() => handleDeleteAttendee(a)}
                            className="text-muted/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Edit Event
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {editingEvent && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-background border border-border w-full max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl my-8"
            >
              {/* Header */}
              <div className="p-8 border-b border-border flex justify-between items-start bg-muted/20">
                <div>
                  <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-1">Editar Evento</p>
                  <h3 className="text-2xl font-black tracking-tighter">{editingEvent.title || 'Nuevo Evento'}</h3>
                  {editingEvent.plan && (
                    <p className="text-xs text-muted mt-1">
                      {editingEvent.plan.contexts?.name} ·{' '}
                      {editingEvent.plan.profiles?.nombre} {editingEvent.plan.profiles?.apellidos || ''}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { setEditingEvent(null); setEventError(null); }}
                  className="p-2.5 rounded-2xl bg-surface border border-border text-muted hover:text-foreground transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                {eventError && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                    <X size={14} className="flex-shrink-0" /> {eventError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Type */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Tipo</label>
                    <select
                      value={editingEvent.type}
                      onChange={e => setEditingEvent({ ...editingEvent, type: e.target.value as any })}
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent appearance-none"
                    >
                      <option value="dinner">Cena VIP</option>
                      <option value="lunch">Comida VIP</option>
                      <option value="meeting">Reunión</option>
                      <option value="experience">Experiencia</option>
                    </select>
                  </div>

                  {/* Plan Selection (Only for new events) */}
                  {!editingEvent.id && (
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Congreso / Evento Global</label>
                        <select
                          className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent appearance-none"
                          onChange={e => {
                            const ctxId = e.target.value;
                            const ctx = allContexts.find(c => c.id === ctxId);
                            setEditingEvent({ ...editingEvent, plan_id: '', plan: { ...editingEvent.plan, contexts: ctx } as any });
                          }}
                          value={editingEvent.plan?.contexts?.id || ''}
                        >
                          <option value="">Seleccionar congreso...</option>
                          {allContexts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Cliente Responsable (Plan)</label>
                        <select
                          className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent appearance-none disabled:opacity-50"
                          disabled={!editingEvent.plan?.contexts?.id}
                          value={editingEvent.plan_id}
                          onChange={e => setEditingEvent({ ...editingEvent, plan_id: e.target.value })}
                        >
                          <option value="">Seleccionar cliente...</option>
                          {allPlans
                            .filter(p => p.context_id === editingEvent.plan?.contexts?.id)
                            .map(p => (
                              <option key={p.id} value={p.id}>
                                {p.profiles?.nombre} {p.profiles?.apellidos} ({p.profiles?.email})
                              </option>
                            ))
                          }
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Estado</label>
                    <select
                      value={editingEvent.status}
                      onChange={e => setEditingEvent({ ...editingEvent, status: e.target.value as any })}
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent appearance-none"
                    >
                      <option value="planned">Planificado</option>
                      <option value="confirmed">Confirmado</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <Field
                      label="Título del Evento"
                      value={editingEvent.title}
                      onChange={v => setEditingEvent({ ...editingEvent, title: v })}
                      placeholder="Ej: Cena de Bienvenida SEPAR 2025"
                    />
                  </div>

                  {/* Datetimes */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Inicio</label>
                    <input
                      type="datetime-local"
                      value={editingEvent.start_datetime?.slice(0, 16) || ''}
                      onChange={e => setEditingEvent({ ...editingEvent, start_datetime: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Fin (opcional)</label>
                    <input
                      type="datetime-local"
                      value={editingEvent.end_datetime?.slice(0, 16) || ''}
                      onChange={e => setEditingEvent({ ...editingEvent, end_datetime: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent"
                    />
                  </div>

                  <Field label="Establecimiento / Sede" value={editingEvent.venue_name} onChange={v => setEditingEvent({ ...editingEvent, venue_name: v })} />
                  <Field label="Dirección" value={editingEvent.venue_address} onChange={v => setEditingEvent({ ...editingEvent, venue_address: v })} />
                  <Field label="Dress Code" value={editingEvent.dress_code} onChange={v => setEditingEvent({ ...editingEvent, dress_code: v })} />
                  <Field label="Cód. Reserva" value={editingEvent.reservation_code} onChange={v => setEditingEvent({ ...editingEvent, reservation_code: v })} />
                  <Field label="Nombre Reserva" value={editingEvent.reservation_name} onChange={v => setEditingEvent({ ...editingEvent, reservation_name: v })} />
                  <Field label="Contacto" value={editingEvent.contact_name} onChange={v => setEditingEvent({ ...editingEvent, contact_name: v })} />
                  <Field label="Teléfono Contacto" value={editingEvent.contact_phone} onChange={v => setEditingEvent({ ...editingEvent, contact_phone: v })} />

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Descripción / Menú</label>
                    <textarea
                      rows={3}
                      value={editingEvent.description || ''}
                      onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent resize-none"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Notas internas</label>
                    <textarea
                      rows={2}
                      value={editingEvent.notes || ''}
                      onChange={e => setEditingEvent({ ...editingEvent, notes: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent resize-none"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border">
                    <div>
                      <p className="text-xs font-black">Sala privada</p>
                      <p className="text-[10px] text-muted">Reserva de sala exclusiva</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingEvent({ ...editingEvent, private_room: !editingEvent.private_room })}
                      className={`w-12 h-6 rounded-full transition-colors ${editingEvent.private_room ? 'bg-accent' : 'bg-border'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${editingEvent.private_room ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border">
                    <div>
                      <p className="text-xs font-black">Visible al cliente</p>
                      <p className="text-[10px] text-muted">Aparece en la app del usuario</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingEvent({ ...editingEvent, visible_to_client: !editingEvent.visible_to_client })}
                      className={`w-12 h-6 rounded-full transition-colors ${editingEvent.visible_to_client ? 'bg-accent' : 'bg-border'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${editingEvent.visible_to_client ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {/* ── Attendees section inside event modal ── */}
                <div className="pt-6 border-t border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase text-accent tracking-[0.2em]">
                      Asistentes ({editingEvent.attendees?.filter(a => !a.deleted_at).length || 0})
                    </h4>
                    <button
                      type="button"
                      onClick={() => setEditingAttendee({ event_id: editingEvent.id, attendance_status: 'pending', transport_required: false })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/10 text-accent text-[10px] font-black hover:bg-accent hover:text-background transition-colors"
                    >
                      <UserPlus size={12} /> Añadir
                    </button>
                  </div>

                  {(editingEvent.attendees?.filter(a => !a.deleted_at) || []).length === 0 ? (
                    <p className="text-xs text-muted py-4 text-center">Sin asistentes registrados todavía.</p>
                  ) : (
                    <div className="space-y-2">
                      {editingEvent.attendees!.filter(a => !a.deleted_at).map(a => (
                        <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-foreground">{getDisplayName(a)}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase ${ATTENDANCE_STYLES[a.attendance_status]}`}>
                                {ATTENDANCE_LABELS[a.attendance_status]}
                              </span>
                              {a.dietary_restrictions && (
                                <span className="text-[10px] text-muted">{a.dietary_restrictions}</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingAttendee({ ...a, event_id: a.event_id })}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-accent transition-colors"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttendee(a)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border flex gap-3 bg-surface">
                <Button
                  variant="ghost"
                  className="flex-1 rounded-2xl py-5"
                  onClick={() => { setEditingEvent(null); setEventError(null); }}
                  disabled={savingEvent}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-[2] rounded-2xl py-5 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                  onClick={handleSaveEvent}
                  disabled={savingEvent}
                >
                  {savingEvent ? (
                    <><Loader2 size={14} className="animate-spin" /> Guardando…</>
                  ) : (
                    <><Check size={14} /> Guardar Cambios</>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Add / Edit Attendee
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {editingAttendee && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-end md:items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-background border border-border w-full max-w-md rounded-t-[2rem] md:rounded-[2rem] overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
                <div>
                  <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-0.5">
                    {editingAttendee.id ? 'Editar Asistente' : 'Nuevo Asistente'}
                  </p>
                  <h4 className="text-lg font-black tracking-tight">
                    {editingAttendee.id ? getDisplayName(editingAttendee as AttendeeWithProfile) : 'Añadir al evento'}
                  </h4>
                </div>
                <button
                  onClick={() => { setEditingAttendee(null); setAttendeeError(null); }}
                  className="p-2 rounded-xl bg-surface border border-border text-muted hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {attendeeError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                    <X size={12} /> {attendeeError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1 flex items-center gap-2">
                    <Users size={11} /> Vincular a usuario del plan
                    {profilesLoading && <Loader2 size={10} className="animate-spin" />}
                  </label>
                  <select
                    className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent appearance-none"
                    value={editingAttendee.profile_id || ''}
                    onChange={e => {
                      const pid = e.target.value;
                      const profile = contextProfiles.find(p => p.id === pid);
                      setEditingAttendee({
                        ...editingAttendee,
                        profile_id: pid || null,
                        guest_name: profile ? `${profile.nombre} ${profile.apellidos}` : editingAttendee.guest_name,
                        guest_email: profile ? profile.email : editingAttendee.guest_email
                      });
                    }}
                  >
                    <option value="">— Invitado externo (manual) —</option>
                    {contextProfiles.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} {p.apellidos} ({p.email})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[9px] font-black text-muted uppercase tracking-widest">O datos manuales</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <Field
                  label="Nombre completo"
                  value={editingAttendee.guest_name}
                  onChange={v => setEditingAttendee({ ...editingAttendee, guest_name: v })}
                  placeholder="Ej: Dr. Juan García"
                />
                <Field
                  label="Email (opcional)"
                  value={editingAttendee.guest_email}
                  onChange={v => setEditingAttendee({ ...editingAttendee, guest_email: v })}
                  type="email"
                  placeholder="juan@hospital.com"
                />

                {/* Attendance status */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Estado de asistencia</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['pending', 'confirmed', 'declined'] as const).map(status => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setEditingAttendee({ ...editingAttendee, attendance_status: status })}
                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                          editingAttendee.attendance_status === status
                            ? status === 'confirmed' ? 'bg-emerald-400 text-background border-emerald-400'
                              : status === 'declined' ? 'bg-red-400 text-background border-red-400'
                              : 'bg-amber-400 text-background border-amber-400'
                            : 'bg-surface border-border text-muted hover:border-accent/30'
                        }`}
                      >
                        {ATTENDANCE_LABELS[status]}
                      </button>
                    ))}
                  </div>
                </div>

                <Field
                  label="Restricciones dietéticas"
                  value={editingAttendee.dietary_restrictions}
                  onChange={v => setEditingAttendee({ ...editingAttendee, dietary_restrictions: v })}
                  placeholder="Vegano, sin gluten, alérgico…"
                />

                {/* Transport toggle */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border">
                  <div>
                    <p className="text-xs font-black">Necesita transporte</p>
                    <p className="text-[10px] text-muted">Traslado al evento incluido</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingAttendee({ ...editingAttendee, transport_required: !editingAttendee.transport_required })}
                    className={`w-12 h-6 rounded-full transition-colors ${editingAttendee.transport_required ? 'bg-accent' : 'bg-border'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${editingAttendee.transport_required ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Notas</label>
                  <textarea
                    rows={2}
                    value={editingAttendee.notes || ''}
                    onChange={e => setEditingAttendee({ ...editingAttendee, notes: e.target.value })}
                    placeholder="Observaciones para el coordinador…"
                    className="w-full bg-background border border-border rounded-xl p-3 text-sm outline-none focus:border-accent resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-border flex gap-3 bg-surface">
                <Button
                  variant="ghost"
                  className="flex-1 rounded-2xl py-5"
                  onClick={() => { setEditingAttendee(null); setAttendeeError(null); }}
                  disabled={savingAttendee}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-[2] rounded-2xl py-5 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                  onClick={handleSaveAttendee}
                  disabled={savingAttendee || (!editingAttendee.guest_name && !editingAttendee.profile_id)}
                >
                  {savingAttendee ? (
                    <><Loader2 size={14} className="animate-spin" /> Guardando…</>
                  ) : (
                    <><Check size={14} /> {editingAttendee.id ? 'Guardar cambios' : 'Añadir asistente'}</>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
