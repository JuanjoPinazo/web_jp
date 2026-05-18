'use server';

import { extractTextWithPdftotext } from '@/lib/server/pdf/extractTextWithPdftotext';
import { decodeBarcodeFromPdf } from '@/lib/server/pdf/decodeBarcodeFromPdf';
import { 
  parseVuelingBoardingPass, 
  parseVuelingFlightConfirmation,
  parseAirFrance,
  parseHotelBooking,
  parseIataBCBP 
} from '@/lib/parsers';
import { DocumentClassifierService } from '@/modules/document-intelligence/DocumentClassifierService';
import { TransferParserService } from '@/modules/document-intelligence/TransferParserService';
import { DocumentIntelligenceEngine } from '@/modules/document-intelligence/engine/DocumentIntelligenceEngine';

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
  AIR_FRANCE: { name: 'AIRFRANCE', keywords: ['air france', 'airfrance', 'hop!', 'af841', 'af94'] },
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
  const dateFields = ['departure_time', 'arrival_time', 'check_in', 'check_out', 'pickup_datetime'];
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

function detectTypeFromText(text: string): 'flight' | 'hotel' | 'transfer' | 'boarding_pass' | 'document' {
  const t = text.toUpperCase();
  if (t.includes('BOARDING PASS') || t.includes('TARJETA DE EMBARQUE') || t.includes('ACCÈS À BORD')) return 'boarding_pass';
  if (t.includes('TRASLADO') || t.includes('TRANSFER') || t.includes('SHUTTLE') || t.includes('VOUCHER DE RESERVA') || t.includes('SUNTRANSFERS') || t.includes('PICKUP') || t.includes('CHÓFER') || t.includes('VEHÍCULO')) return 'transfer';
  if (t.includes('HOTEL') || t.includes('ALOJAMIENTO') || t.includes('BOOKING.COM') || t.includes('ESTANCIA') || t.includes('CHECK-IN')) return 'hotel';
  return 'document';
}

async function parseTransferWithAI(rawText: string) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[AI Fallback] No OpenAI API Key found for transfer.');
      return null;
    }
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('[AI Fallback] Invoking OpenAI to extract transfer details...');
    const prompt = `
Eres un extractor de datos de traslado/transfer experto de la plataforma JP Intelligence. 
Tu tarea es extraer los datos clave del siguiente texto extraído de un PDF de confirmación de traslado o voucher de transporte.

Analiza el texto y responde ÚNICAMENTE con un objeto JSON (sin markdown, sin bloques de código) con la siguiente estructura. Si un campo no está presente o no puedes extraerlo, pon null:

{
  "type": "tipo de traslado: airport_pickup, airport_dropoff, hotel_transfer, o event_transfer",
  "pickup_location": "Lugar de recogida/origen exacto (e.g. Paris Charles de Gaulle airport)",
  "dropoff_location": "Lugar de destino/entrega exacto (e.g. Hôtel Napoléon Paris)",
  "pickup_datetime": "Fecha y hora de recogida en formato ISO YYYY-MM-DDTHH:mm:00 (si no hay año, asume 2026)",
  "passenger_name": "Nombre completo del pasajero principal",
  "booking_reference": "Referencia de la reserva o localizador (e.g. SUNTR_WC1710)",
  "vehicle_type": "Tipo de vehículo o info del coche (e.g. Traslado privado - 4 maletas)",
  "driver_name": "Nombre del chófer si aparece",
  "driver_phone": "Teléfono del chófer si aparece",
  "company_name": "Empresa de transporte (e.g. Suntransfers)",
  "notes": "Notas adicionales o detalles de pasajeros y equipaje"
}

Texto a analizar:
---
${rawText}
---
`;
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });
    const resultText = response.choices[0]?.message?.content;
    if (resultText) {
      console.log('[AI Fallback] OpenAI Transfer Response:', resultText);
      return JSON.parse(resultText);
    }
  } catch (e: any) {
    console.error('[AI Fallback] Failed to parse transfer with AI:', e);
  }
  return null;
}

async function parseTransferWithVision(pdfBuffer: Buffer) {
  try {
    if (!process.env.OPENAI_API_KEY) return null;
    const { renderPdfToImage } = await import('@/lib/server/pdf/renderPdfToImage');
    console.log('[Vision Fallback] Rendering Transfer PDF first page...');
    const imageBuffer = await renderPdfToImage(pdfBuffer, 1);
    const base64Image = imageBuffer.toString('base64');
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('[Vision Fallback] Invoking OpenAI Vision for transfer...');
    const prompt = `
Eres un extractor de datos de traslado/transfer experto de la plataforma JP Intelligence. 
Analiza la imagen de la confirmación de traslado o voucher y responde ÚNICAMENTE con un objeto JSON (sin markdown, sin bloques de código) con esta estructura:

{
  "type": "tipo de traslado: airport_pickup, airport_dropoff, hotel_transfer, o event_transfer",
  "pickup_location": "Lugar de recogida/origen exacto (e.g. Paris Charles de Gaulle airport)",
  "dropoff_location": "Lugar de destino/entrega exacto (e.g. Hôtel Napoléon Paris)",
  "pickup_datetime": "Fecha y hora de recogida en formato ISO YYYY-MM-DDTHH:mm:00 (si no hay año, asume 2026)",
  "passenger_name": "Nombre completo del pasajero principal",
  "booking_reference": "Referencia de la reserva o localizador (e.g. SUNTR_WC1710)",
  "vehicle_type": "Tipo de vehículo o info del coche (e.g. Traslado privado - 4 maletas)",
  "driver_name": "Nombre del chófer si aparece",
  "driver_phone": "Teléfono del chófer si aparece",
  "company_name": "Empresa de transporte (e.g. Suntransfers)",
  "notes": "Notas adicionales o detalles de pasajeros y equipaje"
}
`;
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } }
          ]
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });
    const resultText = response.choices[0]?.message?.content;
    if (resultText) {
      console.log('[Vision Fallback] OpenAI Vision Transfer Response:', resultText);
      return JSON.parse(resultText);
    }
  } catch (e) {
    console.error('[Vision Fallback] Failed to parse transfer with Vision:', e);
  }
  return null;
}

async function parseHotelWithAI(rawText: string) {
  try {
    if (!process.env.OPENAI_API_KEY) return null;
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('[AI Fallback] Invoking OpenAI to extract hotel details...');
    const prompt = `
Eres un extractor de datos de hotel experto de la plataforma JP Intelligence. 
Extrae los datos clave del siguiente texto de confirmación de hotel. Responderás ÚNICAMENTE con un JSON con esta estructura:

{
  "hotel_name": "Nombre del hotel",
  "confirmation_number": "Número de confirmación/reserva",
  "check_in": "Fecha de check-in en formato ISO YYYY-MM-DDTHH:mm:00 (si no hay año, asume 2026)",
  "check_out": "Fecha de check-out en formato ISO YYYY-MM-DDTHH:mm:00 (si no hay año, asume 2026)",
  "address": "Dirección completa del hotel",
  "room_type": "Tipo de habitación (e.g. Doble Estándar)"
}

Texto:
${rawText}
`;
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });
    const resultText = response.choices[0]?.message?.content;
    if (resultText) {
      console.log('[AI Fallback] OpenAI Hotel Response:', resultText);
      return JSON.parse(resultText);
    }
  } catch (e) {
    console.error('Failed to parse hotel with AI:', e);
  }
  return null;
}

async function parseFlightWithAI(rawText: string, provider: string) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[AI Fallback] No OpenAI API Key found, skipping AI parser.');
      return null;
    }

    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log('[AI Fallback] Invoking OpenAI to extract flight details...');

    const prompt = `
Eres un extractor de datos de viaje experto de la plataforma JP Intelligence. 
Tu tarea es extraer los datos clave del siguiente texto extraído de un PDF de tarjeta de embarque o confirmación de vuelo de ${provider === 'air_france' ? 'Air France / HOP' : provider}.

Analiza el texto y responde ÚNICAMENTE con un objeto JSON (sin markdown, sin bloques de código) con la siguiente estructura. Si un campo no está presente o no puedes extraerlo, pon null:

{
  "airline": "Nombre de la aerolínea",
  "booking_reference": "Código de reserva/Localizador de 6 caracteres",
  "passenger_name": "Nombre completo del pasajero",
  "flight_number": "Número de vuelo (e.g. AF1417)",
  "departure_location": "Código IATA del aeropuerto de salida (3 letras, e.g. MAD)",
  "arrival_location": "Código IATA del aeropuerto de llegada (3 letras, e.g. CDG)",
  "departure_time": "Fecha y hora de salida en formato ISO YYYY-MM-DDTHH:mm:00 (si no hay año, asume 2026)",
  "arrival_time": "Fecha y hora de llegada en formato ISO YYYY-MM-DDTHH:mm:00 (si no hay año, asume 2026)",
  "checkin_deadline": "Hora límite de check-in en formato HH:mm",
  "seat": "Asiento (e.g. 14A)",
  "cabin_class": "Clase (Economy, Business, etc.)",
  "baggage_info": "Información de equipaje si se indica",
  "status": "Confirmado o OK"
}

Texto a analizar:
---
${rawText}
---
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const resultText = response.choices[0]?.message?.content;
    if (resultText) {
      console.log('[AI Fallback] OpenAI Response:', resultText);
      const parsedData = JSON.parse(resultText);
      return parsedData;
    }
  } catch (e: any) {
    console.error('[AI Fallback] Failed to parse with AI:', e);
  }
  return null;
}

async function parseFlightWithVision(pdfBuffer: Buffer, provider: string) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[Vision Fallback] No OpenAI API Key found.');
      return null;
    }

    const { renderPdfToImage } = await import('@/lib/server/pdf/renderPdfToImage');
    console.log('[Vision Fallback] Rendering PDF first page to PNG...');
    const imageBuffer = await renderPdfToImage(pdfBuffer, 1);
    const base64Image = imageBuffer.toString('base64');

    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log('[Vision Fallback] Invoking OpenAI Vision API...');

    const prompt = `
Eres un extractor de datos de viaje experto de la plataforma JP Intelligence. 
Se te proporciona una imagen de la tarjeta de embarque o confirmación de vuelo de ${provider === 'auto' ? 'una aerolínea' : provider} (e.g. Air France, Vueling, etc.).

Analiza la imagen detenidamente y extrae los datos clave. Responde ÚNICAMENTE con un objeto JSON (sin bloques de código, sin markdown) con la siguiente estructura. Si un campo no está presente, pon null:

{
  "airline": "Nombre de la aerolínea (e.g. Air France, Vueling, Iberia)",
  "booking_reference": "Código de reserva/Localizador de 6 caracteres",
  "passenger_name": "Nombre completo del pasajero",
  "flight_number": "Número de vuelo (e.g. AF1417 o VY816)",
  "departure_location": "Código IATA del aeropuerto de salida (3 letras, e.g. MAD)",
  "arrival_location": "Código IATA del aeropuerto de llegada (3 letras, e.g. CDG)",
  "departure_time": "Fecha y hora de salida en formato ISO YYYY-MM-DDTHH:mm:00 (si no hay año, asume 2026)",
  "arrival_time": "Fecha y hora de llegada en formato ISO YYYY-MM-DDTHH:mm:00 (si no hay año, asume 2026)",
  "checkin_deadline": "Hora límite de check-in en formato HH:mm",
  "seat": "Asiento (e.g. 14A)",
  "cabin_class": "Clase (Economy, Business, etc.)",
  "baggage_info": "Información de equipaje si se indica",
  "status": "Confirmado o OK"
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const resultText = response.choices[0]?.message?.content;
    if (resultText) {
      console.log('[Vision Fallback] OpenAI Vision Response:', resultText);
      const parsedData = JSON.parse(resultText);
      return parsedData;
    }
  } catch (e: any) {
    console.error('[Vision Fallback] Failed to parse with Vision:', e);
  }
  return null;
}

export async function extractTravelInfo(formData: FormData): Promise<ExtractedData> {
  const file = formData.get('file') as File;
  const forcedType = (formData.get('type') as string) || 'auto';
  const forcedProvider = (formData.get('provider') as string) || 'auto';
  
  if (!file) throw new Error('No se ha subido ningún archivo.');

  console.log(`\n--- [DocumentIntelligenceEngine Integration] ---`);
  console.log(`FILE: ${file.name}, TYPE: ${forcedType}, PROVIDER: ${forcedProvider}`);

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await DocumentIntelligenceEngine.processDocument(buffer, file.name, file.type, {
      forcedType: forcedType === 'auto' ? undefined : forcedType,
      forcedProvider: forcedProvider === 'auto' ? undefined : forcedProvider
    });

    const { entity, rawText, classification } = result;

    console.log(`[extractTravelInfo] rawText length: ${rawText?.length || 0} chars`);
    console.log(`[extractTravelInfo] detected type: ${classification.type} | provider: ${classification.provider} | confidence: ${classification.confidence}%`);
    console.log(`[extractTravelInfo] parser used: ${entity?.type || 'none'}`);

    if (!entity) {
      console.warn('[DocumentIntelligenceEngine] Parsing returned null entity.');
      return {
        type: 'document',
        data: {},
        confidence: 0,
        rawText: rawText || '',
        error: 'No se pudo estructurar la información del documento.',
        file
      };
    }

    // Map NormalizedTravelEntity to ExtractedData structure expected by frontend
    let mappedType: 'hotel' | 'flight' | 'transfer' | 'document' | 'boarding_pass' = 'document';
    if (entity.type === 'boarding_pass') mappedType = 'boarding_pass';
    else if (entity.type === 'flight_confirmation') mappedType = 'flight';
    else if (entity.type === 'hotel_reservation') mappedType = 'hotel';
    else if (entity.type === 'transfer_voucher') mappedType = 'transfer';

    let mappedData: any = {};
    if (entity.flight) {
      mappedData = {
        ...entity.flight,
        booking_reference: entity.booking_reference,
        passenger_name: entity.passenger_name
      };
    } else if (entity.hotel) {
      mappedData = {
        ...entity.hotel,
        booking_reference: entity.booking_reference
      };
    } else if (entity.transfer) {
      mappedData = {
        ...entity.transfer,
        // UI legacy field mapping
        pickup_location: entity.transfer.pickup_address,
        dropoff_location: entity.transfer.destination_address,
        pickup_airport_code: entity.transfer.pickup_airport_code,
        destination_name: entity.transfer.destination_name,
        company_name: entity.transfer.provider,
        provider: entity.transfer.provider,
        booking_reference: entity.booking_reference,
        passenger_name: entity.passenger_name
      };
    } else if (entity.restaurant) {
      mappedData = {
        ...entity.restaurant,
        booking_reference: entity.booking_reference
      };
    } else if (entity.event) {
      mappedData = {
        ...entity.event,
        booking_reference: entity.booking_reference
      };
    }

    const confidenceValue = (entity.confidence || classification.confidence) / 100;

    return {
      type: mappedType,
      data: normalizeDates(mappedData),
      confidence: confidenceValue,
      rawText: rawText || '',
      qr_detected: entity.flight?.qr_detected,
      qr_decoded: entity.flight?.qr_decoded,
      qr_raw_payload: entity.flight?.qr_raw_payload,
      file
    };
  } catch (err: any) {
    console.error('Error in extractTravelInfo integration:', err);
    return {
      type: 'document',
      data: {},
      confidence: 0,
      rawText: '',
      error: err.message || 'Error durante la extracción del documento.',
      file
    };
  }
}

export async function reScanDocumentAction(fileUrl: string) {
  try {
    console.log(`[Re-scan] Fetching PDF from: ${fileUrl}`);
    let buffer: Buffer;

    // Si es una URL de Supabase Storage, descargamos directamente a través de su SDK
    // Esto evita problemas de red local/loopback/DNS en localhost
    if (fileUrl.includes('/storage/v1/object/public/travel-documents/')) {
      console.log(`[Re-scan] Detectada URL de Supabase Storage. Descargando vía SDK...`);
      const relativePath = fileUrl.split('/storage/v1/object/public/travel-documents/')[1];
      const decodedPath = decodeURIComponent(relativePath);
      
      const { getSupabaseAdmin } = await import('@/lib/supabase-admin');
      const supabaseAdmin = getSupabaseAdmin();
      
      const { data, error } = await supabaseAdmin.storage
        .from('travel-documents')
        .download(decodedPath);
        
      if (error || !data) {
        console.warn('[Re-scan] Falló descarga directa vía SDK. Probando fallback HTTP Fetch...', error);
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`Error al descargar el archivo via fallback: ${res.statusText}`);
        buffer = Buffer.from(await res.arrayBuffer());
      } else {
        buffer = Buffer.from(await data.arrayBuffer());
      }
    } else {
      console.log(`[Re-scan] Descargando URL genérica vía HTTP Fetch: ${fileUrl}`);
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error(`Error al descargar el archivo: ${res.statusText}`);
      buffer = Buffer.from(await res.arrayBuffer());
    }
    
    // Decode barcode using our ultra-robust progressive-rotation decoder
    const { decodeBarcodeFromPdf } = await import('@/lib/server/pdf/decodeBarcodeFromPdf');
    const barcodeResult = await decodeBarcodeFromPdf(buffer);
    
    if (barcodeResult.success && barcodeResult.payload) {
      console.log(`[Re-scan] Barcode decoded: ${barcodeResult.format}`);
      const { parseIataBCBP } = await import('@/lib/parsers/iata-bcbp');
      const qrData = parseIataBCBP(barcodeResult.payload);
      
      return {
        success: true,
        payload: barcodeResult.payload,
        format: barcodeResult.format,
        qrData: qrData || undefined
      };
    } else {
      return {
        success: false,
        error: 'No se detectó ningún código de barras (PDF417, QR o Aztec) en el documento.'
      };
    }
  } catch (e: any) {
    console.error('[Re-scan] Error during re-scan:', e);
    return {
      success: false,
      error: e.message || 'Error inesperado durante el escaneo.'
    };
  }
}
