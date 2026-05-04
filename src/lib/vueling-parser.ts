/**
 * Vueling Boarding Pass Parser
 * Extracts structured data from Vueling boarding pass text content.
 */

export interface VuelingBoardingData {
  passenger_name: string;
  airline: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  seat: string;
  seat_note?: string;
  boarding_group: string;
  booking_reference: string;
  duration_minutes?: number;
  checkin_opens_at?: string;
  checkin_closes_at?: string;
  qr_detected: boolean;
}

export function parseVuelingBoardingPass(text: string): VuelingBoardingData | null {
  // 1. Detect provider
  const isVueling = text.toLowerCase().includes('vueling') && 
                    text.includes('ASIENTO') && 
                    text.includes('CÓD. RESERVA');
  
  if (!isVueling) return null;

  const data: Partial<VuelingBoardingData> = {
    airline: 'Vueling',
    qr_detected: true, // Typically boarding passes have a QR
  };

  // 2. Passenger Name
  // Look for text after "NOMBRE" or in the header
  const nameMatch = text.match(/NOMBRE\s*\n\s*(.*)/i);
  if (nameMatch) {
    data.passenger_name = nameMatch[1].trim();
  } else {
    // Fallback: sometimes names are at the very beginning
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines[0] && lines[0].toUpperCase() === lines[0]) {
      data.passenger_name = lines[0];
    }
  }

  // 3. Flight Number (VY\d{4})
  const flightMatch = text.match(/VY\d{4,5}/i);
  if (flightMatch) {
    data.flight_number = flightMatch[0].toUpperCase();
  }

  // 4. Booking Reference (CÓD. RESERVA)
  const refMatch = text.match(/CÓD\.\s*RESERVA\s*\n\s*([A-Z0-9]{6})/i) || text.match(/RESERVA\s*([A-Z0-9]{6})/i);
  if (refMatch) {
    data.booking_reference = refMatch[1];
  }

  // 5. Route (Origin / Destination IATA)
  // Usually looks like: ALC ORY
  const routeMatch = text.match(/([A-Z]{3})\s+([A-Z]{3})/);
  if (routeMatch) {
    data.origin = routeMatch[1];
    data.destination = routeMatch[2];
  }

  // 6. Dates and Times
  // Pattern: DD/MM/YYYY and HH:MM
  const dates = text.match(/\d{2}\/\d{2}\/\d{4}/g);
  const times = text.match(/\d{2}:\d{2}/g);

  if (dates && times) {
    // Vueling usually repeats dates for departure and arrival
    const depDate = dates[0];
    const depTime = times.find(t => text.includes(`HORA\n${t}`) || text.includes(`SALIDA\n${depDate}\n${t}`)) || times[0];
    
    // Attempt to construct ISO strings
    const [d, m, y] = depDate.split('/');
    data.departure_time = `${y}-${m}-${d}T${depTime}:00`;

    // Arrival is usually the next time in the list
    const arrivalTime = times[times.indexOf(depTime!) + 1] || times[1];
    if (arrivalTime) {
      data.arrival_time = `${y}-${m}-${d}T${arrivalTime}:00`;
    }
  }

  // 7. Seat (ASIENTO)
  const seatMatch = text.match(/ASIENTO\s*\n\s*(\d+[A-Z])\s*(.*)/i);
  if (seatMatch) {
    data.seat = seatMatch[1];
    data.seat_note = seatMatch[2].trim();
  }

  // 8. Boarding Group (GRUPO EMBARQUE)
  const groupMatch = text.match(/GRUPO\s*EMBARQUE\s*\n\s*(\d+)/i) || text.match(/GRUPO\s*(\d+)/i);
  if (groupMatch) {
    data.boarding_group = groupMatch[1];
  }

  // 9. Duration
  const durationMatch = text.match(/duración de (\d+)h (\d+)m/i);
  if (durationMatch) {
    data.duration_minutes = parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2]);
  }

  // 10. Check-in Windows
  const checkinMatches = text.match(/(\d{2}:\d{2})/g);
  // This is more complex without knowing exact layout, but we can look for keywords nearby
  const opensMatch = text.match(/Apertura.*(\d{2}:\d{2})/i);
  if (opensMatch) data.checkin_opens_at = opensMatch[1];
  
  const closesMatch = text.match(/Cierre.*(\d{2}:\d{2})/i);
  if (closesMatch) data.checkin_closes_at = closesMatch[1];

  // Validation
  const requiredFields: (keyof VuelingBoardingData)[] = ['passenger_name', 'origin', 'destination', 'flight_number', 'departure_time', 'booking_reference'];
  const isValid = requiredFields.every(f => !!data[f]);

  return isValid ? (data as VuelingBoardingData) : null;
}
