/**
 * Air France / HOP Specialized Parser
 */
import { ExtractedFlightData } from './vueling';

export function parseAirFrance(text: string): ExtractedFlightData | null {
  const t = text.toUpperCase();
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  const isAF = t.includes('AIRFRANCE') || t.includes('AIR FRANCE') || t.includes('HOP!') || /\bAF\s*\d{1,5}\b/i.test(text) || t.includes('AIR_FRANCE');
  if (!isAF) return null;

  console.log('[DEBUG] Air France / HOP detectado');

  const data: ExtractedFlightData = {
    airline: 'AIRFRANCE',
    qr_detected: false,
    qr_decoded: false,
    confidence: 0
  };

  // 1. Booking Reference: ZXBR5T
  const refMatch = text.match(/(?:LOCALIZADOR|BOOKING REF|C\u00D3DIGO DE RESERVA|DOSSIER DE R\u00C9SERVATION|R\u00C9F\u00C9RENCE DE DOSSIER|DOSSIER REF|R\u00C9F\u00C9RENCE|RECORD LOCATOR)\s*[:\-]?\s*\b([A-Z0-9]{6})\b/i);
  if (refMatch) {
    data.booking_reference = refMatch[1].toUpperCase();
  }

  // 2. Passenger Name
  // A. Check for IATA standard name slash pattern: LASTNAME/FIRSTNAME (e.g. PINAZO/JUANJO or PINAZO/JUANJO MR)
  const slashNameMatch = text.match(/\b([A-Z]{3,})\s*\/\s*([A-Z]{3,})(?:\s*(?:MR|MRS|MS|MSTR|CHD|DR|PROF))?\b/i);
  if (slashNameMatch) {
     const lastName = slashNameMatch[1].trim();
     const firstName = slashNameMatch[2].trim();
     data.passenger_name = `${firstName} ${lastName}`.toUpperCase();
  } else {
     // B. Fallback to line index based NOMBRE / PASAJERO / NOM
     const passIdx = lines.findIndex(l => {
       const ul = l.toUpperCase();
       return ul.includes('NOMBRE') || ul.includes('PASAJERO') || ul.includes('NOM ') || ul.includes('PASSENGER') || ul.includes('NOM/PR');
     });
     if (passIdx >= 0 && lines[passIdx + 1]) {
        const nameCandidate = lines[passIdx + 1].toUpperCase().trim();
        // Ensure it doesn't look like labels or codes
        if (nameCandidate.split(' ').length >= 2 && !nameCandidate.includes('BOARDING') && nameCandidate.length < 40) {
          data.passenger_name = nameCandidate;
        }
     }
  }

  // 3. Flight Number: AF1417 or AF 1417 or A5 1234
  const flightMatch = text.match(/\b(AF|A5)\s*-?\s*(\d{1,5})\b/i);
  if (flightMatch) {
    const carrier = flightMatch[1].toUpperCase();
    const digits = flightMatch[2];
    data.flight_number = `${carrier}${digits}`;
  }

  // 4. Route (IATA)
  const iataMatches = text.match(/\b([A-Z]{3})\b/g);
  if (iataMatches) {
     // Exclude noise, but DO NOT exclude BCN or MAD!
     const excluded = ['EUR', 'IVA', 'PDF', 'XHI', 'AFR', 'HOP', 'NOM', 'CPY', 'VAL', 'PAG', 'SIEG', 'SEAT', 'ZONE', 'GATE', 'BOARD', 'CLASS', 'DATE', 'TIME'];
     const validIatas = iataMatches
       .map(c => c.toUpperCase())
       .filter(code => !excluded.includes(code));
     
     // Remove consecutive duplicates (e.g. MAD MAD)
     const uniqueIatas: string[] = [];
     for (const code of validIatas) {
       if (uniqueIatas.length === 0 || uniqueIatas[uniqueIatas.length - 1] !== code) {
         uniqueIatas.push(code);
       }
     }

     if (uniqueIatas.length >= 2) {
        data.departure_location = uniqueIatas[0];
        data.arrival_location = uniqueIatas[1];
     }
  }

  // 5. Times and Date
  // Match format: 12h30, 12:30, 12H30
  const frenchTimes = [...text.matchAll(/\b(\d{2})[H:](\d{2})\b/gi)];
  
  // Date matchers
  // A. DD/MM/YYYY or DD-MM-YYYY
  let dateMatch = text.match(/\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b/);
  let day = '', month = '', year = '';

  if (dateMatch) {
    day = dateMatch[1];
    month = dateMatch[2];
    year = dateMatch[3];
  } else {
    // B. DD/MM/YY
    const dateMatchYY = text.match(/\b(\d{2})[\/\-](\d{2})[\/\-](\d{2})\b/);
    if (dateMatchYY) {
      day = dateMatchYY[1];
      month = dateMatchYY[2];
      year = '20' + dateMatchYY[3];
    } else {
      // C. DD MMM YYYY or DD MMM (e.g. 17 MAY 2026 or 17 MAI 2026 or 17 MAI)
      const monthsMap: Record<string, string> = {
        JAN: '01', ENER: '01', ENE: '01', JANV: '01',
        FEB: '02', FEBR: '02', FEVR: '02', FEV: '02',
        MAR: '03', MARS: '03',
        APR: '04', ABR: '04', AVR: '04', AVRI: '04',
        MAY: '05', ABRIL: '04', MAI: '05', Mayo: '05',
        JUN: '06', JUNI: '06', JUIN: '06',
        JUL: '07', JULI: '07', JUIL: '07',
        AUG: '08', AGO: '08', AOUT: '08',
        SEP: '09', SEPT: '09',
        OCT: '10', OCTO: '10',
        NOV: '11', NOVE: '11',
        DEC: '12', DICI: '12', DECE: '12', DECEM: '12'
      };

      const monthRegexStr = Object.keys(monthsMap).join('|');
      const dateTextMatch = text.match(new RegExp(`\\b(\\d{1,2})\\s+(${monthRegexStr})\\.?\\s*(\\d{2,4})?\\b`, 'i'));
      if (dateTextMatch) {
        day = dateTextMatch[1].padStart(2, '0');
        const monthWord = dateTextMatch[2].toUpperCase();
        month = monthsMap[monthWord];
        const yearWord = dateTextMatch[3];
        if (yearWord) {
          year = yearWord.length === 2 ? '20' + yearWord : yearWord;
        } else {
          year = new Date().getFullYear().toString(); // Fallback to current year
        }
      }
    }
  }

  if (day && month && year) {
    if (frenchTimes.length >= 1) {
       const depH = frenchTimes[0][1];
       const depM = frenchTimes[0][2];
       data.departure_time = `${year}-${month}-${day}T${depH}:${depM}:00`;
       
       if (frenchTimes[1]) {
          const arrH = frenchTimes[1][1];
          const arrM = frenchTimes[1][2];
          data.arrival_time = `${year}-${month}-${day}T${arrH}:${arrM}:00`;
       }
    }
  }

  // 6. Check-in Deadline (HEURE LIMITE D'ENREGISTREMENT / HORA LÍMITE)
  const deadlineMatch = text.match(/(?:HORA L\u00CDMITE|CHECK-IN DEADLINE|HEURE LIMITE|HEURE LIMITE D'ENREGISTREMENT)\s*[:\-]?\s*(\d{2})[H:](\d{2})/i);
  if (deadlineMatch) {
     data.checkin_deadline = `${deadlineMatch[1]}:${deadlineMatch[2]}`;
  }

  // 7. Seat
  const seatMatch = text.match(/(?:SI\u00C8GE|SEAT|ASIENTO)\s*[:\-]?\s*(\d+[A-Z])\b/i);
  if (seatMatch) {
    data.seat = seatMatch[1].toUpperCase();
  }

  // 8. Cabin Class & Baggage
  if (t.includes('ECONOMY') || t.includes('BUSINESS') || t.includes('PREMIUM') || t.includes('LA PREMIERE')) {
     if (t.includes('ECONOMY')) data.cabin_class = 'Economy';
     else if (t.includes('BUSINESS')) data.cabin_class = 'Business';
     else if (t.includes('PREMIUM')) data.cabin_class = 'Premium Economy';
  }
  if (t.includes('NO BAGGAGE') || t.includes('SIN EQUIPAJE') || t.includes('NING\u00DAN EQUIPAJE') || t.includes('SANS BAGAGE')) {
     data.baggage_info = 'No baggage';
  }

  // 9. Status
  if (t.includes('CONFIRMADO') || t.includes('CONFIRMED') || t.includes('CONFIRM\u00C9') || t.includes(' OK\n')) {
     (data as any).status = 'OK';
  }

  // Calculate confidence based on matched critical fields
  let foundFields = 0;
  if (data.flight_number) foundFields++;
  if (data.booking_reference) foundFields++;
  if (data.passenger_name) foundFields++;
  if (data.departure_location && data.arrival_location) foundFields++;
  if (data.departure_time) foundFields++;

  data.confidence = Math.round(50 + (foundFields / 5) * 45);

  console.log('[DEBUG] Air France Data Extracted:', data);

  return data;
}
