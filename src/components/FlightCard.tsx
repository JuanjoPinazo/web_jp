'use client';

import React from 'react';
import { Plane, Clock, MapPin, Ticket, User, Briefcase, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Flight } from '@/hooks/useTravelPlans';
import { 
  calculateDistance, 
  calculateDuration, 
  formatDuration as formatDurationStr, 
  calculateCheckinDeadline 
} from '@/lib/flight-utils';

interface FlightCardProps {
  flight: Flight;
  role: 'admin' | 'client';
  actions?: React.ReactNode;
  className?: string;
}

export function FlightCard({ flight, role, actions, className }: FlightCardProps) {
  const isAdmin = role === 'admin';

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const timePart = dateStr.split('T')[1];
    return timePart ? timePart.substring(0, 5) : '';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  // 1. Calculate duration automatically if missing
  const duration = flight.duration_minutes || (flight.departure_time && flight.arrival_time ? calculateDuration(flight.departure_time, flight.arrival_time) : null);

  // 2. Calculate distance automatically if missing
  const distance = flight.distance_km || (flight.departure_location && flight.arrival_location ? calculateDistance(flight.departure_location, flight.arrival_location) : null);

  // 3. Calculate check-in deadline if missing (45 min before)
  const checkinDeadline = flight.checkin_deadline || (flight.departure_time ? calculateCheckinDeadline(flight.departure_time) : null);

  const formatCheckinTime = (isoStr?: string | null) => {
    if (!isoStr) return null;
    const date = new Date(isoStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn(
      "relative bg-surface border border-border rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group",
      className
    )}>
      {/* Background Accent Gradient */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[80px] -mr-32 -mt-32 pointer-events-none" />
      
      {/* Header: Airline & Flight Number */}
      <div className="px-8 py-5 bg-surface-subtle/50 border-b border-border flex justify-between items-center relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <Plane size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted tracking-[0.2em] leading-none mb-1.5">Información de Vuelo</p>
            <p className="text-xs font-black text-foreground uppercase tracking-tight">
              {flight.airline || (isAdmin ? <span className="text-orange-500 italic text-[10px]">Configurar</span> : 'Confirmado')}
              {flight.flight_number && <span className="text-muted font-bold ml-2">#{flight.flight_number}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black uppercase text-muted tracking-[0.2em] leading-none mb-1.5">Localizador</p>
            <p className="text-sm font-mono font-black text-accent tracking-tighter">{flight.reservation_code || (isAdmin ? <span className="text-orange-500 italic text-[10px]">S/L</span> : 'S/R')}</p>
          </div>
          {actions && <div className="flex gap-2 border-l border-border pl-6">{actions}</div>}
        </div>
      </div>

      {/* Main Body: Airline Style Route */}
      <div className="p-8 md:p-10 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-4 mb-10">
          {/* Origin */}
          <div className="flex-1 text-center md:text-left w-full">
            <h3 className="text-3xl md:text-6xl font-black text-foreground tracking-tighter leading-none mb-2">{flight.departure_location}</h3>
            <div className="space-y-1">
              <p className="text-xl font-black text-foreground/90 tracking-tight flex items-center justify-center md:justify-start gap-2">
                {formatTime(flight.departure_time)}
              </p>
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{formatDate(flight.departure_time)}</p>
              {flight.departure_terminal && (
                <div className="inline-flex mt-2 px-2 py-0.5 rounded-md bg-accent/5 border border-accent/10 text-[9px] font-black text-accent uppercase tracking-widest">
                  Terminal {flight.departure_terminal}
                </div>
              )}
            </div>
          </div>

          {/* Airline Path Visual */}
          <div className="flex flex-col items-center gap-2 w-full md:w-64">
             <div className="relative w-full flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                   <div className="w-full border-t-2 border-dashed border-border/80" />
                </div>
                <div className="relative z-10 px-4 bg-surface">
                   <div className="p-3 rounded-full bg-accent/10 border border-accent/20 text-accent group-hover:rotate-[45deg] transition-all duration-700">
                      <Plane size={24} strokeWidth={2.5} />
                   </div>
                </div>
             </div>
             {duration && (
               <div className="relative">
                 <p className="text-[11px] font-black text-muted uppercase tracking-[0.2em] bg-surface px-3 py-1">
                   {formatDurationStr(duration)}
                 </p>
               </div>
             )}
          </div>

          {/* Destination */}
          <div className="flex-1 text-center md:text-right w-full">
            <h3 className="text-3xl md:text-6xl font-black text-foreground tracking-tighter leading-none mb-2">{flight.arrival_location}</h3>
            <div className="space-y-1">
              <p className="text-xl font-black text-foreground/90 tracking-tight flex items-center justify-center md:justify-end gap-2">
                {formatTime(flight.arrival_time)}
              </p>
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{formatDate(flight.arrival_time)}</p>
              {flight.arrival_terminal && (
                <div className="inline-flex mt-2 px-2 py-0.5 rounded-md bg-accent/5 border border-accent/10 text-[9px] font-black text-accent uppercase tracking-widest">
                  Terminal {flight.arrival_terminal}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-border/60">
          <DetailItem icon={User} label="Asiento" value={flight.seat} isAdmin={isAdmin} />
          <DetailItem 
            icon={Briefcase} 
            label="Equipaje" 
            value={flight.baggage_info || (isAdmin ? null : 'Equipaje de mano incluido')} 
            isAdmin={isAdmin} 
          />
          <DetailItem 
            icon={Ticket} 
            label="Check-in" 
            value={formatCheckinTime(checkinDeadline)} 
            isAdmin={isAdmin} 
          />
          <DetailItem 
            icon={MapPin} 
            label="Distancia" 
            value={distance ? `${distance} km` : undefined} 
            isAdmin={isAdmin} 
          />
        </div>
      </div>

      {/* Footer Status */}
      {!flight.is_verified && (
        <div className="px-8 py-3 bg-orange-500/10 border-t border-orange-500/20 flex items-center gap-3 text-[10px] font-black text-orange-600 uppercase tracking-[0.1em]">
          <AlertCircle size={14} /> Logística en proceso de validación operacional
        </div>
      )}
    </div>
  );
}

const DetailItem = ({ icon: Icon, label, value, isAdmin }: any) => {
  if (!value && !isAdmin) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-muted">
        <Icon size={14} />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-sm font-black text-foreground">
        {value || <span className="text-orange-500 italic text-[10px]">Configurar</span>}
      </p>
    </div>
  );
};
