import { BaseParser } from './BaseParser';
import { NormalizedTravelEntity } from '../types';

export interface NormalizedTransfer {
  provider: string; // SunTransfers, Blacklane, Welcome Pickups, etc.
  pickup_type: 'airport' | 'hotel' | 'station' | 'address' | 'other';
  pickup_datetime: string; // ISO datetime YYYY-MM-DDTHH:mm:00
  pickup_address: string; // Exact address or airport name
  pickup_airport_code?: string; // IATA code if pickup is at an airport (e.g. CDG, MAD)
  destination_type: 'airport' | 'hotel' | 'station' | 'address' | 'venue' | 'other';
  destination_address: string; // Exact address or destination name
  destination_name?: string; // Short name (hotel name, venue name, etc.)
  flight_linkage?: {
    airline?: string;
    flight_number?: string;
    arrival_time?: string;
    origin_airport?: string;
  };
  vehicle_type: string; // e.g. "Premium Sedan", "Minivan Private"
  passengers: number;
  luggage: number; // luggage capacity or count
  meeting_point: string; // e.g. "Terminal 2E: Driver holds a sign at Arrivals"
  support_phone: string; // Phone number or emergency number
  support_whatsapp?: string; // WhatsApp link/number if available
  booking_reference: string;
  parsed_confidence: number;
}

export class SunTransfersParser implements BaseParser {
  async parse(rawText: string, fileBuffer?: Buffer, mimeType?: string): Promise<NormalizedTravelEntity | null> {
    console.log('[SunTransfersParser] Starting transfer parsing...');

    const t = rawText.toUpperCase();
    const isTransfer = t.includes('SUNTRANSFERS') || t.includes('SUN TRANSFERS') || t.includes('BLACKLANE') || 
                       t.includes('WELCOME PICKUPS') || t.includes('WELCOMEPICKUPS') || t.includes('TRASLADO') || 
                       t.includes('TRANSFER VOUCHER') || t.includes('PICKUP SERVICE') || t.includes('SHUTTLE') || 
                       t.includes('CHÓFER') || t.includes('PRIVATE TRANSFER') || t.includes('TAXILEADER') || 
                       t.includes('GETTRANSFER') || (fileBuffer && (mimeType?.includes('transfer') || mimeType?.includes('traslado')));

    if (!isTransfer) {
      console.log('[SunTransfersParser] Document is not a Transfer. Skipping.');
      return null;
    }

    let transferData: NormalizedTransfer | null = null;

    // 1. If text is sparse and fileBuffer exists, trigger Vision fallback
    if ((!rawText || rawText.trim().length < 10) && fileBuffer) {
      console.log('[SunTransfersParser] Text is sparse. Escalating to Vision Fallback...');
      transferData = await this.parseWithVision(fileBuffer, mimeType);
    } else {
      // 2. Perform text AI extraction
      transferData = await this.parseWithAI(rawText);
    }

    if (!transferData) {
      console.warn('[SunTransfersParser] Transfer extraction returned null.');
      return null;
    }

    // Debug: log all extracted fields
    console.log('[SunTransfersParser] ✅ Extraction result:', JSON.stringify({
      provider: transferData.provider,
      booking_reference: transferData.booking_reference,
      pickup_airport_code: transferData.pickup_airport_code,
      pickup_address: transferData.pickup_address,
      pickup_datetime: transferData.pickup_datetime,
      destination_name: transferData.destination_name,
      destination_address: transferData.destination_address,
      vehicle_type: transferData.vehicle_type,
      passengers: transferData.passengers,
      luggage: transferData.luggage,
      meeting_point: transferData.meeting_point ? transferData.meeting_point.substring(0, 80) + '...' : null,
      support_phone: transferData.support_phone,
      support_whatsapp: transferData.support_whatsapp,
      parsed_confidence: transferData.parsed_confidence
    }, null, 2));

    // 3. Map to NormalizedTravelEntity
    return {
      type: 'transfer_voucher',
      provider: transferData.provider || 'Private Transfer',
      confidence: transferData.parsed_confidence || 95,
      booking_reference: transferData.booking_reference,
      passenger_name: undefined,
      transfer: {
        provider: transferData.provider,
        pickup_type: transferData.pickup_type,
        pickup_datetime: transferData.pickup_datetime,
        pickup_address: transferData.pickup_address,
        pickup_airport_code: transferData.pickup_airport_code,
        destination_type: transferData.destination_type,
        destination_address: transferData.destination_address,
        destination_name: transferData.destination_name,
        passengers: Number(transferData.passengers) || 1,
        luggage: Number(transferData.luggage) || 0,
        vehicle_type: transferData.vehicle_type,
        meeting_point: transferData.meeting_point,
        support_phone: transferData.support_phone,
        support_whatsapp: transferData.support_whatsapp,
        flight_linkage: transferData.flight_linkage
      },
      raw_payload: transferData
    };
  }

  private async parseWithAI(rawText: string): Promise<NormalizedTransfer | null> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn('[SunTransfersParser] No OpenAI API Key found.');
        return null;
      }

      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prompt = `
Eres un extractor de datos de traslado/transfer de élite para la plataforma premium JP Intelligence.
Analiza el siguiente texto de un voucher de confirmación de traslado (ej. SunTransfers, Blacklane, Welcome Pickups, etc.)
y responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin bloques de código) que contenga la estructura descrita a continuación.

Si algún campo no está presente, pon null.

Estructura JSON:
{
  "provider": "Nombre del proveedor (ej. SunTransfers, Blacklane, Welcome Pickups, Cabify, etc.)",
  "pickup_type": "Uno de: airport, hotel, station, address, other",
  "pickup_datetime": "Fecha y hora de recogida en formato ISO YYYY-MM-DDTHH:mm:00 (si no hay año, asume 2026)",
  "pickup_address": "Dirección completa, nombre del hotel o aeropuerto/estación de recogida",
  "pickup_airport_code": "Código IATA del aeropuerto de recogida si la recogida es en un aeropuerto (ej. CDG, MAD, LHR). null si no aplica.",
  "destination_type": "Uno de: airport, hotel, station, address, venue, other",
  "destination_address": "Dirección completa del destino de entrega",
  "destination_name": "Nombre corto del destino (ej. nombre del hotel, sede del evento, etc.)",
  "flight_linkage": {
    "airline": "Línea aérea asociada si es una recogida en aeropuerto (e.g. Air France)",
    "flight_number": "Número de vuelo asociado (e.g. AF1920)",
    "arrival_time": "Hora de llegada del vuelo asociada",
    "origin_airport": "Aeropuerto de origen del vuelo"
  },
  "vehicle_type": "Tipo de vehículo, modelo o gama contratada (ej. Private Minivan, Premium Sedan)",
  "passengers": 2,
  "luggage": 4,
  "meeting_point": "Instrucciones de encuentro específicas del chofer/punto de reunión (ej. Terminal 2E: Chofer sostiene cartel en llegadas)",
  "support_phone": "Teléfono de soporte o número de emergencia del proveedor",
  "support_whatsapp": "Número de WhatsApp de soporte si está disponible",
  "booking_reference": "Código de reserva o localizador exacto del traslado",
  "parsed_confidence": 95
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
        return JSON.parse(resultText) as NormalizedTransfer;
      }
    } catch (e) {
      console.error('[SunTransfersParser] AI text extraction failed:', e);
    }
    return null;
  }

  private async parseWithVision(fileBuffer: Buffer, mimeType?: string): Promise<NormalizedTransfer | null> {
    try {
      if (!process.env.OPENAI_API_KEY) return null;

      let base64Image = '';
      if (mimeType && mimeType.startsWith('image/')) {
        base64Image = fileBuffer.toString('base64');
      } else {
        const { renderPdfToImage } = await import('@/lib/server/pdf/renderPdfToImage');
        const imageBuffer = await renderPdfToImage(fileBuffer, 1);
        base64Image = imageBuffer.toString('base64');
      }

      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prompt = `
Eres un extractor de datos de traslado/transfer de élite para la plataforma premium JP Intelligence.
Analiza la imagen del voucher de confirmación de traslado y responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin bloques de código) con esta estructura:

{
  "provider": "Nombre del proveedor (ej. SunTransfers, Blacklane, Welcome Pickups, Cabify, etc.)",
  "pickup_type": "Uno de: airport, hotel, station, address, other",
  "pickup_datetime": "Fecha y hora de recogida en formato ISO YYYY-MM-DDTHH:mm:00 (si no hay año, asume 2026)",
  "pickup_address": "Dirección completa, nombre del hotel o aeropuerto/estación de recogida",
  "pickup_airport_code": "Código IATA del aeropuerto de recogida si la recogida es en un aeropuerto (ej. CDG, MAD, LHR). null si no aplica.",
  "destination_type": "Uno de: airport, hotel, station, address, venue, other",
  "destination_address": "Dirección completa del destino de entrega",
  "destination_name": "Nombre corto del destino (ej. nombre del hotel, sede del evento, etc.)",
  "flight_linkage": {
    "airline": "Línea aérea asociada si es una recogida en aeropuerto (e.g. Air France)",
    "flight_number": "Número de vuelo asociado (e.g. AF1920)",
    "arrival_time": "Hora de llegada del vuelo asociada",
    "origin_airport": "Aeropuerto de origen del vuelo"
  },
  "vehicle_type": "Tipo de vehículo, modelo o gama contratada (ej. Private Minivan, Premium Sedan)",
  "passengers": 2,
  "luggage": 4,
  "meeting_point": "Instrucciones de encuentro específicas del chofer/punto de reunión (ej. Terminal 2E: Chofer sostiene cartel en llegadas)",
  "support_phone": "Teléfono de soporte o emergency del proveedor",
  "support_whatsapp": "Número de WhatsApp de soporte si está disponible",
  "booking_reference": "Código de reserva o localizador exacto del traslado",
  "parsed_confidence": 95
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
        return JSON.parse(resultText) as NormalizedTransfer;
      }
    } catch (e) {
      console.error('[SunTransfersParser] Vision extraction failed:', e);
    }
    return null;
  }
}
