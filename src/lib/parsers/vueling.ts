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
  
  // 1. Detection
  const isBoardingPass = (t.includes('VUELING') || t.includes('VY')) && 
                         (t.includes('CÓD. RESERVA') || t.includes('CÓD RESERVA') || t.includes('LOCALIZADOR')) && 
                         t.includes('ASIENTO') && 
                         (t.includes('Nº VUELO') || t.includes('VUELO'));

  if (!isBoardingPass) return null;

  // Normalización
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const data: ExtractedFlightData = {
    airline: 'Vueling',
    qr_detected: true,
    confidence: 0
  };

  // 2. PASAJERO: Buscar línea que contiene "NOMBRE"
  const idxNombre = lines.findIndex(l => l.toUpperCase().includes('NOMBRE'));
  if (idxNombre >= 0) {
    // Intentar línea anterior
    if (idxNombre > 0) {
      const prev = lines[idxNombre - 1];
      if (prev.length > 5 && /^[A-ZÁÉÍÓÚÑ\s]+$/.test(prev)) {
        data.passenger_name = prev;
        console.log('PASSENGER CANDIDATE (PREV):', prev);
      }
    }
    // Si no se encontró, intentar línea siguiente (común en pdftotext)
    if (!data.passenger_name && lines[idxNombre + 1]) {
      const next = lines[idxNombre + 1];
      if (next.length > 5 && /^[A-ZÁÉÍÓÚÑ\s]+$/.test(next)) {
        data.passenger_name = next;
        console.log('PASSENGER CANDIDATE (NEXT):', next);
      }
    }
  }

  // 3. LOCALIZADOR: Búsqueda tolerante multilínea con validación alfanumérica fuerte
  const flatText = text
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  const invalidWords = [
    'ASIENTO', 'VUELO', 'SALIDA', 'LLEGADA', 'PUERTA', 'GRUPO', 
    'EMBARQUE', 'DESTINO', 'ORIGEN', 'FECHA', 'HORA', 'NOMBRE', 'RESERVA', 'COD'
  ];

  // Intentar encontrar el código después de una palabra clave de reserva
  const reservationKeywordMatch = flatText.match(/(?:COD\.?\s*RESERVA|RESERVA)\s+([A-Z0-9]{5,8})\b/);
  if (reservationKeywordMatch && !invalidWords.includes(reservationKeywordMatch[1]) && /[A-Z]/.test(reservationKeywordMatch[1]) && /\d/.test(reservationKeywordMatch[1])) {
    data.booking_reference = reservationKeywordMatch[1];
    console.log('BOOKING REFERENCE (KEYWORD MATCH):', data.booking_reference);
  } else {
    // Si falla la búsqueda por palabra clave, buscar el primer código alfanumérico válido
    const possibleBookingRefs = flatText.match(/\b[A-Z0-9]{5,8}\b/g) || [];
    const bookingReference = possibleBookingRefs.find(code => {
      return (
        !invalidWords.includes(code) &&
        /[A-Z]/.test(code) && // Debe tener al menos una letra
        /\d/.test(code)      // Debe tener al menos un número
      );
    }) || null;

    if (bookingReference) {
      data.booking_reference = bookingReference;
      console.log('BOOKING REFERENCE (SEARCH MATCH):', bookingReference);
    }
  }

  // 4. HORAS: Basado exclusivamente en el bloque SALIDA LLEGADA
  const idxSalidaLlegada = lines.findIndex(l =>
    l.toUpperCase().includes('SALIDA') && l.toUpperCase().includes('LLEGADA')
  );
  if (idxSalidaLlegada >= 0) {
    const chunk = lines.slice(idxSalidaLlegada, idxSalidaLlegada + 12).join(' ');
    const hours = [...chunk.matchAll(/(\d{2}:\d{2})\s*H/g)].map(m => m[1]);
    
    // Quitar duplicados consecutivos si existen (para evitar repetir la salida en la llegada)
    const uniqueHours = hours.filter((h, i) => h !== hours[i - 1]);
    
    data.departure_time = uniqueHours[0];
    data.arrival_time = uniqueHours[1];

    console.log('VUELING HOURS CHUNK:', chunk);
    console.log('VUELING HOURS:', hours);
    console.log('VUELING UNIQUE HOURS:', uniqueHours);
  }

  // 5. ORIGEN / DESTINO: AAA BBB
  const routeLine = lines.find(l => /^[A-Z]{3}\s+[A-Z]{3}$/.test(l));
  if (routeLine) {
    const parts = routeLine.split(/\s+/);
    data.departure_location = parts[0];
    data.arrival_location = parts[1];
  }

  // 6. FECHA: Después de "FECHA"
  const idxFecha = lines.findIndex(l => l.toUpperCase().includes('FECHA'));
  if (idxFecha >= 0 && lines[idxFecha + 1]) {
    const dateMatch = lines[idxFecha + 1].match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateMatch) {
      (data as any).departure_date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    }
  }

  // 7. VUELO: VYXXXX
  const flightLine = lines.find(l => /VY\d{4,5}/i.test(l));
  if (flightLine) {
    const flightMatch = flightLine.match(/VY\d{4,5}/i);
    if (flightMatch) data.flight_number = flightMatch[0].toUpperCase();
  }

  // 8. ASIENTO: 2C Pasillo
  const seatLine = lines.find(l => /[0-9]{1,2}[A-F]\s+(Pasillo|Ventana|Centro)?/i.test(l));
  if (seatLine) {
    const seatMatch = seatLine.match(/([0-9]{1,2}[A-F])\s+(Pasillo|Ventana|Centro)?/i);
    if (seatMatch) {
      data.seat = seatMatch[1];
      data.seat_note = seatMatch[2];
    }
  }

  // 9. GRUPO: Cerca de "GRUPO"
  const idxGrupo = lines.findIndex(l => l.toUpperCase().includes('GRUPO'));
  if (idxGrupo >= 0) {
    const lineWithGroup = lines[idxGrupo];
    const internalMatch = lineWithGroup.match(/\b(\d+)\b/);
    if (internalMatch) {
      data.boarding_group = internalMatch[1];
    } else {
      const candidates = [lines[idxGrupo-1], lines[idxGrupo+1], lines[idxGrupo+2]];
      const groupCandidate = candidates.find(l => l && /^\d+$/.test(l));
      if (groupCandidate) data.boarding_group = groupCandidate;
    }
  }

  // 10. PUERTA (Opcional)
  const idxGate = lines.findIndex(l => l.toUpperCase().includes('PUERTA') || l.toUpperCase().includes('GATE'));
  if (idxGate >= 0 && lines[idxGate + 1]) {
    const gateCandidate = lines[idxGate + 1];
    if (gateCandidate.length <= 4 && gateCandidate !== '--') {
      data.gate = gateCandidate;
    }
  }

  // 11. DURACIÓN
  const durationLine = lines.find(l => /duración de (\d+)h (\d+)m/i.test(l));
  if (durationLine) {
    const durationMatch = durationLine.match(/duración de (\d+)h (\d+)m/i);
    if (durationMatch) {
      data.duration_minutes = parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2]);
    }
  }

  // CONFIDENCE
  const criticalFields = [
    data.passenger_name,
    data.departure_location,
    data.arrival_location,
    data.departure_time,
    data.flight_number,
    data.seat,
    data.booking_reference
  ];
  const filledCount = criticalFields.filter(Boolean).length;
  data.confidence = filledCount / criticalFields.length;

  console.log('[DEBUG Vueling Parser] DEBUG VISUAL:', {
    passenger_name: data.passenger_name,
    departure_time: data.departure_time,
    arrival_time: data.arrival_time,
    booking_reference: data.booking_reference,
    boarding_group: data.boarding_group,
    missingFields: ['passenger_name', 'departure_location', 'arrival_location', 'departure_time', 'arrival_time', 'flight_number', 'seat', 'booking_reference'].filter(f => !(data as any)[f])
  });

  return data;
}

export function parseVuelingFlightConfirmation(text: string): ExtractedFlightData | null {
  const t = text.toLowerCase();
  if (!t.includes('vueling') || (!t.includes('confirmación') && !t.includes('itinerario'))) return null;

  const data: any = { airline: 'Vueling', confidence: 0, qr_detected: false };
  // ... (mantenemos lógica de confirmación simplificada por ahora)
  return data;
}
