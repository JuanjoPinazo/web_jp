import { NormalizedTravelEntity, TravelTimelineEvent, TimelineAction } from '../types';

export class TimelineGenerator {
  /**
   * Generates travel timeline events from a normalized travel entity.
   * Can return multiple events (e.g. check-in & check-out for hotels, or departure & arrival for flights).
   */
  static generateEvents(entity: NormalizedTravelEntity, documentId?: string, fileUrl?: string): TravelTimelineEvent[] {
    const events: TravelTimelineEvent[] = [];
    const entityId = documentId || `temp-${Math.random().toString(36).substring(7)}`;

    // A. FLIGHT ENTITY
    if (entity.type === 'boarding_pass' || entity.type === 'flight_confirmation') {
      const f = entity.flight;
      if (f) {
        // Related document actions
        const depActions: TimelineAction[] = [];
        if (fileUrl) {
          depActions.push({ label: 'Ver boarding pass', type: 'document', value: fileUrl, icon: 'FileText' });
        }
        if (f.departure_location) {
          depActions.push({
            label: 'Ver terminal',
            type: 'map',
            value: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.departure_location + ' Airport')}`,
            icon: 'MapPin'
          });
        }

        // 1. Departure Event
        events.push({
          id: `flight-dep-${entityId}`,
          event_type: 'flight',
          start_datetime: f.departure_time,
          end_datetime: f.arrival_time,
          title: `✈️ Salida ${f.airline || entity.provider} ${f.flight_number}`,
          subtitle: `${f.departure_location} → ${f.arrival_location}`,
          location: f.departure_location,
          icon: 'Plane',
          priority: 1,
          metadata: {
            ...f,
            booking_reference: entity.booking_reference,
            passenger_name: entity.passenger_name
          },
          actions: depActions
        });

        // 2. Arrival Event
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
          id: `flight-arr-${entityId}`,
          event_type: 'flight',
          start_datetime: f.arrival_time,
          title: `🛬 Llegada ${f.airline || entity.provider} ${f.flight_number}`,
          subtitle: `Llegada a ${f.arrival_location}`,
          location: f.arrival_location,
          icon: 'Plane',
          priority: 2,
          metadata: {
            ...f,
            booking_reference: entity.booking_reference,
            passenger_name: entity.passenger_name
          },
          actions: arrActions
        });
      }
    }

    // B. TRANSFER ENTITY
    if (entity.type === 'transfer_voucher' && entity.transfer) {
      const t = entity.transfer;
      const actions: TimelineAction[] = [];
      if (fileUrl) {
        actions.push({ label: 'Ver voucher oficial', type: 'document', value: fileUrl, icon: 'FileText' });
      }
      if (t.support_phone) {
        actions.push({ label: 'Llamar asistencia', type: 'call', value: `tel:${t.support_phone}`, icon: 'PhoneCall' });
      }
      if (t.meeting_point) {
        actions.push({ label: 'Punto de encuentro', type: 'copy', value: t.meeting_point, icon: 'MapPin' });
      }
      if (t.pickup_address && t.destination_address) {
        actions.push({
          label: 'Cómo llegar',
          type: 'navigate',
          value: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(t.pickup_address)}&destination=${encodeURIComponent(t.destination_address)}`,
          icon: 'Navigation'
        });
      }

      const isIda = t.pickup_type === 'airport';
      const eventTitle = isIda ? '🚗 Traslado de Ida' : '🚗 Traslado Privado';

      events.push({
        id: `transfer-${entityId}`,
        event_type: 'transfer',
        start_datetime: t.pickup_datetime,
        title: eventTitle,
        subtitle: `${t.pickup_address} → ${t.destination_address}`,
        location: `Recogida: ${t.pickup_address}`,
        icon: 'Car',
        priority: 3,
        metadata: {
          ...t,
          booking_reference: entity.booking_reference,
          passenger_name: entity.passenger_name
        },
        actions
      });
    }

    // C. HOTEL ENTITY
    if (entity.type === 'hotel_reservation' && entity.hotel) {
      const h = entity.hotel;
      
      // 1. Check-in Event
      const inActions: TimelineAction[] = [];
      if (fileUrl) {
        inActions.push({ label: 'Ver voucher', type: 'document', value: fileUrl, icon: 'FileText' });
      }
      if (h.address) {
        inActions.push({
          label: 'Navegar hotel',
          type: 'navigate',
          value: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(h.address)}`,
          icon: 'Navigation'
        });
      }

      events.push({
        id: `hotel-in-${entityId}`,
        event_type: 'hotel',
        start_datetime: h.check_in,
        title: `🏨 Check-in ${h.hotel_name}`,
        subtitle: `Entrada: ${h.room_type || 'Estancia confirmada'}`,
        location: h.address || h.hotel_name,
        icon: 'Building2',
        priority: 4,
        metadata: {
          ...h,
          booking_reference: entity.booking_reference,
          passenger_name: entity.passenger_name
        },
        actions: inActions
      });

      // 2. Check-out Event
      const outActions: TimelineAction[] = [];
      if (h.address) {
        outActions.push({
          label: 'Navegar hotel',
          type: 'navigate',
          value: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(h.address)}`,
          icon: 'Navigation'
        });
      }

      events.push({
        id: `hotel-out-${entityId}`,
        event_type: 'hotel',
        start_datetime: h.check_out,
        title: `🔑 Check-out ${h.hotel_name}`,
        subtitle: `Salida prevista`,
        location: h.hotel_name,
        icon: 'Building2',
        priority: 5,
        metadata: {
          ...h,
          booking_reference: entity.booking_reference,
          passenger_name: entity.passenger_name
        },
        actions: outActions
      });
    }

    // D. RESTAURANT ENTITY
    if (entity.type === 'restaurant_booking' && entity.restaurant) {
      const r = entity.restaurant;
      const actions: TimelineAction[] = [];
      actions.push({
        label: 'Navegar restaurante',
        type: 'navigate',
        value: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.restaurant_name)}`,
        icon: 'Navigation'
      });

      events.push({
        id: `restaurant-${entityId}`,
        event_type: 'restaurant',
        start_datetime: r.reservation_time,
        title: `🍽️ Reserva en ${r.restaurant_name}`,
        subtitle: `Mesa para ${r.reservation_name || 'Invitado'}${r.passengers ? ` (${r.passengers} pax)` : ''}`,
        location: r.restaurant_name,
        icon: 'Utensils',
        priority: 6,
        metadata: {
          ...r,
          booking_reference: entity.booking_reference,
          passenger_name: entity.passenger_name || r.reservation_name
        },
        actions
      });
    }

    // E. EVENT ENTITY
    if (entity.type === 'hospitality_event' && entity.event) {
      const e = entity.event;
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
        id: `hospitality-${entityId}`,
        event_type: e.is_agenda ? 'agenda' : 'hospitality',
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        title: e.is_agenda ? `🩺 ${e.title}` : `🥂 ${e.title}`,
        subtitle: e.description || (e.is_agenda ? 'Sesión Científica' : 'Evento de Hospitalidad'),
        location: e.venue_name || 'Lugar por confirmar',
        icon: e.is_agenda ? 'Activity' : 'Sparkles',
        priority: 7,
        metadata: {
          ...e,
          booking_reference: entity.booking_reference,
          passenger_name: entity.passenger_name
        },
        actions
      });
    }

    return events;
  }
}
