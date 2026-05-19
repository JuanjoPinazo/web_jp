'use client';

import React, { useEffect, useState } from 'react';
import { 
  getSupportRequestsForAdminAction, 
  updateSupportRequestStatusAction, 
  assignCoordinatorAction,
  getCoordinatorsAction
} from '@/modules/coordinator-support/support-actions';
import { SupportRequest } from '@/modules/coordinator-support/support-types';
import { 
  Loader2, MessageSquare, AlertTriangle, CheckCircle2, User, Phone, 
  MessageCircle, Clock, Calendar, Check, ExternalLink, RefreshCw, UserCheck, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialog } from '@/context/DialogContext';

export default function AdminSupportPage() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'open' | 'resolved' | 'all'>('open');
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const { alert, confirm } = useDialog();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqRes, coordRes] = await Promise.all([
        getSupportRequestsForAdminAction(),
        getCoordinatorsAction()
      ]);

      if (reqRes.success && reqRes.requests) {
        setRequests(reqRes.requests);
      } else {
        alert?.({ title: 'Error', message: reqRes.error || 'No se pudieron cargar las solicitudes', type: 'danger' });
      }

      if (coordRes.success && coordRes.coordinators) {
        setCoordinators(coordRes.coordinators);
      }
    } catch (err: any) {
      console.error(err);
      alert?.({ title: 'Error', message: 'Error de red al cargar datos', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (request: SupportRequest, newStatus: 'open' | 'resolved') => {
    if (newStatus === 'resolved') {
      const ok = await confirm?.({
        title: 'Marcar como resuelto',
        message: '¿Estás seguro de que deseas marcar esta incidencia como resuelta?',
        type: 'warning',
        confirmText: 'Resolver'
      });
      if (!ok) return;
    }

    setIsUpdating(true);
    try {
      const res = await updateSupportRequestStatusAction(request.id, newStatus, responseText || undefined);
      if (res.success && res.request) {
        setRequests(prev => prev.map(r => r.id === request.id ? res.request! : r));
        setResponseText('');
        setSelectedRequest(null);
        alert?.({ title: 'Éxito', message: `Incidencia ${newStatus === 'resolved' ? 'resuelta' : 'reabierta'} correctamente`, type: 'success' });
      } else {
        alert?.({ title: 'Error', message: res.error || 'Error al actualizar', type: 'danger' });
      }
    } catch (err: any) {
      alert?.({ title: 'Error', message: err.message || 'Error al procesar la solicitud', type: 'danger' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssignCoordinator = async (requestId: string, coordinatorId: string | null) => {
    setAssigningId(requestId);
    try {
      const res = await assignCoordinatorAction(requestId, coordinatorId);
      if (res.success && res.request) {
        setRequests(prev => prev.map(r => r.id === requestId ? res.request! : r));
        alert?.({ title: 'Éxito', message: 'Coordinador asignado correctamente', type: 'success' });
      } else {
        alert?.({ title: 'Error', message: res.error || 'Error al asignar', type: 'danger' });
      }
    } catch (err: any) {
      alert?.({ title: 'Error', message: err.message || 'Error al procesar asignación', type: 'danger' });
    } finally {
      setAssigningId(null);
    }
  };

  const filteredRequests = requests.filter(r => {
    if (activeTab === 'open') return r.status === 'open';
    if (activeTab === 'resolved') return r.status === 'resolved';
    return true;
  });

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  const formatRelatedEntity = (entity: string) => {
    switch (entity) {
      case 'flight': return 'Vuelo';
      case 'hotel': return 'Alojamiento';
      case 'transfer': return 'Traslado';
      case 'restaurant': return 'Restaurante';
      default: return entity;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-24 px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">Centro de Operaciones</p>
          <h1 className="text-3xl md:text-5xl font-black font-heading tracking-tight text-white">SOPORTE LIVE.</h1>
          <p className="text-muted text-xs font-medium">Asiste a los viajeros y resuelve incidencias en tiempo real.</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center justify-center gap-2 self-start md:self-auto px-5 py-3 rounded-2xl border border-border text-muted text-[10px] font-black uppercase tracking-widest hover:text-white transition-all bg-surface"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refrescar incidencias
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 p-1 bg-white/5 rounded-2xl max-w-md">
        {(['open', 'resolved', 'all'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
              activeTab === tab ? 'bg-accent text-background shadow-lg shadow-accent/25' : 'text-muted hover:text-white'
            }`}
          >
            {tab === 'open' ? 'Abiertas' : tab === 'resolved' ? 'Resueltas' : 'Todas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="animate-spin text-accent" size={32} />
          <p className="text-[10px] font-black text-muted uppercase tracking-widest">Sincronizando incidencias...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-16 rounded-[2.5rem] bg-surface border border-border/80 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent">
            <CheckCircle2 size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Todo en orden</h3>
            <p className="text-xs text-muted max-w-sm">No hay solicitudes de soporte con este estado en este momento.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Incidents List */}
          <div className="lg:col-span-2 space-y-4">
            {filteredRequests.map(req => {
              const name = `${req.profiles?.nombre || ''} ${req.profiles?.apellidos || ''}`.trim() || req.profiles?.email || 'Viajero';
              const formattedDate = req.created_at 
                ? new Date(req.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div 
                  key={req.id} 
                  className={`p-6 rounded-[2rem] bg-surface border border-border transition-all flex flex-col gap-5 hover:border-white/20 relative overflow-hidden ${
                    selectedRequest?.id === req.id ? 'ring-2 ring-accent/40 border-accent/20' : ''
                  }`}
                >
                  {/* Status Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getPriorityBadgeColor(req.priority)}`}>
                        {req.priority}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        req.status === 'open' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {req.status === 'open' ? 'Abierta' : 'Resuelta'}
                      </span>
                      {req.related_entity && (
                        <span className="px-2.5 py-0.5 bg-white/5 border border-white/10 text-white rounded-full text-[9px] font-black uppercase tracking-widest">
                          {formatRelatedEntity(req.related_entity)}: {req.metadata?.entity_name || 'Incidencia ligada'}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted font-bold flex items-center gap-1">
                      <Clock size={12} /> {formattedDate}
                    </span>
                  </div>

                  {/* Header / Client Card */}
                  <div className="flex items-center gap-3.5 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                      {req.profiles?.avatar_url ? (
                        <img src={req.profiles.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User size={18} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate leading-none mb-1">{name}</p>
                      <p className="text-[10px] text-muted truncate leading-none">{req.profiles?.email}</p>
                    </div>
                    {req.profiles?.telefono && (
                      <div className="flex gap-2">
                        <a 
                          href={`tel:${req.profiles.telefono}`}
                          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"
                          title="Llamar al cliente"
                        >
                          <Phone size={14} />
                        </a>
                        <a 
                          href={`https://wa.me/${req.profiles.telefono.replace(/[^\d+]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center text-emerald-400 transition-colors"
                          title="WhatsApp chat"
                        >
                          <MessageCircle size={14} />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Message body */}
                  <div className="space-y-2 text-left">
                    <h3 className="text-sm font-bold text-white leading-snug">{req.title}</h3>
                    <p className="text-xs text-muted leading-relaxed font-medium whitespace-pre-wrap">{req.message}</p>
                  </div>

                  {/* Response history */}
                  {req.metadata?.internal_notes && req.metadata.internal_notes.length > 0 && (
                    <div className="border-t border-white/5 pt-4 mt-1 space-y-3">
                      <p className="text-[9px] font-black uppercase text-muted tracking-widest">Notas de Resolución / Respuestas:</p>
                      <div className="space-y-2">
                        {req.metadata.internal_notes.map((note: any, idx: number) => (
                          <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/5 text-left text-[11px] leading-relaxed">
                            <p className="text-white/95 font-medium">{note.note}</p>
                            <span className="text-[9px] text-muted block mt-1">
                              {new Date(note.added_at).toLocaleString('es-ES')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="border-t border-white/5 pt-4 flex flex-wrap items-center justify-between gap-4">
                    {/* Coordinator assignment selection dropdown */}
                    <div className="flex items-center gap-2.5">
                      <span className="text-[9px] font-black uppercase text-muted tracking-widest flex items-center gap-1.5">
                        <UserCheck size={12} className="text-accent" /> Asignado:
                      </span>
                      {assigningId === req.id ? (
                        <Loader2 className="animate-spin text-accent" size={14} />
                      ) : (
                        <select
                          value={req.coordinator_id || ''}
                          onChange={(e) => handleAssignCoordinator(req.id, e.target.value || null)}
                          className="bg-[#111115] border border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-bold text-white focus:border-accent outline-none cursor-pointer"
                        >
                          <option value="">Sin Asignar (Ninguno)</option>
                          {coordinators.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.role || 'Coordinador'})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedRequest(req);
                        setResponseText('');
                      }}
                      className="px-4 py-2 rounded-xl bg-accent text-background text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all font-bold"
                    >
                      Responder / Editar Estado
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Details & Response Panel Drawer */}
          <div className="lg:col-span-1">
            <div className="bg-surface border border-border rounded-[2.5rem] p-6 sticky top-24 space-y-6 text-left">
              {selectedRequest ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-white tracking-tight uppercase">Responder Caso</h3>
                      <p className="text-[9px] font-black text-accent uppercase tracking-widest">Incidencia #{selectedRequest.id.slice(0, 8)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Nueva Nota / Respuesta al Cliente</label>
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Escribe la solución o respuesta que el cliente verá en su aplicación..."
                      rows={5}
                      className="w-full bg-[#111115] border border-white/10 rounded-2xl p-4 text-xs focus:border-accent/40 outline-none transition-all placeholder:text-muted/40"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedRequest, 'resolved')}
                      disabled={isUpdating}
                      className="w-full py-4 rounded-xl bg-emerald-500 text-background text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 font-bold shadow-lg shadow-emerald-500/10"
                    >
                      {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Marcar como Resuelto
                    </button>
                    {selectedRequest.status === 'resolved' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedRequest, 'open')}
                        disabled={isUpdating}
                        className="w-full py-4 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-500 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/30 transition-all flex items-center justify-center gap-2 font-bold"
                      >
                        {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Reabrir Caso
                      </button>
                    )}
                    {responseText && (
                      <button
                        onClick={async () => {
                          setIsUpdating(true);
                          try {
                            const res = await updateSupportRequestStatusAction(selectedRequest.id, selectedRequest.status, responseText);
                            if (res.success && res.request) {
                              setRequests(prev => prev.map(r => r.id === selectedRequest.id ? res.request! : r));
                              setResponseText('');
                              setSelectedRequest(null);
                              alert?.({ title: 'Éxito', message: 'Respuesta guardada y enviada al cliente', type: 'success' });
                            } else {
                              alert?.({ title: 'Error', message: res.error || 'Error al guardar nota', type: 'danger' });
                            }
                          } catch (err: any) {
                            alert?.({ title: 'Error', message: err.message || 'Error', type: 'danger' });
                          } finally {
                            setIsUpdating(false);
                          }
                        }}
                        disabled={isUpdating}
                        className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2 font-bold"
                      >
                        Enviar Respuesta (Mantener Abierto)
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-4 text-muted">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-muted/60">
                    <ChevronRight size={20} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">Selecciona una incidencia</p>
                    <p className="text-[10px] leading-relaxed max-w-[200px]">Elige una solicitud para responderla, asignarle un coordinador o cambiar su estado.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
