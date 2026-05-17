export type DocumentType =
  | 'boarding_pass'
  | 'flight_confirmation'
  | 'hotel_reservation'
  | 'transfer_voucher'
  | 'restaurant_booking'
  | 'hospitality_event'
  | 'unknown';

export interface ClassificationResult {
  type: DocumentType;
  provider: string;
  confidence: number; // 0 to 100
}

export class DocumentClassifierService {
  /**
   * Classifies a document based on raw text extracted from it.
   */
  static classifyText(text: string): ClassificationResult {
    const t = text.toUpperCase();
    
    // 1. BOARDING PASS
    if (t.includes('BOARDING PASS') || t.includes('TARJETA DE EMBARQUE') || t.includes('ACCÈS À BORD') || t.includes('PASSAGER BOARDING')) {
      let provider = 'unknown';
      if (t.includes('VUELING')) provider = 'Vueling';
      else if (t.includes('AIR FRANCE') || t.includes('AIRFRANCE')) provider = 'Air France';
      else if (t.includes('RYANAIR')) provider = 'Ryanair';
      else if (t.includes('IBERIA')) provider = 'Iberia';
      
      return { type: 'boarding_pass', provider, confidence: 95 };
    }

    // 2. TRANSFER VOUCHER
    if (
      t.includes('SUNTRANSFERS') || 
      t.includes('BLACKLANE') || 
      t.includes('WELCOME PICKUPS') || 
      t.includes('WELCOMEPICKUPS') ||
      t.includes('TRASLADO') || 
      t.includes('TRANSFER VOUCHER') ||
      t.includes('SHUTTLE SERVICE') ||
      t.includes('PICKUP SERVICE') ||
      t.includes('CHÓFER') ||
      t.includes('PRIVATE TRANSFER') ||
      t.includes('VEHÍCULO DE TRASLADO') ||
      t.includes('TAXILEADER') ||
      t.includes('GETTRANSFER')
    ) {
      let provider = 'Private Transfer';
      if (t.includes('SUNTRANSFERS') || t.includes('SUN TRANSFERS')) provider = 'SunTransfers';
      else if (t.includes('BLACKLANE')) provider = 'Blacklane';
      else if (t.includes('WELCOME PICKUPS') || t.includes('WELCOMEPICKUPS')) provider = 'Welcome Pickups';
      
      return { type: 'transfer_voucher', provider, confidence: 98 };
    }

    // 3. HOTEL RESERVATION
    if (
      t.includes('BOOKING.COM') || 
      t.includes('HOTEL RESERVATION') || 
      t.includes('RESERVA DE HOTEL') || 
      t.includes('CONFIRMACIÓN DE ALOJAMIENTO') || 
      t.includes('ESTANCIA') || 
      (t.includes('CHECK-IN') && t.includes('CHECK-OUT') && (t.includes('HABITACIÓN') || t.includes('ROOM')))
    ) {
      let provider = 'Hotel';
      if (t.includes('BOOKING.COM')) provider = 'Booking.com';
      else if (t.includes('HOTELES.COM') || t.includes('HOTELS.COM')) provider = 'Hotels.com';
      
      return { type: 'hotel_reservation', provider, confidence: 90 };
    }

    // 4. RESTAURANT BOOKING
    if (
      t.includes('RESERVANDOMESA') || 
      t.includes('THE FORK') || 
      t.includes('ELTENEDOR') || 
      t.includes('RESTAURANTE RESERVA') || 
      t.includes('CONFIRMACIÓN DE MESA') || 
      t.includes('RESTAURANT BOOKING') ||
      t.includes('BOOK A TABLE')
    ) {
      let provider = 'Restaurant';
      if (t.includes('THE FORK') || t.includes('ELTENEDOR')) provider = 'TheFork';
      else if (t.includes('OPENTABLE')) provider = 'OpenTable';
      
      return { type: 'restaurant_booking', provider, confidence: 85 };
    }

    // 5. HOSPITALITY EVENT
    if (
      t.includes('EVENT TICKET') || 
      t.includes('ENTRADA DE EVENTO') || 
      t.includes('CONCIERGE EVENT') || 
      t.includes('ACCESO VIP') || 
      t.includes('VIP PASS') ||
      t.includes('CENA DE GALA') ||
      t.includes('TICKETMASTER')
    ) {
      return { type: 'hospitality_event', provider: 'Event Organizer', confidence: 80 };
    }

    // 6. FLIGHT CONFIRMATION
    if (
      t.includes('FLIGHT CONFIRMATION') || 
      t.includes('CONFIRMACIÓN DE VUELO') || 
      (t.includes('DETALLES DE RESERVA') && t.includes('VUELO')) ||
      (t.includes('LOCALIZADOR') && t.includes('SALIDA') && t.includes('LLEGADA'))
    ) {
      let provider = 'Airline';
      if (t.includes('VUELING')) provider = 'Vueling';
      else if (t.includes('AIR FRANCE') || t.includes('AIRFRANCE')) provider = 'Air France';
      else if (t.includes('IBERIA')) provider = 'Iberia';
      
      return { type: 'flight_confirmation', provider, confidence: 85 };
    }

    return { type: 'unknown', provider: 'unknown', confidence: 0 };
  }
}
