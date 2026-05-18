export type DocumentType =
  | 'boarding_pass'
  | 'flight_confirmation'
  | 'hotel_reservation'
  | 'transfer_voucher'
  | 'restaurant_booking'
  | 'hospitality_event'
  | 'generic_document'
  | 'unknown';

export interface ClassificationResult {
  type: DocumentType;
  provider: string;
  confidence: number; // 0 to 100
}

export interface NormalizedTravelEntity {
  type: DocumentType;
  provider: string;
  confidence: number;
  booking_reference?: string;
  passenger_name?: string;
  raw_payload?: any;

  // Flight segment
  flight?: {
    airline: string;
    flight_number: string;
    departure_location: string; // IATA (e.g. CDG)
    arrival_location: string; // IATA (e.g. MAD)
    departure_time: string; // ISO
    arrival_time: string; // ISO
    seat?: string;
    cabin_class?: string;
    checkin_deadline?: string;
    baggage_info?: string;
    status?: string;
    qr_detected?: boolean;
    qr_decoded?: boolean;
    qr_raw_payload?: string;
    qr_code?: string;
  };

  // Transfer segment
  transfer?: {
    provider: string;
    pickup_type: 'airport' | 'hotel' | 'station' | 'address' | 'other';
    pickup_datetime: string; // ISO
    pickup_address: string;
    pickup_airport_code?: string; // IATA code when pickup is at airport (e.g. CDG)
    destination_type: 'airport' | 'hotel' | 'station' | 'address' | 'venue' | 'other';
    destination_address: string;
    destination_name?: string; // Short name (hotel name, venue name)
    passengers: number;
    luggage: number;
    vehicle_type?: string;
    meeting_point?: string;
    support_phone?: string;
    support_whatsapp?: string;
    flight_linkage?: {
      airline?: string;
      flight_number?: string;
      arrival_time?: string;
      origin_airport?: string;
    };
  };

  // Hotel segment
  hotel?: {
    hotel_name: string;
    confirmation_number: string;
    check_in: string; // ISO
    check_out: string; // ISO
    address: string;
    room_type?: string;
  };

  // Restaurant segment
  restaurant?: {
    restaurant_name: string;
    reservation_time: string; // ISO
    reservation_name?: string;
    passengers?: number;
    notes?: string;
  };

  // Hospitality / Event segment
  event?: {
    title: string;
    description?: string;
    start_datetime: string; // ISO
    end_datetime?: string; // ISO
    venue_name: string;
    venue_address?: string;
    contact_phone?: string;
    is_agenda: boolean;
  };
}

export interface TimelineAction {
  label: string;
  type: 'call' | 'navigate' | 'document' | 'map' | 'action' | 'copy';
  value: string;
  icon?: string;
}

export interface TravelTimelineEvent {
  id: string;
  plan_id?: string;
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
}
