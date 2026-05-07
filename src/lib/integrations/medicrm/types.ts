/**
 * MediCRM Integration Types
 * Defines the contract for data received from MediCRM
 */

export interface MediCRMClient {
  external_id: string;
  name: string;
}

export interface MediCRMContact {
  external_id: string;
  email: string;
  name: string;
  surname: string;
  phone?: string;
  role?: string;
}

export interface MediCRMEvent {
  external_id: string;
  name: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  description?: string;
}

export interface MediCRMFlightPayload {
  external_id: string;
  airline?: string;
  flight_number?: string;
  departure_location?: string;
  arrival_location?: string;
  departure_time?: string;
  arrival_time?: string;
  reservation_code?: string;
  seat?: string;
  gate?: string;
  boarding_group?: string;
  baggage_info?: string;
}

export interface MediCRMHotelPayload {
  external_id: string;
  hotel_name: string;
  address?: string;
  check_in: string;
  check_out: string;
  booking_reference?: string;
  room_type?: string;
}

export interface MediCRMTransferPayload {
  external_id: string;
  transfer_type?: string;
  pickup_time: string;
  pickup_location: string;
  dropoff_location: string;
}

export interface MediCRMDocumentPayload {
  external_id: string;
  title: string;
  file_url: string;
  document_type?: string;
}

export interface MediCRMTravelPlanPayload {
  external_id: string;
  status?: string;
  flights?: MediCRMFlightPayload[];
  hotels?: MediCRMHotelPayload[];
  transfers?: MediCRMTransferPayload[];
  documents?: MediCRMDocumentPayload[];
}

export interface MediCRMSyncPayload {
  client: MediCRMClient;
  contact: MediCRMContact;
  event: MediCRMEvent;
  travel_plan: MediCRMTravelPlanPayload;
}
