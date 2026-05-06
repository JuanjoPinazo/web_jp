/**
 * Vueling Specialized Parser
 */

export interface ExtractedFlightData {
  passenger_name?: string;
  airline: string;
  flight_number?: string;
  departure_location?: string;
  arrival_location?: string;
  departure_time?: string;
  arrival_time?: string;
  seat?: string;
  seat_note?: string;
  boarding_group?: string;
  gate?: string;
  booking_reference?: string;
  duration_minutes?: number;
  checkin_opens_at?: string;
  checkin_closes_at?: string;
  baggage_info?: string;
  qr_detected: boolean;
  confidence: number;
}

export function parseVuelingBoardingPass(text: string): ExtractedFlightData | null {
  const t = text.toUpperCase();
  
  // 1. Detection - Boarding Pass Specific Keywords
  const isBoardingPass = (t.includes('VUELING') || t.includes('VY')) && 
                         (t.includes('CÓD. RESERVA') || t.includes('NOMBRE') || t.includes('ORIGEN DESTINO BN') || t.includes('GRUPO EMBARQUE'));

  if (!isBoardingPass) return null;

  // Normalización
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const data: ExtractedFlightData = {
    airline: 'Vueling',
    qr_detected: true, // Boarding passes always have a visual code
    confidence: 0
  };

  // 2. PASAJERO: Buscar línea que contiene "NOMBRE"
  const idxNombre = lines.findIndex(l => l.toUpperCase().includes('NOMBRE'));
  if (idxNombre >= 0) {
    if (idxNombre > 0) {
      const prev = lines[idxNombre - 1];
      if (prev.length > 5 && /^[A-ZÁÉÍÓÚÑ\s]+$/.test(prev)) {
        data.passenger_name = prev;
      }
    }
    if (!data.passenger_name && lines[idxNombre + 1]) {
      const next = lines[idxNombre + 1];
      if (next.length > 5 && /^[A-ZÁÉÍÓÚÑ\s]+$/.test(next)) {
        data.passenger_name = next;
      }
    }
  }

  // 3. LOCALIZADOR: Búsqueda fuerte
  const flatText = text.replace(/\s+/g, ' ').toUpperCase();
  const resMatch = flatText.match(/(?:CÓD\.?\s*RESERVA|LOCALIZADOR|RESERVA)\s*[:\-]?\s*([A-Z0-9]{5,8})\b/);
  if (resMatch) {
    data.booking_reference = resMatch[1];
  }

  // 4. HORAS
  const idxSalidaLlegada = lines.findIndex(l =>
    l.toUpperCase().includes('SALIDA') && l.toUpperCase().includes('LLEGADA')
  );
  if (idxSalidaLlegada >= 0) {
    const chunk = lines.slice(idxSalidaLlegada, idxSalidaLlegada + 5).join(' ');
    const hours = [...chunk.matchAll(/(\d{2}:\d{2})\s*H/g)].map(m => m[1]);
    data.departure_time = hours[0];
    data.arrival_time = hours[1];
  }

  // 5. ORIGEN / DESTINO
  const routeLine = lines.find(l => /^[A-Z]{3}\s+[A-Z]{3}$/.test(l));
  if (routeLine) {
    const parts = routeLine.split(/\s+/);
    data.departure_location = parts[0];
    data.arrival_location = parts[1];
  }

  // 6. FECHA
  const idxFecha = lines.findIndex(l => l.toUpperCase().includes('FECHA'));
  if (idxFecha >= 0 && lines[idxFecha + 1]) {
    const dateMatch = lines[idxFecha + 1].match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateMatch) {
      (data as any).departure_date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    }
  }

  // 7. VUELO
  const flightMatch = text.match(/VY\d{4,5}/i);
  if (flightMatch) data.flight_number = flightMatch[0].toUpperCase();

  // 8. ASIENTO
  const seatMatch = text.match(/([0-9]{1,2}[A-F])\b/i);
  if (seatMatch) data.seat = seatMatch[1];

  // 9. GRUPO
  const groupMatch = text.match(/GRUPO\s+(\d+)/i);
  if (groupMatch) data.boarding_group = groupMatch[1];

  // CONFIDENCE
  const criticalFields = [data.passenger_name, data.departure_location, data.flight_number, data.booking_reference];
  data.confidence = criticalFields.filter(Boolean).length / criticalFields.length;

  return data;
}

export function parseVuelingFlightConfirmation(text: string): ExtractedFlightData | null {
  const t = text.toUpperCase();
  
  // 1. Detection - Flight Confirmation Specific Keywords
  const isConfirmation = t.includes('RESERVA CONFIRMADA') || 
                        t.includes('ESTE EMAIL NO ES VÁLIDO COMO TARJETA DE EMBARQUE') ||
                        t.includes('CÓDIGO DE RESERVA') ||
                        t.includes('GESTIONA TU RESERVA');

  if (!isConfirmation) return null;

  const data: ExtractedFlightData = {
    airline: 'Vueling',
    qr_detected: false, // Confirmations don't have boarding QRs
    confidence: 0
  };

  // 2. LOCALIZADOR: "Código de reserva: XHIQNF"
  const resMatch = text.match(/(?:C\u00f3digo de reserva|LOCALIZADOR|RESERVA)\s*[:\-]?\s*([A-Z0-9]{5,8})\b/i);
  if (resMatch) {
    data.booking_reference = resMatch[1].toUpperCase();
  }

  // 3. PASAJERO: Bloque "Pasajeros"
  // Intentar match en la misma línea o siguiente
  const passengerMatch = text.match(/(?:Pasajeros|Passenger|Nombre)\s*[:\-]?\s*[\r\n]*\s*([A-ZÁÉÍÓÚÑ]{3,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,})+)/i);
  if (passengerMatch) {
    data.passenger_name = passengerMatch[1].trim();
  } else {
    // Fallback: buscar nombres largos en mayúsculas después de palabras clave
    const lines = text.split('\n').map(l => l.trim());
    const passIdx = lines.findIndex(l => /Pasajeros|Passenger/i.test(l));
    if (passIdx >= 0 && lines[passIdx + 1]) {
      const candidate = lines[passIdx + 1];
      if (candidate.length > 5 && /^[A-ZÁÉÍÓÚÑ\s]+$/.test(candidate)) {
        data.passenger_name = candidate;
      }
    }
  }

  // 4. VUELO: VY8163
  const flightMatch = text.match(/VY\s?(\d{4,5})/i);
  if (flightMatch) {
    data.flight_number = `VY${flightMatch[1]}`.toUpperCase();
  }

  // 5. ORIGEN / DESTINO / HORAS
  // Buscamos formato típico de confirmación: "ORY 13:00 VLC 14:55"
  const routeMatch = text.match(/([A-Z]{3})\s+(\d{2}:\d{2})\s+([A-Z]{3})\s+(\d{2}:\d{2})/i);
  if (routeMatch) {
    data.departure_location = routeMatch[1].toUpperCase();
    data.departure_time = routeMatch[2];
    data.arrival_location = routeMatch[3].toUpperCase();
    data.arrival_time = routeMatch[4];
  } else {
    // Fallback: buscar origen/destino por separado
    const originMatch = text.match(/(?:Origen|Desde|Departure)\s*[:\-]?\s*([A-Z]{3})/i);
    const destMatch = text.match(/(?:Destino|Hacia|Arrival)\s*[:\-]?\s*([A-Z]{3})/i);
    if (originMatch) data.departure_location = originMatch[1].toUpperCase();
    if (destMatch) data.arrival_location = destMatch[1].toUpperCase();
  }

  // 6. FECHA: "viernes, 22 mayo 2026" o similar
  const dateMatch = text.match(/(\d{1,2})[\s/](\d{1,2}|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[\s/](\d{4})/i);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    let month = dateMatch[2].toLowerCase();
    const months: any = {
      'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12',
      'mayo': '05', 'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'junio': '06',
      'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    };
    if (months[month]) month = months[month];
    else if (months[month.substring(0, 3)]) month = months[month.substring(0, 3)];
    else month = month.padStart(2, '0');
    
    (data as any).departure_date = `${dateMatch[3]}-${month}-${day}`;
  }

  // 7. ASIENTO: "Asiento 3E"
  const seatMatch = text.match(/(?:Asiento|Seat)\s*[:\-]?\s*([0-9]{1,2}[A-F])\b/i);
  if (seatMatch) {
    data.seat = seatMatch[1].toUpperCase();
  }

  // 8. EQUIPAJE
  if (t.includes('BAJO EL ASIENTO') || t.includes('COMPARTIMENTO SUPERIOR')) {
    data.baggage_info = 'Equipaje bajo asiento + cabina incluido';
  }

  // CONFIDENCE
  const criticalFields = [data.passenger_name, data.departure_location, data.flight_number, data.booking_reference];
  data.confidence = criticalFields.filter(Boolean).length / criticalFields.length;

  return data;
}

