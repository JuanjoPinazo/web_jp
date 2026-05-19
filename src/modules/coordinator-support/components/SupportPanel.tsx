'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  X,
  MessageCircle,
  Phone,
  Mail,
  AlertCircle,
  ShieldAlert,
  Loader2,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FullTravelPlan } from '@/hooks/useTravelPlans';
import { User } from '@/types/platform';
import { SupportRequest } from '../support-types';
import { getSupportRequestsForUserAction } from '../support-actions';
import IssueQuickActions from './IssueQuickActions';

interface SupportPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activePlan: FullTravelPlan | null;
  profile: User | null;
  entityContext?: { type: string; id: string; name: string } | null;
}

export default function SupportPanel({
  isOpen,
  onClose,
  activePlan,
  profile,
  entityContext
}: SupportPanelProps) {
  const [showReportForm, setShowReportForm] = useState(false);
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [, startTransition] = useTransition();

  // Obtener coordinador del plan de viaje o fallback por defecto
  const coordinator = activePlan?.logistic_contact || {
    name: 'Juanjo Pinazo',
    role: 'Coordinador Concierge Principal',
    phone: '+34600000000',
    whatsapp: '34600000000',
    email: 'soporte@webjp.com',
    avatar_url: null
  };

  // Cargar incidencias previas
  const fetchRequests = () => {
    if (!profile?.id) return;
    setLoadingRequests(true);
    startTransition(async () => {
      const res = await getSupportRequestsForUserAction(profile.id);
      if (res.success && res.requests) {
        setRequests(res.requests);
      }
      setLoadingRequests(false);
    });
  };

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
      // Si nos pasan un contexto de evento, abrimos directamente el formulario de reporte
      if (entityContext) {
        setShowReportForm(true);
      } else {
        setShowReportForm(false);
      }
    }
  }, [isOpen, profile?.id, entityContext]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Panel Content */}
        <motion.div 
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full sm:max-w-lg bg-[#09090B] border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden text-foreground z-10"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-white/5 flex items-center justify-between shrink-0">
            <div className="space-y-0.5 text-left">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-accent">CONCIERGE ASSISTANCE</span>
              </div>
              <h3 className="text-base font-black tracking-tight text-white uppercase">Soporte Operativo</h3>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-12">
            
            {/* 1. Cabecera Concierge Premium */}
            {!showReportForm && (
              <div className="p-5 rounded-3xl bg-gradient-to-b from-[#111115]/80 to-[#111115]/30 border border-white/5 space-y-4 text-center">
                {/* Avatar */}
                <div className="flex justify-center">
                  {coordinator.avatar_url ? (
                    <img 
                      src={coordinator.avatar_url} 
                      alt={coordinator.name} 
                      className="w-16 h-16 rounded-full object-cover border border-accent/30 shadow-lg" 
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent text-xl font-bold">
                      {coordinator.name.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white leading-tight">{coordinator.name}</h4>
                  <p className="text-[10px] font-bold text-accent uppercase tracking-wider">{coordinator.role}</p>
                </div>

                <p className="text-[11px] text-muted leading-relaxed max-w-xs mx-auto italic">
                  “Estamos contigo durante todo el viaje. Si surge cualquier imprevisto, nuestro equipo de asistencia concierge está disponible de inmediato.”
                </p>

                {/* Acciones de Contacto Rápido */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <a 
                    href={`tel:${coordinator.phone}`}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:scale-95 transition-all text-muted hover:text-white"
                  >
                    <Phone size={16} className="text-accent" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Llamar</span>
                  </a>
                  
                  <a
                    href={`https://wa.me/${(coordinator.whatsapp ?? coordinator.phone ?? '').replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:scale-95 transition-all text-muted hover:text-white"
                  >
                    <MessageCircle size={16} className="text-emerald-400" />
                    <span className="text-[9px] font-black uppercase tracking-wider">WhatsApp</span>
                  </a>

                  <a 
                    href={`mailto:${coordinator.email}`}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:scale-95 transition-all text-muted hover:text-white"
                  >
                    <Mail size={16} className="text-sky-400" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Email</span>
                  </a>
                </div>
              </div>
            )}

            {/* 2. Sección Principal: Reportar Incidencia / Listado */}
            {showReportForm ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-xs font-black uppercase text-white tracking-wider">Reportar Incidencia</h4>
                  <button 
                    onClick={() => setShowReportForm(false)}
                    className="text-[10px] font-black uppercase tracking-widest text-muted hover:text-white"
                  >
                    Ver historial
                  </button>
                </div>
                <IssueQuickActions 
                  planId={activePlan?.id}
                  profileId={profile?.id || ''}
                  coordinatorId={activePlan?.logistic_contact_id || (coordinator as any).id || null}
                  entityContext={entityContext}
                  onSuccess={() => {
                    setShowReportForm(false);
                    fetchRequests();
                  }}
                  onCancel={() => setShowReportForm(false)}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={() => setShowReportForm(true)}
                  className="w-full py-4 rounded-2xl bg-accent text-background text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
                >
                  <AlertCircle size={14} />
                  Reportar una Incidencia
                </button>

                {/* Historial de incidencias */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase text-muted tracking-wider ml-1">Tus Reportes Recientes</h4>
                  
                  {loadingRequests ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-muted">
                      <Loader2 size={16} className="animate-spin text-accent" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Buscando reportes...</span>
                    </div>
                  ) : requests.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center text-muted gap-1 flex flex-col items-center">
                      <HelpCircle size={20} className="opacity-40 animate-pulse" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted mt-1">Sin incidencias activas</p>
                      <p className="text-[9px] text-muted/60 leading-tight max-w-xs">Cualquier reporte que realices aparecerá aquí para su seguimiento en vivo.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {requests.map(req => (
                        <div 
                          key={req.id}
                          className="p-4 rounded-2xl bg-[#111115]/50 border border-white/5 space-y-2.5 text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-white leading-snug">{req.title}</p>
                              <p className="text-[9px] text-muted">
                                {new Date(req.created_at).toLocaleDateString('es-ES', { 
                                  day: '2-digit', 
                                  month: 'short', 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </p>
                            </div>
                            
                            {/* Status Badge */}
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 border",
                              req.status === 'resolved' 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" 
                                : "bg-amber-500/10 text-amber-400 border-amber-500/25 animate-pulse"
                            )}>
                              {req.status === 'resolved' ? 'Resuelto' : 'En Curso'}
                            </span>
                          </div>

                          {req.message && (
                            <p className="text-[11px] text-muted/80 leading-relaxed bg-black/20 p-2.5 rounded-xl border border-white/5">
                              {req.message}
                            </p>
                          )}

                          {/* Notas de Administrador / Historial */}
                          {req.metadata?.internal_notes && req.metadata.internal_notes.length > 0 && (
                            <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                              <p className="text-[8px] font-black uppercase text-accent tracking-wider">Respuesta del Concierge:</p>
                              {req.metadata.internal_notes.map((note: any, idx: number) => (
                                <div key={idx} className="p-2 rounded-xl bg-accent/5 border border-accent/15 flex items-start gap-2">
                                  <ShieldAlert size={10} className="text-accent shrink-0 mt-0.5" />
                                  <div className="space-y-0.5 text-[10px]">
                                    <p className="text-white/95 leading-normal">{note.note}</p>
                                    <p className="text-[7px] text-muted">
                                      {new Date(note.added_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
