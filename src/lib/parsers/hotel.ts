/**
 * Hotel Booking Specialized Parser
 */

export interface ExtractedHotelData {
  hotel_name?: string;
  check_in?: string;
  check_out?: string;
  confirmation_number?: string;
  address?: string;
  room_type?: string;
  breakfast_included?: boolean;
  confidence: number;
}

export function parseHotelBooking(text: string): ExtractedHotelData | null {
  const t = text.toLowerCase();
  
  const isHotel = t.includes('hotel') || t.includes('accommodation') || t.includes('alojamiento') || t.includes('check-in');
  if (!isHotel) return null;

  console.log('[DEBUG] Hotel Booking detectado');

  const data: ExtractedHotelData = {
    confidence: 0
  };

  // 1. Hotel Name
  const nameMatch = text.match(/(?:Hotel|Alojamiento|Accommodation):\s*([^\n\r]+)/i) || 
                    text.match(/Reserva en\s+([^\n\r]+)/i);
  if (nameMatch) {
    data.hotel_name = nameMatch[1].trim();
  }

  // 2. Dates
  const checkinMatch = text.match(/(?:Check-in|Entrada|Arrival):\s*([^\n\r]+)/i);
  if (checkinMatch) data.check_in = checkinMatch[1].trim();

  const checkoutMatch = text.match(/(?:Check-out|Salida|Departure):\s*([^\n\r]+)/i);
  if (checkoutMatch) data.check_out = checkoutMatch[1].trim();

  // 3. Confirmation Number
  const refMatch = text.match(/(?:Confirmation|Reserva|Ref\.?):\s*([A-Z0-9-]+)/i) || 
                   text.match(/Localizador:\s*([A-Z0-9-]+)/i);
  if (refMatch) {
    data.confirmation_number = refMatch[1];
  }

  // 4. Breakfast
  if (t.includes('desayuno incluido') || t.includes('breakfast included')) {
    data.breakfast_included = true;
  }

  // Confidence
  if (data.hotel_name && data.check_in) {
    data.confidence = 0.9;
  } else if (data.hotel_name) {
    data.confidence = 0.5;
  }

  console.log('[DEBUG] Hotel Data:', data);

  return data;
}
