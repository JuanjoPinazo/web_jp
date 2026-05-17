export interface NormalizedTransfer {
  provider: string; // SunTransfers, Blacklane, Welcome Pickups, etc.
  pickup_type: 'airport' | 'hotel' | 'station' | 'address' | 'other';
  pickup_datetime: string; // ISO datetime YYYY-MM-DDTHH:mm:00
  pickup_address: string; // Exact address or airport name
  destination_type: 'airport' | 'hotel' | 'station' | 'address' | 'venue' | 'other';
  destination_address: string; // Exact address or destination name
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
  raw_payload?: any;
  parsed_confidence: number;
}

export class TransferParserService {
  /**
   * Main entry point to parse a transfer voucher.
   * Leverages text extraction and OpenAI models with dedicated vision fallbacks if text is missing.
   */
  static async parseTransfer(rawText: string, fileBuffer?: Buffer, mimeType?: string): Promise<NormalizedTransfer | null> {
    console.log('[TransferParserService] Starting transfer extraction...');

    // 1. If text is sparse and fileBuffer exists, trigger Vision fallback
    if ((!rawText || rawText.trim().length < 10) && fileBuffer) {
      console.log('[TransferParserService] Text is sparse or file is image. Escalating to Vision Fallback...');
      return this.parseWithVision(fileBuffer, mimeType);
    }

    // 2. Perform text AI extraction
    return this.parseWithAI(rawText);
  }

  private static async parseWithAI(rawText: string): Promise<NormalizedTransfer | null> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn('[TransferParserService] No OpenAI API Key found.');
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
  "destination_type": "Uno de: airport, hotel, station, address, venue, other",
  "destination_address": "Dirección completa, nombre del hotel o destino de entrega",
  "flight_linkage": {
    "airline": "Línea aérea asociada si es una recogida en aeropuerto (e.g. Air France)",
    "flight_number": "Número de vuelo asociado (e.g. AF1920)",
    "arrival_time": "Hora de llegada del vuelo asociada",
    "origin_airport": "Aeropuerto de origen del vuelo"
  },
  "vehicle_type": "Tipo de vehículo, modelo o gama contratada (ej. Private Minivan, Premium Sedan)",
  "passengers": 2, // Número entero de pasajeros
  "luggage": 4, // Número entero de maletas o capacidad de equipaje
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
        const parsed = JSON.parse(resultText);
        parsed.raw_payload = JSON.parse(resultText);
        return parsed as NormalizedTransfer;
      }
    } catch (e) {
      console.error('[TransferParserService] AI text extraction failed:', e);
    }
    return null;
  }

  private static async parseWithVision(fileBuffer: Buffer, mimeType?: string): Promise<NormalizedTransfer | null> {
    try {
      if (!process.env.OPENAI_API_KEY) return null;

      let base64Image = '';
      if (mimeType && mimeType.startsWith('image/')) {
        console.log('[TransferParserService] Buffer is already an image. Skipping PDF render.');
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
  "destination_type": "Uno de: airport, hotel, station, address, venue, other",
  "destination_address": "Dirección completa, nombre del hotel o destino de entrega",
  "flight_linkage": {
    "airline": "Línea aérea asociada si es una recogida en aeropuerto (e.g. Air France)",
    "flight_number": "Número de vuelo asociado (e.g. AF1920)",
    "arrival_time": "Hora de llegada del vuelo asociada",
    "origin_airport": "Aeropuerto de origen del vuelo"
  },
  "vehicle_type": "Tipo de vehículo, modelo o gama contratada (ej. Private Minivan, Premium Sedan)",
  "passengers": 2, // Número de pasajeros
  "luggage": 4, // Número de maletas
  "meeting_point": "Instrucciones de encuentro específicas del chofer/punto de reunión (ej. Terminal 2E: Chofer sostiene cartel en llegadas)",
  "support_phone": "Teléfono de soporte o número de emergencia del proveedor",
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
        const parsed = JSON.parse(resultText);
        parsed.raw_payload = JSON.parse(resultText);
        return parsed as NormalizedTransfer;
      }
    } catch (e) {
      console.error('[TransferParserService] Vision extraction failed:', e);
    }
    return null;
  }
}
