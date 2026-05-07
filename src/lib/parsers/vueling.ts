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
  checkin_deadline?: string;
  cabin_class?: string;
  baggage_info?: string;
  qr_detected: boolean;
  qr_decoded?: boolean;
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

  // 10. COMBINAR FECHA Y HORA
  if ((data as any).departure_date && data.departure_time) {
    const baseDate = (data as any).departure_date;
    data.departure_time = `${baseDate}T${data.departure_time}:00`;
    if (data.arrival_time) {
      data.arrival_time = `${baseDate}T${data.arrival_time}:00`;
    }
  }

  // CONFIDENCE
  const criticalFields = [data.passenger_name, data.departure_location, data.flight_number, data.booking_reference];
  data.confidence = criticalFields.filter(Boolean).length / criticalFields.length;

  return data;
}

export function parseVuelingFlightConfirmation(text: string): ExtractedFlightData | null {
  const t = text.toUpperCase();
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  // 1. Detection
  const isConfirmation = t.includes('RESERVA CONFIRMADA') || 
                        t.includes('ESTE EMAIL NO ES VÁLIDO COMO TARJETA DE EMBARQUE') ||
                        t.includes('CÓDIGO DE RESERVA') ||
                        t.includes('GESTIONA TU RESERVA');

  if (!isConfirmation) return null;

  const data: ExtractedFlightData = {
    airline: 'Vueling',
    qr_detected: false,
    qr_decoded: false,
    confidence: 0
  };

  // --- DEBUG LOGS VARS ---
  const provider = 'Vueling';
  const document_type = 'flight_confirmation';
  let flightBlock = '';
  let passengerBlock = '';

  // 1. LOCALIZADOR: "Código de reserva: XHIQNF"
  const resMatch = text.match(/Código de reserva:\s*([A-Z0-9]{5,8})/i);
  if (resMatch) {
    data.booking_reference = resMatch[1].toUpperCase();
  }

  // 2. PASAJERO: Bloque "PASAJEROS Y SERVICIOS"
  const passIdx = lines.findIndex(l => l.toUpperCase().includes('PASAJEROS Y SERVICIOS'));
  if (passIdx >= 0) {
    passengerBlock = lines.slice(passIdx, passIdx + 10).join(' | ');
    // Buscar línea que parezca nombre real (2+ palabras, letras y espacios, no keywords)
    for (let i = passIdx + 1; i < passIdx + 6; i++) {
       const line = lines[i];
       if (!line) continue;
       const words = line.trim().split(/\s+/);
       if (words.length >= 2 && 
           /^[a-zñáéíóú\s]+$/i.test(line) && 
           !/Pasajeros|Ida|Asiento|Servicios|Reserva|Vuelo|Equipaje|Maleta/i.test(line)) {
         data.passenger_name = line.trim();
         break;
       }
    }
  }

  // 3. VUELO: VY8163
  const flightMatch = text.match(/VY\d{4}/i);
  if (flightMatch) {
    data.flight_number = flightMatch[0].toUpperCase();
  }

  // 4. BLOQUE VISUAL DE VUELO (Origen, Destino, Horas, Fecha)
  const flightLineIdx = lines.findIndex(l => l.toUpperCase().includes(data.flight_number || 'VY'));
  if (flightLineIdx >= 0) {
    // Escaneamos un bloque alrededor del número de vuelo
    const start = Math.max(0, flightLineIdx - 5);
    const end = Math.min(lines.length, flightLineIdx + 15);
    flightBlock = lines.slice(start, end).join(' | ');
    
    // 4.1 Fecha: "viernes, 22 mayo 2026"
    const dateMatch = flightBlock.match(/(\d{1,2})[\s/](enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[\s/](\d{4})/i);
    if (dateMatch) {
       const day = dateMatch[1].padStart(2, '0');
       let monthStr = dateMatch[2].toLowerCase();
       const months: any = {
         'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
         'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12',
         'mayo': '05', 'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'junio': '06',
         'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
       };
       const month = months[monthStr] || months[monthStr.substring(0, 3)] || '01';
       (data as any).departure_date = `${dateMatch[3]}-${month}-${day}`;
    }

    // 4.2 IATAs (Origen y Destino)
    // Buscamos códigos de 3 letras mayúsculas evitando ruido
    const excluded = ['RAQ', 'FUE', 'RV', 'EUR', 'IVA', 'PDF', 'XHI', 'VY'];
    const iataMatches = flightBlock.match(/\b([A-Z]{3})\b/g);
    if (iataMatches) {
       const validIatas = iataMatches.filter(code => !excluded.includes(code.toUpperCase()));
       if (validIatas.length >= 2) {
          data.departure_location = validIatas[0];
          data.arrival_location = validIatas[1];
       }
    }

    // 4.3 Horas: "13:00h"
    const timeMatches = [...flightBlock.matchAll(/(\d{2}:\d{2})h?/gi)];
    if (timeMatches.length >= 2) {
       data.departure_time = timeMatches[0][1];
       data.arrival_time = timeMatches[1][1];
    }
  }

  // 5. ASIENTO: En el bloque de pasajeros
  if (passIdx >= 0) {
    const seatIdx = lines.findIndex((l, i) => i > passIdx && l.toUpperCase().includes('ASIENTO'));
    if (seatIdx >= 0 && lines[seatIdx + 1]) {
       // La línea siguiente suele ser el asiento "3E"
       const seatCandidate = lines[seatIdx + 1].match(/([0-9]{1,2}[A-F])\b/i);
       if (seatCandidate) {
         data.seat = seatCandidate[1].toUpperCase();
       }
    }
  }

  // 6. EQUIPAJE
  if (t.includes('BAJO EL ASIENTO') || t.includes('COMPARTIMENTO SUPERIOR')) {
    data.baggage_info = 'Equipaje bajo asiento + cabina incluido';
  }

  // 7. COMBINAR FECHA Y HORA
  if ((data as any).departure_date && data.departure_time) {
    const baseDate = (data as any).departure_date;
    data.departure_time = `${baseDate}T${data.departure_time}:00`;
    if (data.arrival_time) {
      data.arrival_time = `${baseDate}T${data.arrival_time}:00`;
    }
  }

  data.confidence = 95;

  // DEBUG OBLIGATORIO
  console.log({
    provider,
    document_type,
    flightBlock,
    passengerBlock,
    extracted: data
  });

  return data;
}

