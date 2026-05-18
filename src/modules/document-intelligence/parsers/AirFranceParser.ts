import { BaseParser } from './BaseParser';
import { NormalizedTravelEntity } from '../types';
import { parseAirFrance } from '@/lib/parsers/airfrance';
import { parseIataBCBP } from '@/lib/parsers/iata-bcbp';
import { decodeBarcodeFromPdf } from '@/lib/server/pdf/decodeBarcodeFromPdf';

export class AirFranceParser implements BaseParser {
  async parse(rawText: string, fileBuffer?: Buffer, mimeType?: string): Promise<NormalizedTravelEntity | null> {
    console.log('[AirFranceParser] Starting parsing process...');
    
    // Check if it's an Air France document
    const t = rawText.toUpperCase();
    const isAF = t.includes('AIRFRANCE') || t.includes('AIR FRANCE') || t.includes('HOP!') || /\bAF\s*\d{1,5}\b/i.test(rawText) || t.includes('AIR_FRANCE');
    if (!isAF) {
      console.log('[AirFranceParser] Document is not Air France. Skipping.');
      return null;
    }

    // 1. Run deterministic parser
    let parsedData: any = parseAirFrance(rawText) || {
      airline: 'AIRFRANCE',
      confidence: 30,
      qr_detected: false,
      qr_decoded: false
    };

    let qrDetected = parsedData.qr_detected || false;
    let qrDecoded = parsedData.qr_decoded || false;
    let qrPayload = undefined;

    // Is it a boarding pass?
    const isBoardingPass = t.includes('BOARDING PASS') || 
                          t.includes('ACC\u00C8S \u00C0 BORD') || 
                          t.includes('TARJETA DE EMBARQUE') || 
                          !!parsedData.seat;

    // 2. Barcode decoding and enrichment
    if (isBoardingPass && fileBuffer) {
      console.log('[AirFranceParser] Boarding pass detected. Attempting to decode barcode...');
      try {
        const barcodeResult = await decodeBarcodeFromPdf(fileBuffer);
        if (barcodeResult.success && barcodeResult.payload) {
          qrDetected = true;
          qrDecoded = true;
          qrPayload = barcodeResult.payload;
          
          const qrData = parseIataBCBP(barcodeResult.payload);
          if (qrData) {
            console.log('[AirFranceParser] Enriched Air France with BCBP Barcode data:', qrData);
            parsedData = {
              ...parsedData,
              passenger_name: qrData.passenger_name || parsedData.passenger_name,
              booking_reference: qrData.booking_reference || parsedData.booking_reference,
              departure_location: qrData.departure_location || parsedData.departure_location,
              arrival_location: qrData.arrival_location || parsedData.arrival_location,
              seat: qrData.seat || parsedData.seat,
            };
            if (qrData.flight_number_raw) {
              const num = qrData.flight_number_raw.replace(/^0+/, '');
              parsedData.flight_number = `AF${num}`;
            }
          }
        }
      } catch (e: any) {
        console.error('[AirFranceParser] Barcode decoder failed:', e.message);
      }
    }

    // 3. AI Fallback for missing critical fields
    const isMissingCriticalInfo = !parsedData.flight_number || !parsedData.booking_reference || !parsedData.departure_location || !parsedData.arrival_location;
    if (isMissingCriticalInfo && process.env.OPENAI_API_KEY) {
      console.log('[AirFranceParser] Critical fields missing. Triggering OpenAI extraction...');
      try {
        const { default: OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const prompt = `
Eres un extractor de datos de viaje experto de la plataforma JP Intelligence. 
Tu tarea es extraer los datos clave del siguiente texto extraído de un PDF de tarjeta de embarque o confirmación de vuelo de Air France / HOP.

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
          const aiData = JSON.parse(resultText);
          console.log('[AirFranceParser] OpenAI extraction succeeded:', aiData);
          parsedData = {
            ...parsedData,
            booking_reference: aiData.booking_reference || parsedData.booking_reference,
            passenger_name: aiData.passenger_name || parsedData.passenger_name,
            flight_number: aiData.flight_number || parsedData.flight_number,
            departure_location: aiData.departure_location || parsedData.departure_location,
            arrival_location: aiData.arrival_location || parsedData.arrival_location,
            departure_time: aiData.departure_time || parsedData.departure_time,
            arrival_time: aiData.arrival_time || parsedData.arrival_time,
            checkin_deadline: aiData.checkin_deadline || parsedData.checkin_deadline,
            seat: aiData.seat || parsedData.seat,
            cabin_class: aiData.cabin_class || parsedData.cabin_class,
            baggage_info: aiData.baggage_info || parsedData.baggage_info,
            status: aiData.status || (parsedData as any).status,
            confidence: Math.max(parsedData.confidence || 0, 95)
          };
        }
      } catch (e: any) {
        console.error('[AirFranceParser] OpenAI extraction failed:', e.message);
      }
    }

    // 4. Map to NormalizedTravelEntity
    return {
      type: isBoardingPass ? 'boarding_pass' : 'flight_confirmation',
      provider: 'Air France',
      confidence: qrDecoded ? 100 : (parsedData.confidence || 75),
      booking_reference: parsedData.booking_reference,
      passenger_name: parsedData.passenger_name,
      flight: {
        airline: 'AIRFRANCE',
        flight_number: parsedData.flight_number || '',
        departure_location: parsedData.departure_location || '',
        arrival_location: parsedData.arrival_location || '',
        departure_time: parsedData.departure_time || '',
        arrival_time: parsedData.arrival_time || '',
        seat: parsedData.seat,
        cabin_class: parsedData.cabin_class,
        checkin_deadline: parsedData.checkin_deadline,
        baggage_info: parsedData.baggage_info,
        status: (parsedData as any).status || 'OK',
        qr_detected: qrDetected,
        qr_decoded: qrDecoded,
        qr_raw_payload: qrPayload
      },
      raw_payload: parsedData
    };
  }
}
