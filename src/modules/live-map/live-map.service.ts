import { FullTravelPlan } from '@/hooks/useTravelPlans';
import { MapLocation, Coordinates } from './types';

export class LiveMapService {
  /**
   * Extrae y normaliza todos los puntos de interés de un plan de viaje completo.
   */
  static extractLocationsFromPlan(plan: FullTravelPlan): MapLocation[] {
    const locations: MapLocation[] = [];
    
    // Coordenadas de contingencia basadas en el contexto del plan
    const fallbackCoords: Coordinates = {
      lat: plan.contexts?.latitude || 40.416775, // Madrid por defecto
      lng: plan.contexts?.longitude || -3.703790
    };

    // 1. CONGRESO / CONTEXTO OPERATIVO
    if (plan.contexts) {
      locations.push({
        id: `context-${plan.contexts.id || 'main'}`,
        name: plan.contexts.name || 'Sede Central',
        type: 'congress',
        coordinates: {
          lat: plan.contexts.latitude || fallbackCoords.lat,
          lng: plan.contexts.longitude || fallbackCoords.lng
        },
        address: plan.contexts.address || 'Sede del evento',
        details: 'Centro de operaciones y conferencias'
      });
    }

    // 2. HOTELES (Estancias principales)
    if (plan.hotel_stays && plan.hotel_stays.length > 0) {
      plan.hotel_stays.forEach((stay) => {
        if (stay.deleted_at) return;
        locations.push({
          id: stay.id,
          name: stay.hotel_name || 'Hotel Reservado',
          type: 'hotel',
          coordinates: {
            lat: stay.latitude || fallbackCoords.lat + 0.005, // Ligeramente desplazado si no hay coordenadas
            lng: stay.longitude || fallbackCoords.lng + 0.005
          },
          address: stay.address,
          details: stay.room_type ? `Habitación: ${stay.room_type}` : 'Reserva Confirmada',
          time: stay.check_in ? `Check-in: ${new Date(stay.check_in).toLocaleDateString('es-ES')}` : undefined,
          meta: stay
        });
      });
    } else if (plan.hotels && plan.hotels.length > 0) {
      // Legacy hotels fallback
      plan.hotels.forEach((hotel) => {
        if (hotel.deleted_at) return;
        locations.push({
          id: hotel.id,
          name: hotel.hotel_name || 'Hotel Reservado',
          type: 'hotel',
          coordinates: fallbackCoords,
          address: hotel.address,
          details: 'Reserva Confirmada (Legacy)',
          meta: hotel
        });
      });
    }

    // 3. AEROPUERTO (Vuelos)
    if (plan.flights && plan.flights.length > 0) {
      plan.flights.forEach((flight) => {
        if (flight.deleted_at) return;
        
        // Aeropuerto de origen
        if (flight.departure_lat && flight.departure_lng) {
          locations.push({
            id: `flight-dep-${flight.id}`,
            name: `${flight.departure_location} Airport`,
            type: 'airport',
            coordinates: {
              lat: flight.departure_lat,
              lng: flight.departure_lng
            },
            details: `Vuelo ${flight.flight_number} (Salida • Terminal ${flight.departure_terminal || 'TBA'})`,
            time: flight.departure_time ? new Date(flight.departure_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : undefined,
            meta: flight
          });
        }
        
        // Aeropuerto de destino
        if (flight.arrival_lat && flight.arrival_lng) {
          locations.push({
            id: `flight-arr-${flight.id}`,
            name: `${flight.arrival_location} Airport`,
            type: 'airport',
            coordinates: {
              lat: flight.arrival_lat,
              lng: flight.arrival_lng
            },
            details: `Vuelo ${flight.flight_number} (Llegada • Terminal ${flight.arrival_terminal || 'TBA'})`,
            time: flight.arrival_time ? new Date(flight.arrival_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : undefined,
            meta: flight
          });
        }
      });
    }

    // 4. RESTAURANTES
    if (plan.restaurants && plan.restaurants.length > 0) {
      plan.restaurants.forEach((rest) => {
        if (rest.deleted_at) return;
        locations.push({
          id: rest.id,
          name: rest.restaurant_name || 'Restaurante',
          type: 'restaurant',
          coordinates: {
            lat: rest.latitude || fallbackCoords.lat - 0.008,
            lng: rest.longitude || fallbackCoords.lng + 0.008
          },
          address: rest.address,
          details: rest.notes || 'Reserva Gastronómica',
          time: rest.reservation_time ? new Date(rest.reservation_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : undefined,
          meta: rest
        });
      });
    }

    // 5. HOSPITALITY EVENTS
    if (plan.hospitality_events && plan.hospitality_events.length > 0) {
      plan.hospitality_events.forEach((event) => {
        if (event.deleted_at) return;
        locations.push({
          id: event.id,
          name: event.title || 'Evento de Hospitality',
          type: 'hospitality',
          coordinates: {
            lat: event.venue_lat || fallbackCoords.lat + 0.003,
            lng: event.venue_lng || fallbackCoords.lng - 0.006
          },
          address: event.venue_address,
          details: event.venue_name ? `Sede: ${event.venue_name}` : 'Evento Exclusivo',
          time: event.start_datetime ? new Date(event.start_datetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : undefined,
          meta: event
        });
      });
    }

    // 6. TRANSFERS (Pickups and Dropoffs)
    if (plan.transfers && plan.transfers.length > 0) {
      plan.transfers.forEach((trans) => {
        if (trans.deleted_at || trans.status === 'cancelled') return;
        
        // Puntos de recogida/destino como ubicaciones operativas
        if (trans.pickup_lat && trans.pickup_lng) {
          locations.push({
            id: `transfer-pick-${trans.id}`,
            name: `Recogida Transfer: ${trans.driver_name || 'Privado'}`,
            type: 'transfer',
            coordinates: {
              lat: trans.pickup_lat,
              lng: trans.pickup_lng
            },
            address: trans.pickup_location,
            details: `Vehículo: ${trans.vehicle_type || 'Premium'} • Ref: ${trans.booking_reference || 'OK'}`,
            time: trans.pickup_datetime ? new Date(trans.pickup_datetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : undefined,
            meta: trans
          });
        }

        if (trans.dropoff_lat && trans.dropoff_lng) {
          locations.push({
            id: `transfer-drop-${trans.id}`,
            name: `Destino Transfer: ${trans.driver_name || 'Privado'}`,
            type: 'transfer',
            coordinates: {
              lat: trans.dropoff_lat,
              lng: trans.dropoff_lng
            },
            address: trans.dropoff_location,
            details: `Fin de trayecto transfer`,
            time: trans.pickup_datetime ? new Date(trans.pickup_datetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : undefined,
            meta: trans
          });
        }
      });
    }

    return locations;
  }
}
