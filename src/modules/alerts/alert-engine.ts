import { supabase } from '@/lib/supabase';
import { FullTravelPlan } from '@/hooks/useTravelPlans';

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

  // 1. Vuelo próximo (<4h)
  plan.flights.forEach(flight => {
    const depTime = new Date(flight.departure_time);
    const diffHours = (depTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours > 0 && diffHours < 4) {
      alerts.push({
        plan_id: plan.id,
        profile_id: profileId,
        type: 'flight',
        title: 'Modo Aeropuerto Disponible',
        message: `Tu vuelo ${flight.flight_number} sale pronto. Activa el modo aeropuerto para ver tu tarjeta de embarque y puerta.`,
        priority: 'high',
        action_label: 'Ver Vuelo',
        action_url: `/dashboard?tab=home&view=airport`,
        metadata: { dedupe_key: `flight_early_${flight.id}` }
      });
    }
  });

  // 2. Boarding pass disponible
  plan.documents.forEach(doc => {
    if ((doc.document_type === 'boarding_pass' || doc.title?.toLowerCase().includes('tarjeta')) && !doc.deleted_at) {
      alerts.push({
        plan_id: plan.id,
        profile_id: profileId,
        type: 'boarding_pass',
        title: 'Tarjeta de Embarque Lista',
        message: `Ya tienes disponible tu tarjeta de embarque para el trayecto a ${plan.flights.find(f => f.id === doc.related_flight_id)?.arrival_location || 'tu destino'}.`,
        priority: 'normal',
        action_label: 'Ver QR',
        action_url: `show_qr:${doc.id}`,
        metadata: { dedupe_key: `boarding_pass_${doc.id}` }
      });
    }
  });

  // 3. Cena próxima (<2h)
  plan.hospitality_events.forEach(event => {
    if (event.type === 'dinner' || event.type === 'lunch') {
      const startTime = new Date(event.start_datetime);
      const diffHours = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (diffHours > 0 && diffHours < 2) {
        alerts.push({
          plan_id: plan.id,
          profile_id: profileId,
          type: 'dining',
          title: 'Cena Próxima',
          message: `Tu reserva en ${event.title} comienza en menos de 2 horas.`,
          priority: 'normal',
          action_label: 'Ver Detalles',
          action_url: `view_event:${event.id}`,
          metadata: { dedupe_key: `dining_soon_${event.id}` }
        });
      }
    }
  });

  // 4. Transfer próximo (<90min)
  plan.transfers.forEach(transfer => {
    const pickupTime = new Date(transfer.pickup_datetime);
    const diffMinutes = (pickupTime.getTime() - now.getTime()) / (1000 * 60);
    
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
  });

  // 5. Hotel check-in hoy
  plan.hotel_stays.forEach(stay => {
    const checkinDate = new Date(stay.check_in);
    const isToday = checkinDate.toDateString() === now.toDateString();
    
    if (isToday) {
      alerts.push({
        plan_id: plan.id,
        profile_id: profileId,
        type: 'hotel',
        title: 'Check-in Hotel Disponible',
        message: `Hoy comienza tu estancia en ${stay.hotel_name}. Recuerda tener tu documento a mano.`,
        priority: 'normal',
        action_label: 'Ver Hotel',
        action_url: `view_hotel:${stay.id}`,
        metadata: { dedupe_key: `hotel_today_${stay.id}` }
      });
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
