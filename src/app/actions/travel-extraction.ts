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

  console.log(`\n--- [DEBUG PDF UPLOAD] ---`);
  console.log(`FILE: ${file.name}, TYPE: ${forcedType}, PROVIDER: ${forcedProvider}`);

  const buffer = Buffer.from(await file.arrayBuffer());
  const isImage = file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|webp)$/i);
  
  let rawText = '';
  
  if (!isImage) {
    rawText = await extractTextWithPdftotext(buffer);
    if (rawText.startsWith('__ERROR__')) {
      const errorMsg = rawText.replace('__ERROR__: ', '');
      return { type: 'document', data: {}, confidence: 0, rawText: '', error: errorMsg } as any;
    }
  }
  
  if (isImage || !rawText || rawText.trim().length < 10) {
    console.log('[DEBUG] PDF/Imagen no contiene texto digital. Activando motor de Visión por IA...');
    
    // 1. Try Transfer Vision first if filename or forcedType matches
    if (forcedType === 'transfer' || forcedType === 'transfer_voucher' || file.name.toLowerCase().includes('transfer') || file.name.toLowerCase().includes('traslado')) {
      const visionTransferData = await TransferParserService.parseTransfer('', buffer, file.type);
      if (visionTransferData && visionTransferData.pickup_address) {
        return {
          type: 'transfer',
          data: normalizeDates(visionTransferData),
          confidence: visionTransferData.parsed_confidence || 95,
          rawText: `[Extracción por Visión Artificial (OCR)] - Traslado: ${visionTransferData.booking_reference}`,
          file
        };
      }
    }

    // 2. Try flight vision next
    const visionData = await parseFlightWithVision(buffer, forcedProvider);
    if (visionData && visionData.flight_number) {
      const isBoardingPass = !!visionData.seat || forcedType === 'boarding_pass';
      return {
        type: isBoardingPass ? 'boarding_pass' : 'flight',
        data: normalizeDates(visionData),
        confidence: 95,
        rawText: `[Extracción por Visión Artificial (OCR)] - Aerolínea: ${visionData.airline}`,
        file
      };
    }
    
    return { type: 'document', data: {}, confidence: 0, rawText: '', error: 'No se pudo extraer texto del PDF.' } as any;
  }

  // 1. Classify document using our modular DocumentClassifierService
  const classification = DocumentClassifierService.classifyText(rawText);
  console.log(`[Document Classifier] Classified as: ${classification.type} (Provider: ${classification.provider}, Confidence: ${classification.confidence})`);

  let providerKey = forcedProvider;
  if (providerKey === 'auto') {
    providerKey = detectProvider(rawText);
  }

  console.log(`[DEBUG] Proveedor a usar: ${providerKey}`);
  
  // --- FLUJO DE EXTRACCIÓN DIRIGIDO ---

  // 1. AIR FRANCE / HOP
  if (providerKey === 'air_france') {
    let afData = parseAirFrance(rawText);
    
    // Always attempt to decode the barcode for Air France boarding passes to ensure maximum accuracy (especially for airport IATAs and sequence numbers)
    const isBoardingPass = rawText.toUpperCase().includes('BOARDING PASS') || 
                          rawText.toUpperCase().includes('ACC\u00C8S \u00C0 BORD') || 
                          rawText.toUpperCase().includes('TARJETA DE EMBARQUE') || 
                          (afData && !!afData.seat) || 
                          forcedType === 'boarding_pass';

    let barcodeDecoded = false;
    let qrDetected = false;
    let qrPayload = undefined;

    if (isBoardingPass) {
      console.log('[DEBUG] Air France detected as Boarding Pass. Attempting to decode barcode...');
      const barcodeResult = await decodeBarcodeFromPdf(buffer);
      if (barcodeResult.success && barcodeResult.payload) {
        qrDetected = true;
        barcodeDecoded = true;
        qrPayload = barcodeResult.payload;
        const qrData = parseIataBCBP(barcodeResult.payload);
        if (qrData) {
          console.log('[DEBUG] Enriched Air France with BCBP Barcode data:', qrData);
          afData = {
            ...afData,
            airline: 'AIRFRANCE',
            confidence: 100,
            qr_detected: true,
            qr_decoded: true,
            passenger_name: qrData.passenger_name || afData?.passenger_name,
            booking_reference: qrData.booking_reference || afData?.booking_reference,
            departure_location: qrData.departure_location || afData?.departure_location,
            arrival_location: qrData.arrival_location || afData?.arrival_location,
            seat: qrData.seat || afData?.seat,
          };
          if (qrData.flight_number_raw) {
            const num = qrData.flight_number_raw.replace(/^0+/, '');
            afData.flight_number = `AF${num}`;
          }
        }
      }
    }

    // Check if we need AI fallback (if parsing failed or is incomplete)
    const isMissingCriticalInfo = !afData || !afData.flight_number || !afData.booking_reference || !afData.departure_location || !afData.arrival_location;
    if (isMissingCriticalInfo) {
      console.log('[DEBUG] Deterministic Air France parser incomplete or failed. Triggering AI Fallback...');
      const aiData = await parseFlightWithAI(rawText, 'air_france');
      if (aiData) {
        afData = {
          ...afData,
          ...aiData,
          airline: 'AIRFRANCE',
          confidence: 98
        };
      }
    }

    if (afData) {
      // Ensure airline is exactly 'AIRFRANCE'
      afData.airline = 'AIRFRANCE';
      
      return { 
        type: isBoardingPass ? 'boarding_pass' : 'flight', 
        data: normalizeDates(afData), 
        confidence: barcodeDecoded ? 100 : afData.confidence, 
        rawText, 
        qr_detected: qrDetected || afData.qr_detected,
        qr_decoded: barcodeDecoded || afData.qr_decoded,
        qr_raw_payload: qrPayload,
        file 
      };
    }
  }

  // 2. VUELING
  if (providerKey === 'vueling' || providerKey === 'auto') {
    // Si es BP o auto, intentar BP primero
    if (forcedType === 'auto' || forcedType === 'boarding_pass') {
      const vuelingBP = parseVuelingBoardingPass(rawText);
        if (vuelingBP) {
          const barcodeResult = await decodeBarcodeFromPdf(buffer);
          
          // ENRIQUECER CON DATOS DEL QR (Máxima fiabilidad)
          if (barcodeResult.success && barcodeResult.payload) {
            const qrData = parseIataBCBP(barcodeResult.payload);
            if (qrData) {
              console.log('[DEBUG] Enriqueciendo con datos del QR:', qrData.departure_location, '->', qrData.arrival_location);
              vuelingBP.departure_location = qrData.departure_location || vuelingBP.departure_location;
              vuelingBP.arrival_location = qrData.arrival_location || vuelingBP.arrival_location;
              vuelingBP.seat = qrData.seat || vuelingBP.seat;
              vuelingBP.booking_reference = qrData.booking_reference || vuelingBP.booking_reference;
              if (qrData.flight_number_raw) {
                // El flight number en QR suele venir como "08162" o similar
                const num = qrData.flight_number_raw.replace(/^0+/, '');
                vuelingBP.flight_number = `VY${num}`;
              }
            }
          }

          return { 
            type: 'boarding_pass', 
            data: normalizeDates(vuelingBP), 
            confidence: barcodeResult.success ? 1 : vuelingBP.confidence, 
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
  if (providerKey === 'booking' || providerKey === 'hoteles_com' || providerKey === 'auto' || forcedType === 'hotel_booking' || forcedType === 'hotel') {
    const hotelData = parseHotelBooking(rawText);
    
    // Trigger AI fallback for hotel if deterministic extraction is incomplete
    const isMissingHotelInfo = !hotelData || !hotelData.hotel_name || !hotelData.check_in;
    if (isMissingHotelInfo) {
      console.log('[DEBUG] Deterministic Hotel parser incomplete. Triggering AI Fallback...');
      const aiHotelData = await parseHotelWithAI(rawText);
      if (aiHotelData) {
        return {
          type: 'hotel',
          data: normalizeDates(aiHotelData),
          confidence: 95,
          rawText,
          file
        };
      }
    }
    
    if (hotelData) {
      return { type: 'hotel', data: normalizeDates(hotelData), confidence: hotelData.confidence, rawText, file };
    }
  }

  // 4. TRANSFER / TRASLADO (Suntransfers / Generic) — Modular TransferParserService
  const isTransfer = forcedType === 'transfer' || forcedType === 'transfer_voucher' || 
                     classification.type === 'transfer_voucher' || detectTypeFromText(rawText) === 'transfer';
  if (isTransfer) {
    console.log(`[DEBUG] Transfer type detected (classification: ${classification.type}, provider: ${classification.provider}). Triggering TransferParserService...`);
    const transferData = await TransferParserService.parseTransfer(rawText, buffer);
    if (transferData) {
      // Map TransferParserService NormalizedTransfer → ExtractedData.data shape
      return {
        type: 'transfer' as const,
        data: normalizeDates({
          ...transferData,
          // Map normalized fields to the shape the admin UI expects
          pickup_location: transferData.pickup_address,
          dropoff_location: transferData.destination_address,
          company_name: transferData.provider,
          // Keep all extended fields
          pickup_type: transferData.pickup_type,
          destination_type: transferData.destination_type,
          meeting_point: transferData.meeting_point,
          support_phone: transferData.support_phone,
          support_whatsapp: transferData.support_whatsapp,
          passengers: transferData.passengers,
          luggage: transferData.luggage,
          flight_linkage: transferData.flight_linkage,
        }),
        confidence: transferData.parsed_confidence || 95,
        rawText,
        file
      };
    }
  }

  // 5. FALLBACK GENERAL (si todo lo anterior falló o es auto)
  if (providerKey === 'auto') {
    // Re-intentar Air France por si acaso
    const afData = parseAirFrance(rawText);
    if (afData) return { type: 'flight', data: normalizeDates(afData), confidence: afData.confidence, rawText, file };
  }

  // Fallback final
  return { type: 'document', data: {}, confidence: 0.1, rawText, file } as any;
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
