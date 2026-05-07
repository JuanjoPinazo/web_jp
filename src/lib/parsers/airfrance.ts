/**
 * Air France / HOP Specialized Parser
 */
import { ExtractedFlightData } from './vueling';

export function parseAirFrance(text: string): ExtractedFlightData | null {
  const t = text.toUpperCase();
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  const isAF = t.includes('AIRFRANCE') || t.includes('AIR FRANCE') || t.includes('HOP!') || /\bAF\d{4,5}\b/i.test(text);
  if (!isAF) return null;

  console.log('[DEBUG] Air France / HOP detectado');

  const data: ExtractedFlightData = {
    airline: 'Air France / HOP',
    qr_detected: false,
    qr_decoded: false,
    confidence: 0
  };

  // 1. Booking Reference: ZXBR5T
  const refMatch = text.match(/(?:LOCALIZADOR|BOOKING REF|C\u00D3DIGO DE RESERVA)\s*[:\-]?\s*([A-Z0-9]{6})\b/i);
  if (refMatch) data.booking_reference = refMatch[1].toUpperCase();

  // 2. Passenger Name: SARA RUIZ CORELL
  const passIdx = lines.findIndex(l => l.toUpperCase().includes('NOMBRE') || l.toUpperCase().includes('PASAJERO') || l.toUpperCase().includes('NOM '));
  if (passIdx >= 0 && lines[passIdx + 1]) {
     const nameCandidate = lines[passIdx + 1].toUpperCase();
     if (nameCandidate.split(' ').length >= 2) {
       data.passenger_name = nameCandidate;
     }
  }

  // 3. Flight Number: AF1417
  const flightMatch = text.match(/\b(AF\d{4,5})\b/i) || text.match(/\b(A5\d{4,5})\b/i);
  if (flightMatch) data.flight_number = flightMatch[1].toUpperCase();

  // 4. Route (IATA)
  const iataMatches = text.match(/\b([A-Z]{3})\b/g);
  if (iataMatches) {
     const excluded = ['EUR', 'IVA', 'PDF', 'XHI', 'BCN', 'MAD', 'AF', 'HOP', 'NOM'];
     const validIatas = iataMatches.filter(code => !excluded.includes(code.toUpperCase()));
     if (validIatas.length >= 2) {
        data.departure_location = validIatas[0];
        data.arrival_location = validIatas[1];
     }
  }

  // 5. Times and Date
  const frenchTimes = [...text.matchAll(/(\d{2})h(\d{2})/g)];
  const dateMatch = text.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  
  if (dateMatch) {
     const day = dateMatch[1];
     const month = dateMatch[2];
     const year = dateMatch[3];
     
     if (frenchTimes.length >= 1) {
        const depTime = frenchTimes[0][1] + ':' + frenchTimes[0][2];
        data.departure_time = `${year}-${month}-${day}T${depTime}:00`;
        
        if (frenchTimes[1]) {
           const arrTime = frenchTimes[1][1] + ':' + frenchTimes[1][2];
           data.arrival_time = `${year}-${month}-${day}T${arrTime}:00`;
        }
     }
  }

  // 6. Check-in Deadline
  const deadlineMatch = text.match(/(?:HORA L\u00CDMITE|CHECK-IN DEADLINE|HEURE LIMITE)\s*[:\-]?\s*(\d{2}h\d{2})/i);
  if (deadlineMatch) {
     data.checkin_deadline = deadlineMatch[1].replace('h', ':');
  }

  // 7. Seat
  const seatMatch = text.match(/(?:SI\u00C8GE|SEAT|ASIENTO)\s*[:\-]?\s*(\d+[A-Z])/i);
  if (seatMatch) data.seat = seatMatch[1].toUpperCase();

  // 8. Cabin Class & Baggage
  if (t.includes('ECONOMY')) data.cabin_class = 'Economy';
  if (t.includes('NO BAGGAGE') || t.includes('SIN EQUIPAJE') || t.includes('NING\u00DAN EQUIPAJE') || t.includes('SANS BAGAGE')) {
     data.baggage_info = 'No baggage';
  }

  // 9. Status
  if (t.includes('CONFIRMADO') || t.includes('CONFIRMED') || t.includes('CONFIRM\u00C9') || t.includes(' OK\n')) {
     (data as any).status = 'OK';
  }

  data.confidence = 95;
  
  console.log('[DEBUG] Air France Data Extracted:', data);

  return data;
}
