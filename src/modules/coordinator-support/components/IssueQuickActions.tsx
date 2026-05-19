'use client';

import React, { useState, useTransition } from 'react';
import { createSupportRequestAction } from '../support-actions';
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  HelpCircle, 
  PhoneCall, 
  FileText, 
  Navigation,
  MessageSquare,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IssueQuickActionsProps {
  planId?: string;
  profileId: string;
  coordinatorId?: string | null;
  entityContext?: { type: string; id: string; name: string } | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const QUICK_ISSUES = [
  { 
    id: 'no_driver', 
    label: 'No encuentro al conductor', 
    type: 'transfer', 
    priority: 'high' as const,
    icon: Navigation,
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20'
  },
  { 
    id: 'flight_delayed', 
    label: 'Mi vuelo se retrasa', 
    type: 'flight', 
    priority: 'normal' as const,
    icon: Clock,
    color: 'text-sky-400 bg-sky-400/10 border-sky-400/20'
  },
  { 
    id: 'change_transfer', 
    label: 'Necesito cambiar el transfer', 
    type: 'transfer', 
    priority: 'normal' as const,
    icon: Navigation,
    color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20'
  },
  { 
    id: 'no_hotel', 
    label: 'No encuentro el hotel', 
    type: 'hotel', 
    priority: 'high' as const,
    icon: MapPin,
    color: 'text-rose-400 bg-rose-400/10 border-rose-400/20'
  },
  { 
    id: 'booking_problem', 
    label: 'Problema con la reserva', 
    type: 'booking', 
    priority: 'normal' as const,
    icon: FileText,
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
  },
  { 
    id: 'contact_coordinator', 
    label: 'Necesito contactar con el coordinador', 
    type: 'chat', 
    priority: 'normal' as const,
    icon: PhoneCall,
    color: 'text-accent bg-accent/10 border-accent/20'
  },
  { 
    id: 'other', 
    label: 'Otro problema', 
    type: 'other', 
    priority: 'normal' as const,
    icon: HelpCircle,
    color: 'text-muted bg-muted/10 border-muted/20'
  }
];

export default function IssueQuickActions({
  planId,
  profileId,
  coordinatorId,
  entityContext,
  onSuccess,
  onCancel
}: IssueQuickActionsProps) {
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeIssue = QUICK_ISSUES.find(i => i.id === selectedIssue);

  const handleSubmit = () => {
    if (!selectedIssue) return;

    startTransition(async () => {
      setErrorMsg(null);
      
      const issue = QUICK_ISSUES.find(i => i.id === selectedIssue);
      if (!issue) return;

      // Si hay un contexto de entidad forzado externamente (ej. abierto desde un transfer)
      const relatedEntity = entityContext ? entityContext.type : issue.type;
      const relatedEntityId = entityContext ? entityContext.id : undefined;

      const result = await createSupportRequestAction({
        plan_id: planId,
        profile_id: profileId,
        coordinator_id: coordinatorId,
        type: issue.type,
        title: entityContext ? `${issue.label} (${entityContext.name})` : issue.label,
        message: details,
        priority: issue.priority,
        related_entity: relatedEntity,
        related_entity_id: relatedEntityId,
        metadata: {
          submitted_via: 'client_quick_actions',
          context_name: entityContext?.name || null
        }
      });

      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setErrorMsg(result.error || 'Ocurrió un error al enviar el reporte.');
      }
    });
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent animate-bounce">
          <CheckCircle size={32} />
        </div>
        <div className="space-y-1">
          <h4 className="text-base font-bold text-white uppercase tracking-tight">Reporte Recibido</h4>
          <p className="text-xs text-muted max-w-xs leading-relaxed">
            Tu incidencia ha sido notificada al equipo de soporte concierge. Estamos trabajando en ello.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {entityContext && (
        <div className="p-4 rounded-2xl bg-accent/5 border border-accent/20 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
            <AlertTriangle size={16} />
          </div>
          <div className="text-left leading-tight">
            <p className="text-[9px] font-black uppercase text-accent tracking-wider">Reporte Contextual</p>
            <p className="text-xs font-bold text-white mt-0.5">Asociado a: {entityContext.name}</p>
          </div>
        </div>
      )}

      {/* Grid de Incidencias */}
      {!selectedIssue ? (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted ml-1">¿Qué está ocurriendo?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {QUICK_ISSUES.map(issue => {
              const Icon = issue.icon;
              return (
                <button
                  key={issue.id}
                  onClick={() => setSelectedIssue(issue.id)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl border text-left text-xs font-semibold transition-all hover:bg-white/5 active:scale-95 group",
                    issue.color
                  )}
                >
                  <Icon size={16} className="shrink-0 transition-transform group-hover:scale-110" />
                  <span className="text-white/90 group-hover:text-white leading-tight">{issue.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-muted">Seleccionado:</span>
              <span className="text-xs font-bold text-white bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                {activeIssue?.label}
              </span>
            </div>
            <button 
              onClick={() => { setSelectedIssue(null); setErrorMsg(null); }}
              className="text-[10px] font-black uppercase tracking-widest text-accent hover:underline"
            >
              Cambiar
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-muted ml-1">Detalles adicionales (opcional)</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Añade detalles sobre lo que ocurre (número de vuelo, ubicación exacta, etc.)..."
              className="w-full h-24 rounded-2xl bg-black/40 border border-white/10 p-4 text-xs text-white placeholder-muted focus:outline-none focus:border-accent/40 transition-colors resize-none"
            />
          </div>

          {errorMsg && (
            <p className="text-[10px] font-black uppercase tracking-wide text-rose-500 text-center">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={onCancel}
              disabled={isPending}
              className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-1 py-3 rounded-2xl bg-accent text-background text-[11px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              {isPending ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Reporte'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
