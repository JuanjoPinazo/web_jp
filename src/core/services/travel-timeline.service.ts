import { supabase } from '@/lib/supabase';
import { Flight, HotelStay, Transfer, Restaurant, HospitalityEvent, Document } from '@/hooks/useTravelPlans';

export interface TimelineAction {
  label: string;
  type: 'call' | 'navigate' | 'document' | 'map' | 'action' | 'copy';
  value: string;
  icon?: string;
}

export interface TimelineEvent {
  id: string;
  plan_id: string;
  event_type: 'flight' | 'transfer' | 'hotel' | 'hospitality' | 'restaurant' | 'agenda';
  start_datetime: string;
  end_datetime?: string;
  title: string;
  subtitle?: string;
  location?: string;
  icon?: string;
  priority?: number;
  metadata?: any;
  actions?: TimelineAction[];
  documents?: Document[];
}

/**
 * Normalizes all travel elements into a standard chronological timeline.
 */
export function processTimelineEvents(plan: any, documentsList: Document[] = []): TimelineEvent[] {
  if (!plan) return [];
  const events: TimelineEvent[] = [];

  const docs: Document[] = documentsList.length > 0 ? documentsList : (plan.documents || []);

  // 1. FLIGHTS (Departure & Arrival)
  const flights: Flight[] = plan.flights || [];
  flights.filter(f => f.is_verified).forEach(f => {
    // Related documents
    const relatedDocs = docs.filter(d => d.related_flight_id === f.id || d.booking_reference === f.reservation_code);
    const boardingPass = relatedDocs.find(d => d.document_type === 'boarding_pass');

    // Departure Event
    const depActions: TimelineAction[] = [];
    if (boardingPass?.file_url) {
      depActions.push({ label: 'Ver boarding pass', type: 'document', value: boardingPass.file_url, icon: 'FileText' });
    }
    if (f.departure_location) {
      depActions.push({
        label: 'Ver terminal',
        type: 'map',
        value: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.departure_location + ' Airport')}`,
        icon: 'MapPin'
      });
    }

    events.push({
      id: `flight-dep-${f.id}`,
      plan_id: plan.id,
      event_type: 'flight',
      start_datetime: f.departure_time,
      end_datetime: f.arrival_time,
      title: `✈️ Salida ${f.airline || ''} ${f.flight_number || ''}`,
      subtitle: `${f.departure_location} → ${f.arrival_location}`,
      location: f.departure_location + (f.departure_terminal || f.terminal ? ` (Terminal ${f.departure_terminal || f.terminal})` : ''),
      icon: 'Plane',
      priority: 1,
      metadata: f,
      actions: depActions,
      documents: relatedDocs
    });

    // Arrival Event
    const arrActions: TimelineAction[] = [];
    if (f.arrival_location) {
      arrActions.push({
        label: 'Abrir mapa aeropuerto',
        type: 'map',
        value: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.arrival_location + ' Airport')}`,
        icon: 'Map'
      });
    }

    events.push({
      id: `flight-arr-${f.id}`,
      plan_id: plan.id,
      event_type: 'flight',
      start_datetime: f.arrival_time,
      title: `🛬 Llegada ${f.airline || ''} ${f.flight_number || ''}`,
      subtitle: `Llegada a ${f.arrival_location}`,
      location: f.arrival_location + (f.arrival_terminal ? ` (Terminal ${f.arrival_terminal})` : ''),
      icon: 'Plane',
      priority: 2,
      metadata: f,
      actions: arrActions,
      documents: relatedDocs
    });
  });

  // 2. TRANSFERS
  const transfers: Transfer[] = plan.transfers || [];
  transfers.filter(t => t.visible_to_client).forEach(t => {
    const relatedDocs = docs.filter(d => 
      d.related_transfer_id === t.id || 
      (t.booking_reference && d.booking_reference === t.booking_reference && d.document_type === 'transfer_voucher')
    );
    const voucherDoc = relatedDocs.find(d => d.document_type === 'transfer_voucher') || relatedDocs[0];

    const actions: TimelineAction[] = [];
    if (voucherDoc?.file_url) {
      actions.push({ label: 'Ver voucher oficial', type: 'document', value: voucherDoc.file_url, icon: 'FileText' });
    }
    if (t.driver_phone) {
      actions.push({ label: 'Llamar conductor', type: 'call', value: `tel:${t.driver_phone}`, icon: 'Phone' });
    }
    if (t.support_phone) {
      actions.push({ label: 'Llamar asistencia', type: 'call', value: `tel:${t.support_phone}`, icon: 'PhoneCall' });
    }
    if (t.meeting_point) {
      actions.push({ label: 'Punto de encuentro', type: 'copy', value: t.meeting_point, icon: 'MapPin' });
    }
    
    const pickupLoc = (t.pickup_location || (t as any).pickup_address || '').replace(/^(undefined|null)$/gi, '').trim();
    const dropoffLoc = (t.dropoff_location || (t as any).destination_address || '').replace(/^(undefined|null)$/gi, '').trim();
    
    if (dropoffLoc) {
      actions.push({
        label: 'Cómo llegar',
        type: 'navigate',
        value: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pickupLoc)}&destination=${encodeURIComponent(dropoffLoc)}`,
        icon: 'Navigation'
      });
    }

    const tType = (t as any).transfer_type || t.type;
    const eventTitle = ['airport_to_hotel', 'airport_to_venue'].includes(tType) ? '🚗 Traslado de Ida' :
                       ['hotel_to_airport', 'venue_to_airport'].includes(tType) ? '🚗 Traslado de Vuelta' :
                       tType === 'hotel_to_restaurant' ? '🍽️ Traslado a Restaurante' :
                       tType === 'restaurant_to_hotel' ? '🏨 Retorno a Hotel' :
                       tType === 'hotel_to_venue' ? '🩺 Traslado a Sede' :
                       tType === 'venue_to_hotel' ? '🏨 Retorno desde Sede' :
                       `🚗 Traslado Privado`;

    events.push({
      id: `transfer-${t.id}`,
      plan_id: plan.id,
      event_type: 'transfer',
      start_datetime: t.pickup_datetime || (t as any).pickup_time || plan.start_date,
      title: eventTitle,
      subtitle: `${pickupLoc} → ${dropoffLoc}`,
      location: `Recogida: ${pickupLoc}`,
      icon: 'Car',
      priority: 3,
      metadata: t,
      actions,
      documents: relatedDocs
    });
  });

  // 3. HOTEL STAYS (Check-in & Check-out)
  const stays: HotelStay[] = plan.hotel_stays || [];
  stays.forEach(h => {
    const relatedDocs = docs.filter(d => d.related_hotel_stay_id === h.id || d.booking_reference === h.booking_reference);
    const voucherDoc = relatedDocs.find(d => d.document_type === 'hotel_booking') || relatedDocs[0];

    // Check-in (usually set at 15:00 UTC/Local)
    const inActions: TimelineAction[] = [];
    if (voucherDoc?.file_url) {
      inActions.push({ label: 'Ver voucher', type: 'document', value: voucherDoc.file_url, icon: 'FileText' });
    }
    if (h.address) {
      inActions.push({
        label: 'Navegar hotel',
        type: 'navigate',
        value: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(h.address)}`,
        icon: 'Navigation'
      });
    }
    if (h.phone) {
      inActions.push({ label: 'Contactar recepción', type: 'call', value: `tel:${h.phone}`, icon: 'Phone' });
    }

    const checkInDateStr = h.check_in.includes('T') ? h.check_in.split('T')[0] : h.check_in;
    let latestArrivalOrTransferTime: Date | null = null;

    // Scan flights arriving on this date
    for (const f of flights) {
      if (f.is_verified && f.arrival_time) {
        const arrDateStr = f.arrival_time.includes('T') ? f.arrival_time.split('T')[0] : f.arrival_time;
        if (arrDateStr === checkInDateStr) {
          const arrTime = new Date(f.arrival_time);
          if (!latestArrivalOrTransferTime || arrTime > latestArrivalOrTransferTime) {
            latestArrivalOrTransferTime = arrTime;
          }
        }
      }
    }

    // Scan transfers picking up on this date
    for (const t of transfers) {
      if (t.visible_to_client) {
        const pkStr = t.pickup_datetime || (t as any).pickup_time;
        if (pkStr) {
          const pkDateStr = pkStr.includes('T') ? pkStr.split('T')[0] : pkStr;
          if (pkDateStr === checkInDateStr) {
            const pkTime = new Date(pkStr);
            if (!latestArrivalOrTransferTime || pkTime > latestArrivalOrTransferTime) {
              latestArrivalOrTransferTime = pkTime;
            }
          }
        }
      }
    }

    const checkInTime = new Date(h.check_in);
    if (latestArrivalOrTransferTime) {
      // Set to 60 minutes after the latest flight arrival or transfer on the check-in date
      const adjustedTime = new Date((latestArrivalOrTransferTime as Date).getTime() + 60 * 60 * 1000);
      checkInTime.setTime(adjustedTime.getTime());
    } else {
      checkInTime.setUTCHours(15, 0, 0);
    }

    events.push({
      id: `hotel-in-${h.id}`,
      plan_id: plan.id,
      event_type: 'hotel',
      start_datetime: checkInTime.toISOString(),
      title: `🏨 Check-in ${h.hotel_name}`,
      subtitle: `Entrada: ${h.room_type || 'Estancia confirmada'}`,
      location: h.address || h.hotel_name,
      icon: 'Building2',
      priority: 4,
      metadata: h,
      actions: inActions,
      documents: relatedDocs
    });

    // Check-out (usually set at 12:00 UTC/Local)
    const outActions: TimelineAction[] = [];
    if (h.address) {
      outActions.push({
        label: 'Navegar hotel',
        type: 'navigate',
        value: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(h.address)}`,
        icon: 'Navigation'
      });
    }

    const checkOutTime = new Date(h.check_out);
    checkOutTime.setUTCHours(12, 0, 0);

    events.push({
      id: `hotel-out-${h.id}`,
      plan_id: plan.id,
      event_type: 'hotel',
      start_datetime: checkOutTime.toISOString(),
      title: `🔑 Check-out ${h.hotel_name}`,
      subtitle: `Salida prevista`,
      location: h.hotel_name,
      icon: 'Building2',
      priority: 5,
      metadata: h,
      actions: outActions,
      documents: relatedDocs
    });
  });

  // 4. RESTAURANTS
  const restaurants: Restaurant[] = plan.restaurants || [];
  restaurants.forEach(r => {
    const actions: TimelineAction[] = [];
    actions.push({
      label: 'Navegar restaurante',
      type: 'navigate',
      value: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.restaurant_name)}`,
      icon: 'Navigation'
    });

    events.push({
      id: `restaurant-${r.id}`,
      plan_id: plan.id,
      event_type: 'restaurant',
      start_datetime: r.reservation_time,
      title: `🍽️ Reserva en ${r.restaurant_name}`,
      subtitle: `Mesa para ${r.reservation_name || 'Invitado'}`,
      location: r.restaurant_name,
      icon: 'Utensils',
      priority: 6,
      metadata: r,
      actions,
      documents: []
    });
  });

  // 5. HOSPITALITY & AGENDA
  const hospitality: HospitalityEvent[] = plan.hospitality_events || [];
  hospitality.filter(e => e.visible_to_client).forEach(e => {
    const isAgenda = e.type === 'meeting' || 
      /session|opening|opening session|agenda|congress|symposium|conference|keynote|meeting|clinic|eupcr|euro/i.test(e.title) ||
      /session|opening|agenda|congress|symposium|conference/i.test(e.description || '');

    const actions: TimelineAction[] = [];
    if (e.venue_address || e.venue_name) {
      actions.push({
        label: 'Ver ubicación',
        type: 'map',
        value: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.venue_address || e.venue_name || '')}`,
        icon: 'MapPin'
      });
    }
    if (e.contact_phone) {
      actions.push({ label: 'Llamar soporte', type: 'call', value: `tel:${e.contact_phone}`, icon: 'Phone' });
    }

    events.push({
      id: `hospitality-${e.id}`,
      plan_id: plan.id,
      event_type: isAgenda ? 'agenda' : 'hospitality',
      start_datetime: e.start_datetime,
      end_datetime: e.end_datetime,
      title: isAgenda ? `🩺 ${e.title}` : `🥂 ${e.title}`,
      subtitle: e.description || (isAgenda ? 'Sesión Científica' : 'Evento de Hospitalidad'),
      location: e.venue_name || 'Lugar por confirmar',
      icon: isAgenda ? 'Activity' : 'Sparkles',
      priority: 7,
      metadata: e,
      actions,
      documents: []
    });
  });

  // 6. SORT CHRONOLOGICALLY
  return events.sort((a, b) => {
    const timeA = new Date(a.start_datetime).getTime();
    const timeB = new Date(b.start_datetime).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return (a.priority || 0) - (b.priority || 0);
  });
}

/**
 * Primary Core Service Function: Fetches all logistic entities for a travel plan 
 * and builds a beautifully normalized chronological timeline.
 */
export async function buildTravelTimeline(planId: string): Promise<TimelineEvent[]> {
  if (!planId) return [];

  try {
    // 1. Fetch main plan
    const { data: plan, error: planError } = await supabase
      .from('contact_travel_plans')
      .select('*')
      .eq('id', planId)
      .is('deleted_at', null)
      .single();

    if (planError || !plan) {
      console.error('[TimelineService] Error loading plan:', planError);
      return [];
    }

    // 2. Fetch all logistic components in parallel
    const [flights, stays, transfers, restaurants, hospitality, documents] = await Promise.all([
      supabase.from('travel_flights').select('*').eq('plan_id', planId).is('deleted_at', null).order('departure_time'),
      supabase.from('hotel_stays').select('*').eq('plan_id', planId).is('deleted_at', null).order('check_in'),
      supabase.from('travel_transfers').select('*').eq('plan_id', planId).is('deleted_at', null),
      supabase.from('travel_restaurants').select('*').eq('plan_id', planId).is('deleted_at', null).order('reservation_time'),
      supabase.from('hospitality_events').select('*').eq('plan_id', planId).is('deleted_at', null).order('start_datetime'),
      supabase.from('travel_documents').select('*').eq('plan_id', planId).is('deleted_at', null)
    ]);

    // 3. Assemble complete plan structure
    const fullPlanObj = {
      ...plan,
      flights: flights.data || [],
      hotel_stays: stays.data || [],
      transfers: transfers.data || [],
      restaurants: restaurants.data || [],
      hospitality_events: hospitality.data || [],
      documents: documents.data || []
    };

    return processTimelineEvents(fullPlanObj, documents.data || []);
  } catch (error) {
    console.error('[TimelineService] Critical error building timeline:', error);
    return [];
  }
}
