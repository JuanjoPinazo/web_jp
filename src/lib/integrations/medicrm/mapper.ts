import { 
  MediCRMContact, 
  MediCRMEvent, 
  MediCRMTravelPlanPayload, 
  MediCRMFlightPayload, 
  MediCRMHotelPayload, 
  MediCRMDocumentPayload,
  MediCRMTransferPayload
} from './types';

/**
 * Mappers to transform MediCRM data into JP Intelligence database objects
 */

export const mapMediCRMContactToProfile = (contact: MediCRMContact, clientId?: string) => ({
  external_id: contact.external_id,
  email: contact.email,
  nombre: contact.name,
  apellidos: contact.surname,
  telefono: contact.phone,
  role: contact.role || 'client',
  client_id: clientId,
  external_source: 'medicrm',
  synced_at: new Date().toISOString()
});

export const mapMediCRMEventToContext = (event: MediCRMEvent) => ({
  external_id: event.external_id,
  name: event.name,
  start_date: event.start_date,
  end_date: event.end_date,
  location: event.location,
  description: event.description,
  external_source: 'medicrm',
  synced_at: new Date().toISOString()
});

export const mapMediCRMTravelPayloadToPlan = (payload: MediCRMTravelPlanPayload, userId: string, contextId: string) => ({
  user_id: userId,
  context_id: contextId,
  status: payload.status || 'planned',
  external_id: payload.external_id,
  external_source: 'medicrm',
  synced_at: new Date().toISOString()
});

export const mapMediCRMFlightToTravelFlight = (flight: MediCRMFlightPayload, planId: string) => ({
  plan_id: planId,
  external_id: flight.external_id,
  airline: flight.airline,
  flight_number: flight.flight_number,
  departure_location: flight.departure_location,
  arrival_location: flight.arrival_location,
  departure_time: flight.departure_time,
  arrival_time: flight.arrival_time,
  reservation_code: flight.reservation_code,
  seat: flight.seat,
  gate: flight.gate,
  boarding_group: flight.boarding_group,
  baggage_info: flight.baggage_info,
  source: 'medicrm',
  is_verified: true,
  external_source: 'medicrm',
  synced_at: new Date().toISOString()
});

export const mapMediCRMHotelToHotelStay = (hotel: MediCRMHotelPayload, planId: string) => ({
  plan_id: planId,
  external_id: hotel.external_id,
  hotel_name: hotel.hotel_name,
  address: hotel.address,
  check_in: hotel.check_in,
  check_out: hotel.check_out,
  booking_reference: hotel.booking_reference,
  room_type: hotel.room_type,
  source: 'medicrm',
  status: 'confirmed',
  external_source: 'medicrm',
  synced_at: new Date().toISOString()
});

export const mapMediCRMTransferToTransfer = (transfer: MediCRMTransferPayload, planId: string) => ({
  plan_id: planId,
  external_id: transfer.external_id,
  transfer_type: transfer.transfer_type,
  pickup_time: transfer.pickup_time,
  pickup_location: transfer.pickup_location,
  dropoff_location: transfer.dropoff_location,
  source: 'medicrm',
  status: 'confirmed',
  external_source: 'medicrm',
  synced_at: new Date().toISOString()
});

export const mapMediCRMDocumentToTravelDocument = (doc: MediCRMDocumentPayload, planId: string) => ({
  plan_id: planId,
  external_id: doc.external_id,
  title: doc.title,
  display_title: doc.title,
  file_url: doc.file_url,
  document_type: doc.document_type || 'general',
  visible_to_client: true,
  source: 'medicrm',
  external_source: 'medicrm',
  synced_at: new Date().toISOString()
});
