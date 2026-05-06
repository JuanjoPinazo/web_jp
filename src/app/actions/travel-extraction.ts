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
  const t = text.toLowerCase();
  for (const [key, p] of Object.entries(PROVIDERS)) {
    if (p.keywords.some(k => t.includes(k))) return key;
  }
  return 'GENERIC';
}

function cleanLogisticsNoise(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
    .replace(/(?:De|From|Para|To|CC|Asunto|Subject|Enviado el|Sent|Date|Fecha):\s*[^\n\r]+/gi, '')
    .replace(/(?:Visa|Mastercard|Amex|Pago|Total|EUR|Price|Precio|XXXXXXXXXXXX)\s*[^\n\r]+/gi, '')
    .replace(/(?:Aviso legal|Condiciones|T\u00e9rminos|Privacy|Pol\u00edtica|Derechos|No-reply)[^\n\r]+/gi, '')
    .trim();
}

export async function extractTravelInfo(formData: FormData): Promise<ExtractedData> {
  const file = formData.get('file') as File;
  const forcedType = formData.get('type') as string;
  
  if (!file) throw new Error('No se ha subido ningún archivo.');

  console.log(`\n--- [DEBUG PDF UPLOAD] ---`);
  console.log(`FILE: name=${file.name}, size=${file.size}, type=${file.type}`);

  const buffer = Buffer.from(await file.arrayBuffer());
  const rawText = await extractTextWithPdftotext(buffer);
  
  if (rawText.startsWith('__ERROR__')) {
    const errorMsg = rawText.replace('__ERROR__: ', '');
    return { type: 'document', data: {}, confidence: 0, rawText: '', error: errorMsg } as any;
  }

  console.log(`\n--- [DEBUG PDF EXTRACTION] ---`);
  console.log(`RAW LENGTH: ${rawText.length}`);
  // console.log(`RAW SAMPLE (1500 chars):\n${rawText.slice(0, 1500)}\n--- END SAMPLE ---`);
  
  if (!rawText || rawText.trim().length < 10) {
    console.error('[ERROR] El PDF no contiene texto extraíble.');
    return { type: 'document', data: {}, confidence: 0, rawText: '', error: 'No se pudo extraer texto del PDF. Puede ser escaneado/imagen.' } as any;
  }

  const providerKey = detectProvider(rawText);
  // const cleanText = cleanLogisticsNoise(rawText);

  console.log(`[DEBUG] Proveedor Detectado: ${providerKey}`);
  
  // 1. Intentar Parser de Tarjeta de Embarque Vueling
  const vuelingBP = parseVuelingBoardingPass(rawText);
  if (vuelingBP) {
    console.log(`[DEBUG] Parser Vueling BP Exitoso:`, vuelingBP);
    
    // INTENTO DE DECODIFICACIÓN DE QR/BARCODE VISUAL
    console.log(`[DEBUG] Intentando decodificación visual de código de barras...`);
    const barcodeResult = await decodeBarcodeFromPdf(buffer);
    
    const result: ExtractedData = { 
      type: 'boarding_pass', 
      data: vuelingBP, 
      confidence: vuelingBP.confidence, 
      rawText,
      qr_detected: barcodeResult.success || vuelingBP.qr_detected,
      qr_decoded: barcodeResult.success,
      qr_raw_payload: barcodeResult.payload || undefined,
      file // Para que el cliente tenga acceso al archivo si lo necesita para la previsualización
    };

    console.log('[DEBUG Vision Output]:', {
      qr_detected: result.qr_detected,
      qr_decoded: result.qr_decoded,
      qr_raw_payload_preview: result.qr_raw_payload?.substring(0, 30)
    });

    return result;
  }

  // 2. Intentar Parser de Air France / HOP
  const airFranceData = parseAirFrance(rawText);
  if (airFranceData) {
    return { type: 'flight', data: airFranceData, confidence: airFranceData.confidence, rawText };
  }

  // 3. Intentar Parser de Confirmación Vueling (Email/Itinerario)
  const vuelingConf = parseVuelingFlightConfirmation(rawText);
  if (vuelingConf) {
    return { type: 'flight', data: vuelingConf, confidence: vuelingConf.confidence, rawText };
  }

  // 4. Intentar Parser de Hotel
  const hotelData = parseHotelBooking(rawText);
  if (hotelData) {
    return { type: 'hotel', data: hotelData, confidence: hotelData.confidence, rawText };
  }

  // 5. Fallback a Detección Genérica si nada especializado funcionó
  console.log(`[DEBUG] Ningún parser especializado tuvo éxito. Usando detección genérica.`);
  
  let type: 'hotel' | 'flight' | 'transfer' | 'document' | 'boarding_pass' = 'document';
  if (forcedType && forcedType !== 'auto') {
    type = forcedType as any;
  } else {
    if (rawText.toLowerCase().includes('vuelo') || rawText.toLowerCase().includes('flight') || providerKey === 'IBERIA' || providerKey === 'VOLOTEA') {
      type = 'flight';
    } else if (rawText.toLowerCase().includes('hotel') || providerKey === 'BOOKING' || providerKey === 'HOTELS') {
      type = 'hotel';
    }
  }

  return { type, data: {}, confidence: 0.1, rawText };
}
