'use server';

import { extractTextWithPdftotext } from '@/lib/server/pdf/extractTextWithPdftotext';
import { decodeBarcodeFromPdf } from '@/lib/server/pdf/decodeBarcodeFromPdf';
import { 
  parseVuelingBoardingPass, 
  parseVuelingFlightConfirmation,
  parseAirFrance,
  parseHotelBooking 
} from '@/lib/parsers';

export interface ExtractedData {
  type: 'hotel' | 'flight' | 'transfer' | 'document' | 'boarding_pass';
  data: any;
  confidence: number;
  rawText: string;
  error?: string;
  qr_detected?: boolean;
  qr_decoded?: boolean;
  qr_raw_payload?: string;
  file?: File;
}

const PROVIDERS = {
  VUELING: { name: 'Vueling', keywords: ['vueling', 'vy816', 'vy817', 'vy81'] },
  AIR_FRANCE: { name: 'Air France', keywords: ['air france', 'airfrance', 'hop!', 'af841', 'af94'] },
  IBERIA: { name: 'Iberia', keywords: ['iberia', 'air nostrum', 'nostrum'] },
  VOLOTEA: { name: 'Volotea', keywords: ['volotea'] },
  BOOKING: { name: 'Booking.com', keywords: ['booking.com'] },
  HOTELS: { name: 'Hotels.com', keywords: ['hotels.com', 'expedia'] }
};

function detectProvider(text: string): string {
  const t = text.toUpperCase();
  // 1. Air France / HOP (Prioridad máxima para evitar falsos positivos de Vueling)
  if (t.includes('AIRFRANCE') || t.includes('AIR FRANCE') || t.includes('HOP!') || /\bAF\d{4,5}\b/i.test(text)) {
    return 'air_france';
  }
  // 2. Vueling
  if (t.includes('VUELING') || t.includes('VY')) {
    return 'vueling';
  }
  // 3. Iberia
  if (t.includes('IBERIA') || t.includes('IB')) {
    return 'iberia';
  }
  // 4. Volotea
  if (t.includes('VOLOTEA') || t.includes('V7')) {
    return 'volotea';
  }
  // 5. Booking
  if (t.includes('BOOKING.COM')) {
    return 'booking';
  }
  // 6. Hotels
  if (t.includes('HOTELS.COM') || t.includes('EXPEDIA')) {
    return 'hoteles_com';
  }
  return 'auto';
}

function cleanLogisticsNoise(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
    .replace(/(?:De|From|Para|To|CC|Asunto|Subject|Enviado el|Sent|Date|Fecha):\s*[^\n\r]+/gi, '')
    .replace(/(?:Visa|Mastercard|Amex|Pago|Total|EUR|Price|Precio|XXXXXXXXXXXX)\s*[^\n\r]+/gi, '')
    .replace(/(?:Aviso legal|Condiciones|T\u00e9rminos|Privacy|Pol\u00edtica|Derechos|No-reply)[^\n\r]+/gi, '')
    .trim();
}

function normalizeDates(data: any) {
  if (!data) return data;
  const dateFields = ['departure_time', 'arrival_time', 'check_in', 'check_out'];
  dateFields.forEach(field => {
    if (data[field] && typeof data[field] === 'string') {
       // 1. Ya es ISO o ISO parcial (YYYY-MM-DDTHH:mm...)
       if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(data[field])) return;
       
       // 2. Formato DD/MM/YYYY (opcionalmente con hora)
       const match = data[field].match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
       if (match) {
         const [, d, m, y] = match;
         const timeMatch = data[field].match(/(\d{2}:\d{2})/);
         const time = timeMatch ? timeMatch[1] : '12:00';
         data[field] = `${y}-${m}-${d}T${time}`;
       }
    }
  });
  return data;
}

export async function extractTravelInfo(formData: FormData): Promise<ExtractedData> {
  const file = formData.get('file') as File;
  const forcedType = (formData.get('type') as string) || 'auto';
  const forcedProvider = (formData.get('provider') as string) || 'auto';
  
  if (!file) throw new Error('No se ha subido ningún archivo.');

  console.log(`\n--- [DEBUG PDF UPLOAD] ---`);
  console.log(`FILE: ${file.name}, TYPE: ${forcedType}, PROVIDER: ${forcedProvider}`);

  const buffer = Buffer.from(await file.arrayBuffer());
  const rawText = await extractTextWithPdftotext(buffer);
  
  if (rawText.startsWith('__ERROR__')) {
    const errorMsg = rawText.replace('__ERROR__: ', '');
    return { type: 'document', data: {}, confidence: 0, rawText: '', error: errorMsg } as any;
  }

  if (!rawText || rawText.trim().length < 10) {
    return { type: 'document', data: {}, confidence: 0, rawText: '', error: 'No se pudo extraer texto del PDF.' } as any;
  }

  let providerKey = forcedProvider;
  if (providerKey === 'auto') {
    providerKey = detectProvider(rawText);
  }

  console.log(`[DEBUG] Proveedor a usar: ${providerKey}`);
  
  // --- FLUJO DE EXTRACCIÓN DIRIGIDO ---

  // 1. AIR FRANCE / HOP
  if (providerKey === 'air_france') {
    const afData = parseAirFrance(rawText);
    if (afData) {
      return { type: 'flight', data: normalizeDates(afData), confidence: afData.confidence, rawText, file };
    }
  }

  // 2. VUELING
  if (providerKey === 'vueling' || providerKey === 'auto') {
    // Si es BP o auto, intentar BP primero
    if (forcedType === 'auto' || forcedType === 'boarding_pass') {
      const vuelingBP = parseVuelingBoardingPass(rawText);
      if (vuelingBP) {
        const barcodeResult = await decodeBarcodeFromPdf(buffer);
        return { 
          type: 'boarding_pass', 
          data: normalizeDates(vuelingBP), 
          confidence: vuelingBP.confidence, 
          rawText,
          qr_detected: barcodeResult.success || vuelingBP.qr_detected,
          qr_decoded: barcodeResult.success,
          qr_raw_payload: barcodeResult.payload || undefined,
          file
        };
      }
    }

    // Si es reserva o auto, intentar confirmación
    if (forcedType === 'auto' || forcedType === 'flight_confirmation') {
      const vuelingConf = parseVuelingFlightConfirmation(rawText);
      if (vuelingConf) {
        return { type: 'flight', data: normalizeDates(vuelingConf), confidence: vuelingConf.confidence, rawText, file };
      }
    }
  }

  // 3. HOTEL (Booking / Hoteles.com / Generic)
  if (providerKey === 'booking' || providerKey === 'hoteles_com' || providerKey === 'auto' || forcedType === 'hotel_booking') {
    const hotelData = parseHotelBooking(rawText);
    if (hotelData) {
      return { type: 'hotel', data: normalizeDates(hotelData), confidence: hotelData.confidence, rawText, file };
    }
  }

  // 4. FALLBACK GENERAL (si todo lo anterior falló o es auto)
  if (providerKey === 'auto') {
    // Re-intentar Air France por si acaso
    const afData = parseAirFrance(rawText);
    if (afData) return { type: 'flight', data: normalizeDates(afData), confidence: afData.confidence, rawText, file };
  }

  // Fallback final
  return { type: 'document', data: {}, confidence: 0.1, rawText, file } as any;
}
