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
  FileText
} from 'lucide-react';
import { FullTravelPlan } from '@/hooks/useTravelPlans';

interface OutcomeTimelineProps {
  plan?: FullTravelPlan | null;
}

export function OutcomeTimeline({ plan }: OutcomeTimelineProps) {
  
  const timelineSteps = useMemo(() => {
    if (!plan) return [];

    const events: any[] = [];

    // Flights
    plan.flights.forEach(f => {
      events.push({
        id: `flight-dep-${f.id}`,
        title: `Salida de Vuelo`,
        time: new Date(f.departure_time),
        location: f.origin,
        desc: `Vuelo ${f.airline || ''} ${f.flight_number || ''} hacia ${f.destination}`,
        icon: PlaneTakeoff,
        color: 'text-purple-500'
      });
      events.push({
        id: `flight-arr-${f.id}`,
        title: `Llegada de Vuelo`,
        time: new Date(f.arrival_time),
        location: f.destination,
        desc: `Aterrizaje programado.`,
        icon: PlaneLanding,
        color: 'text-blue-500'
      });
    });

    // Hotels
    plan.hotels.forEach(h => {
      events.push({
        id: `hotel-in-${h.id}`,
        title: `Check-in Hotel`,
        time: new Date(h.check_in),
        location: h.hotel_name,
        desc: `Check-in en ${h.room_type || 'habitación'}. ${h.notes || ''}`,
        icon: Building2,
        color: 'text-emerald-500'
      });
      events.push({
        id: `hotel-out-${h.id}`,
        title: `Check-out Hotel`,
        time: new Date(h.check_out),
        location: h.hotel_name,
        desc: `Fin de la estancia.`,
        icon: Building2,
        color: 'text-emerald-500'
      });
    });

    // Transfers
    plan.transfers.forEach(t => {
      events.push({
        id: `transfer-${t.id}`,
        title: `Traslado Programado`,
        time: new Date(t.pickup_time),
        location: t.pickup_location,
        desc: `Conductor ${t.driver_name || 'asignado'} te llevará a ${t.dropoff_location}.`,
        icon: Car,
        color: 'text-amber-500'
      });
    });

    // Restaurants
    plan.restaurants.forEach(r => {
      events.push({
        id: `restaurant-${r.id}`,
        title: `Reserva Restaurante`,
        time: new Date(r.reservation_time),
        location: r.restaurant_name,
        desc: `Mesa a nombre de ${r.reservation_name || 'JP Intelligence'}. ${r.notes || ''}`,
        icon: Utensils,
        color: 'text-pink-500'
      });
    });

    // Documents (We just put them at the beginning of the timeline)
    plan.documents.forEach(d => {
      events.push({
        id: `doc-${d.id}`,
        title: `Documentación: ${d.title}`,
        time: new Date(0), // Push to the top
        location: 'Documento Digital',
        desc: `Puedes descargar este documento desde el portal.`,
        icon: FileText,
        color: 'text-accent'
      });
    });

    // Sort by time
    events.sort((a, b) => a.time.getTime() - b.time.getTime());

    // Format time strings
    return events.map(e => ({
      ...e,
      timeString: e.time.getTime() === 0 ? 'Documento' : e.time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', weekday: 'short'})
    }));
  }, [plan]);

  if (!plan) return null;

  return (
    <div className="space-y-12 py-4">
      <div className="relative">
        {/* Continuous Line */}
        <div className="absolute left-[21px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-accent/40 via-accent/10 to-transparent" />

        <div className="space-y-12">
          {timelineSteps.map((step, i) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="relative flex gap-8 group"
            >
              {/* Icon Container */}
              <div className="relative z-10">
                <div className={`w-11 h-11 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center ${step.color} shadow-lg group-hover:scale-110 transition-transform`}>
                  <step.icon size={20} />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pt-1 space-y-2">
                <div className="flex justify-between items-baseline gap-4">
                  <h4 className="text-lg font-black text-white">{step.title}</h4>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/80">{step.timeString}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted">
                    <Circle size={8} className="fill-current" />
                    {step.location}
                </div>
                <p className="text-sm text-white/50 leading-relaxed max-w-sm">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
          
          {/* Support Node */}
          {plan.support_phone && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative flex gap-8 group"
            >
              <div className="relative z-10">
                <div className="w-11 h-11 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center text-muted shadow-lg group-hover:scale-110 transition-transform">
                  <Headphones size={20} />
                </div>
              </div>

              <div className="flex-1 pt-1 space-y-2">
                <div className="flex justify-between items-baseline gap-4">
                  <h4 className="text-lg font-black text-white">Soporte Continuo</h4>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/80">24/7</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted">
                    <Circle size={8} className="fill-current" />
                    Asistencia Telefónica
                </div>
                <p className="text-sm text-white/50 leading-relaxed max-w-sm">
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
