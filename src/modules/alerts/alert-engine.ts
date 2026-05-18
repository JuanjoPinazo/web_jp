import { supabase } from '@/lib/supabase';
import { FullTravelPlan } from '@/hooks/useTravelPlans';
import { sendPushToProfile } from '@/modules/push/push-service';
import { processTimelineEvents } from '@/core/services/travel-timeline.service';

export interface Alert {
  id?: string;
  plan_id: string;
  profile_id: string;
  type: 'flight' | 'boarding_pass' | 'dining' | 'transfer' | 'hotel' | 'document';
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduled_for?: string;
  read_at?: string | null;
  action_label?: string;
  action_url?: string;
  metadata: any;
  created_at?: string;
}

export const generatePlanAlerts = async (plan: FullTravelPlan, profileId: string) => {
  const alerts: Omit<Alert, 'id' | 'created_at'>[] = [];
  const now = new Date();

  // Process unified timeline events from the plan
  const timeline = processTimelineEvents(plan, plan.documents || []);

  // Fetch user locations for smart departures
  const { data: userLocs } = await supabase.from('user_locations').select('*').eq('profile_id', profileId);
  const defaultLoc = userLocs?.find((l: any) => l.is_default_departure) || userLocs?.[0];

  timeline.forEach(e => {
    // 1. Flights (Early check & Smart Departure)
    if (e.event_type === 'flight' && !e.id.includes('arr')) {
      const flight = e.metadata;
      if (!flight) return;
      const depTime = new Date(e.start_datetime);
      const diffHours = (depTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Flight soon (<4h)
      if (diffHours > 0 && diffHours < 4) {
        alerts.push({
          plan_id: plan.id,
          profile_id: profileId,
          type: 'flight',
          title: 'Modo Aeropuerto Disponible',
          message: `Tu vuelo ${flight.flight_number || ''} sale pronto. Activa el modo aeropuerto para ver tu tarjeta de embarque y puerta.`,
          priority: 'high',
          action_label: 'Ver Vuelo',
          action_url: `/dashboard?tab=home&view=airport`,
          metadata: { dedupe_key: `flight_early_${flight.id}` }
        });
      }

      // Smart Departure for flight (3 hours before departure)
      if (defaultLoc) {
        const recommendedDeparture = new Date(depTime.getTime() - 180 * 60 * 1000); 
        if (now >= recommendedDeparture && now < depTime) {
          alerts.push({
            plan_id: plan.id,
            profile_id: profileId,
            type: 'flight',
            title: 'Sal ahora hacia el aeropuerto',
            message: `Es hora de salir hacia el aeropuerto para tu vuelo ${flight.flight_number || ''}. Tráfico estimado: Normal.`,
            priority: 'urgent',
            action_label: 'Cómo llegar',
            action_url: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(flight.departure_location || '')}`,
            metadata: { dedupe_key: `smart_departure_flight_${flight.id}` }
          });
        }
      }

      // Boarding passes ready
      e.related_documents?.forEach(doc => {
        if ((doc.document_type === 'boarding_pass' || doc.title?.toLowerCase().includes('tarjeta')) && !doc.deleted_at) {
          alerts.push({
            plan_id: plan.id,
            profile_id: profileId,
            type: 'boarding_pass',
            title: 'Tarjeta de Embarque Lista',
            message: `Ya tienes disponible tu tarjeta de embarque para el trayecto a ${flight.arrival_location || 'tu destino'}.`,
            priority: 'normal',
            action_label: 'Ver QR',
            action_url: `show_qr:${doc.id}`,
            metadata: { dedupe_key: `boarding_pass_${doc.id}` }
          });
        }
      });
    }

    // 2. Hospitality / Restaurants
    if (e.event_type === 'hospitality' || e.event_type === 'restaurant') {
      const event = e.metadata;
      if (!event) return;
      const startTime = new Date(e.start_datetime);
      const diffHours = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Dinner/event soon (<2h)
      if (diffHours > 0 && diffHours < 2) {
        alerts.push({
          plan_id: plan.id,
          profile_id: profileId,
          type: 'dining',
          title: e.event_type === 'restaurant' ? 'Reserva de Restaurante' : 'Cena Próxima',
          message: `Tu reserva en ${e.title} comienza en menos de 2 horas.`,
          priority: 'normal',
          action_label: 'Ver Detalles',
          action_url: e.event_type === 'restaurant' ? `view_restaurant:${event.id}` : `view_event:${event.id}`,
          metadata: { dedupe_key: `dining_soon_${event.id}` }
        });
      }

      // Smart Departure for dining/events (45 mins before)
      if (defaultLoc) {
        const recommendedDeparture = new Date(startTime.getTime() - 45 * 60 * 1000);
        if (now >= recommendedDeparture && now < startTime) {
          alerts.push({
            plan_id: plan.id,
            profile_id: profileId,
            type: 'dining',
            title: 'Sal ahora hacia tu evento',
            message: `Es hora de salir hacia ${e.title}. Tu reserva comienza pronto.`,
            priority: 'high',
            action_label: 'Cómo llegar',
            action_url: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(e.location || '')}`,
            metadata: { dedupe_key: `smart_departure_event_${event.id}` }
          });
        }
      }
    }

    // 3. Transfers
    if (e.event_type === 'transfer') {
      const transfer = e.metadata;
      if (!transfer) return;
      const pickupTime = new Date(e.start_datetime);
      const diffMinutes = (pickupTime.getTime() - now.getTime()) / (1000 * 60);

      // Transfer soon (<90min)
      if (diffMinutes > 0 && diffMinutes < 90) {
        alerts.push({
          plan_id: plan.id,
          profile_id: profileId,
          type: 'transfer',
          title: 'Traslado Próximo',
          message: `Tu recogida está programada para las ${pickupTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}.`,
          priority: 'high',
          action_label: 'Ver Recogida',
          action_url: `view_transfer:${transfer.id}`,
          metadata: { dedupe_key: `transfer_soon_${transfer.id}` }
        });
      }
    }

    // 4. Hotels
    if (e.event_type === 'hotel' && e.id.includes('in')) {
      const stay = e.metadata;
      if (!stay) return;
      const checkinDate = new Date(e.start_datetime);
      const isToday = checkinDate.toDateString() === now.toDateString();

      // Check-in today
      if (isToday) {
        alerts.push({
          plan_id: plan.id,
          profile_id: profileId,
          type: 'hotel',
          title: 'Check-in Hotel Disponible',
          message: `Hoy comienza tu estancia en ${stay.hotel_name || 'tu hotel'}. Recuerda tener tu documento a mano.`,
          priority: 'normal',
          action_label: 'Ver Hotel',
          action_url: `view_hotel:${stay.id}`,
          metadata: { dedupe_key: `hotel_today_${stay.id}` }
        });
      }
    }
  });

  // Guardar en DB (evitando duplicados por dedupe_key)
  for (const alert of alerts) {
    const { data: existing } = await supabase
      .from('alerts')
      .select('id')
      .eq('metadata->>dedupe_key', alert.metadata.dedupe_key)
      .maybeSingle();

    if (!existing) {
      await supabase.from('alerts').insert(alert);

      // Enviar push si es alta prioridad
      if (alert.priority === 'high' || alert.priority === 'urgent') {
        try {
          await sendPushToProfile(profileId, {
            title: alert.title,
            body: alert.message,
            data: { url: '/dashboard' }
          });
        } catch (err) {
          console.error('Error sending push for alert:', err);
        }
      }
    }
  }
};

export const getActiveAlerts = async (planId: string, profileId: string) => {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('plan_id', planId)
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data as Alert[];
};

export const markAlertAsRead = async (alertId: string) => {
  const { error } = await supabase
    .from('alerts')
    .update({ read_at: new Date().toISOString() })
    .eq('id', alertId);

  if (error) throw error;
};
