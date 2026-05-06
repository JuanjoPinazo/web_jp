/**
 * Air France / HOP Specialized Parser
 */
import { ExtractedFlightData } from './vueling';

export function parseAirFrance(text: string): ExtractedFlightData | null {
  const t = text.toLowerCase();
  
  const isAF = t.includes('air france') || t.includes('hop!') || /\bAF\d{4}\b/i.test(text);
  if (!isAF) return null;

  console.log('[DEBUG] Air France / HOP detectado');

  const data: ExtractedFlightData = {
    airline: t.includes('hop!') ? 'HOP!' : 'Air France',
    qr_detected: t.includes('tarjeta de embarque') || t.includes('boarding pass'),
    confidence: 0
  };

  // 1. Flight Number (AF\d{4})
  const flightMatch = text.match(/\b(AF\d{4,5})\b/i);
  if (flightMatch) {
    data.flight_number = flightMatch[1].toUpperCase();
  }

  // 2. Route (IATA 3 letters)
  const iataCodes = text.match(/\b[A-Z]{3}\b/g);
  if (iataCodes && iataCodes.length >= 2) {
    // Intentar buscar los que están cerca de palabras clave
    data.departure_location = iataCodes[0];
    data.arrival_location = iataCodes[1];
  }

  // 3. Times (French format: 17h05 -> 17:05)
  const frenchTimes = text.match(/(\d{2})h(\d{2})/g);
  if (frenchTimes) {
    const formattedTimes = frenchTimes.map(ft => ft.replace('h', ':'));
    // Asignar salida y llegada (asumiendo orden cronológico)
    const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch) {
      const [d, m, y] = dateMatch[1].split('/');
      data.departure_time = `${y}-${m}-${d}T${formattedTimes[0]}:00`;
      if (formattedTimes[1]) {
        data.arrival_time = `${y}-${m}-${d}T${formattedTimes[1]}:00`;
      }
    }
  }

  // 4. Terminal
  const terminalMatch = text.match(/Terminal\s*([A-Z0-9]+)/i);
  if (terminalMatch) {
    data.gate = `Terminal ${terminalMatch[1]}`; // Lo guardamos en gate o añadimos campo
  }

  // 5. Cabin Class
  if (t.includes('economy')) {
    data.baggage_info = (data.baggage_info ? data.baggage_info + ' · ' : '') + 'Economy';
  }

  // 6. Seat
  const seatMatch = text.match(/Siège\s*(\d+[A-Z])/i) || text.match(/Seat\s*(\d+[A-Z])/i);
  if (seatMatch) {
    data.seat = seatMatch[1];
  }

  // 7. Booking Reference
  const refMatch = text.match(/Localizador\s*([A-Z0-9]{6})/i) || text.match(/Booking ref\s*([A-Z0-9]{6})/i);
  if (refMatch) {
    data.booking_reference = refMatch[1];
  }

  // Confidence
  const criticalFields = ['flight_number', 'departure_location', 'arrival_location', 'departure_time'];
  const presentCount = criticalFields.filter(f => !!(data as any)[f]).length;
  data.confidence = presentCount / criticalFields.length;

  console.log('[DEBUG] Air France Data:', data);

  return data;
}
