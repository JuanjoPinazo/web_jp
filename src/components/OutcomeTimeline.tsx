'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  PlaneTakeoff, 
  PlaneLanding, 
  Building2, 
  Car, 
  Utensils, 
  MapPin, 
  Headphones,
  Circle,
  FileText,
  Trophy,
  Plane
} from 'lucide-react';
import { FullTravelPlan } from '@/hooks/useTravelPlans';

interface OutcomeTimelineProps {
  plan?: FullTravelPlan | null;
}

export function OutcomeTimeline({ plan }: OutcomeTimelineProps) {
  
  const timelineSteps = useMemo(() => {
    if (!plan) return [];

    const events: any[] = [];

    const sortedFlights = [...plan.flights]
      .filter(f => f.is_verified)
      .sort((a, b) => new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime());
    
    // Group 1: IDA (Outbound)
    const outboundFlights = sortedFlights.filter(f => f.type === 'outbound' || !f.type); // Default to outbound if not specified
    if (outboundFlights.length > 0) {
      const f = outboundFlights[0];
      const depTime = new Date(f.departure_time);
      events.push({
        id: 'header-ida',
        type: 'header',
        title: `✈️ TRAYECTO IDA · ${depTime.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' }).toUpperCase()}`,
        time: new Date(depTime.getTime() - 1000), 
        icon: Plane,
        color: 'text-purple-500'
      });

      outboundFlights.forEach(flight => {
        const dTime = new Date(flight.departure_time);
        events.push({
          id: `flight-dep-${flight.id}`,
          title: 'Salida',
          time: dTime,
          originalTime: flight.departure_time?.split('T')[1]?.substring(0, 5),
          location: flight.departure_location || 'Origen',
          desc: `${flight.airline || ''} ${flight.flight_number || ''}. Ref: ${flight.reservation_code || 'Confirmado'}.`,
          icon: PlaneTakeoff,
          color: 'text-purple-500'
        });

        if (flight.arrival_time) {
          events.push({
            id: `flight-arr-${flight.id}`,
            title: 'Llegada',
            time: new Date(flight.arrival_time),
            originalTime: flight.arrival_time?.split('T')[1]?.substring(0, 5),
            location: flight.arrival_location || 'Destino',
            desc: `Aterrizaje previsto. ${plan.transfers.length > 0 ? 'Transfer esperándote.' : ''}`,
            icon: PlaneLanding,
            color: 'text-blue-500'
          });
        }
      });
    }

    // Intermediate Hotels & Events
    plan.hotels.forEach(h => {
      events.push({
        id: `hotel-in-${h.id}`,
        title: `Check-in Hotel`,
        time: new Date(h.check_in),
        originalTime: h.check_in?.split('T')[1]?.substring(0, 5),
        location: h.hotel_name,
        desc: `${h.address || ''} ${h.room_type ? `· Hab: ${h.room_type}` : ''}`,
        icon: Building2,
        color: 'text-emerald-500'
      });
    });

    if (plan.contexts?.name) {
      events.push({
        id: `event-${plan.context_id}`,
        title: `Congreso: ${plan.contexts.name}`,
        time: plan.contexts.start_date ? new Date(plan.contexts.start_date) : new Date(),
        location: plan.contexts.location || 'Sede del Evento',
        desc: 'Acceso VIP confirmado. Tu acreditación está lista.',
        icon: Trophy,
        color: 'text-emerald-400'
      });
    }

    // Group 2: VUELTA (Return)
    const returnFlights = sortedFlights.filter(f => f.type === 'return');
    if (returnFlights.length > 0) {
      const f = returnFlights[0];
      const depTime = new Date(f.departure_time);
      
      events.push({
        id: 'header-vuelta',
        type: 'header',
        title: `✈️ TRAYECTO VUELTA · ${depTime.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' }).toUpperCase()}`,
        time: new Date(depTime.getTime() - 1000),
        icon: Plane,
        color: 'text-purple-500'
      });

      returnFlights.forEach(flight => {
        const dTime = new Date(flight.departure_time);
        events.push({
          id: `flight-dep-${flight.id}`,
          title: 'Salida',
          time: dTime,
          originalTime: flight.departure_time?.split('T')[1]?.substring(0, 5),
          location: flight.departure_location || 'Origen',
          desc: `${flight.airline || ''} ${flight.flight_number || ''}. Ref: ${flight.reservation_code || 'Confirmado'}.`,
          icon: PlaneTakeoff,
          color: 'text-purple-500'
        });

        if (flight.arrival_time) {
          events.push({
            id: `flight-arr-${flight.id}`,
            title: 'Llegada',
            time: new Date(flight.arrival_time),
            originalTime: flight.arrival_time?.split('T')[1]?.substring(0, 5),
            location: flight.arrival_location || 'Destino',
            desc: `Aterrizaje y fin de trayecto operativo.`,
            icon: PlaneLanding,
            color: 'text-blue-500'
          });
        }
      });
    }

    // Sort by time
    events.sort((a, b) => a.time.getTime() - b.time.getTime());

    // Format time strings
    return events.map(e => {
      let timeString = '';
      if (e.type !== 'header') {
        // Si tenemos un objeto Date que vino de un ISO string, intentamos sacar la hora cruda
        const iso = e.time.toISOString(); // Esto es UTC, pero si lo guardamos como local...
        // Mejor: Si el evento tiene una propiedad 'originalTime' (que añadiremos), la usamos.
        timeString = e.originalTime || e.time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      }
      
      return {
        ...e,
        timeString
      };
    });
  }, [plan]);

  if (!plan) return null;

  return (
    <div className="space-y-12 py-4">
      <div className="relative">
        {/* Continuous Line */}
        <div className="absolute left-[21px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-accent/40 via-accent/5 to-transparent" />

        <div className="space-y-10">
          {timelineSteps.map((step, i) => {
            if (step.type === 'header') {
              return (
                <div key={step.id} className="relative z-10 pt-4 pb-2">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg bg-surface border border-border shadow-sm ${step.color}`}>
                      <step.icon size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/80">
                      {step.title}
                    </h3>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                </div>
              );
            }

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative flex gap-10 group"
              >
                {/* Icon Container */}
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center ${step.color} shadow-lg group-hover:scale-110 transition-all duration-500`}>
                    <step.icon size={20} strokeWidth={2.5} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pt-1 space-y-2">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-baseline gap-1">
                    <h4 className="text-xl font-black text-foreground tracking-tight">{step.title}</h4>
                    {step.timeString && (
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">{step.timeString}</span>
                    )}
                  </div>
                  {step.location && (
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted">
                        {step.location}
                    </div>
                  )}
                  {step.desc && (
                    <p className="text-xs font-medium text-muted/80 leading-relaxed max-w-sm">
                      {step.desc}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
          
          {/* Support Node */}
          {plan.support_phone && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative flex gap-10 group"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center text-muted shadow-md group-hover:scale-110 transition-transform">
                  <Headphones size={20} />
                </div>
              </div>

              <div className="flex-1 pt-1 space-y-2">
                <div className="flex justify-between items-baseline gap-4">
                  <h4 className="text-lg font-black text-foreground">Soporte Continuo</h4>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/80">24/7</span>
                </div>
                <p className="text-sm text-muted leading-relaxed max-w-sm">
                  Cualquier imprevisto durante la operativa está cubierto.
                </p>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
