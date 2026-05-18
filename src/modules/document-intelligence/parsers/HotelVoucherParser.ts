import { BaseParser } from './BaseParser';
import { NormalizedTravelEntity } from '../types';
import { parseHotelBooking } from '@/lib/parsers/hotel';

export class HotelVoucherParser implements BaseParser {
  async parse(rawText: string, fileBuffer?: Buffer, mimeType?: string): Promise<NormalizedTravelEntity | null> {
    console.log('[HotelVoucherParser] Starting hotel parsing...');

    const t = rawText.toUpperCase();
    const isHotel = t.includes('HOTEL') || t.includes('ALOJAMIENTO') || t.includes('ESTANCIA') || 
                    t.includes('CHECK-IN') || t.includes('CHECK-OUT') || t.includes('BOOKING.COM') || 
                    t.includes('HOTELS.COM') || (fileBuffer && (mimeType?.includes('hotel') || mimeType?.includes('stay')));

    if (!isHotel) {
      console.log('[HotelVoucherParser] Document is not a Hotel stay. Skipping.');
      return null;
    }

    // 1. Run deterministic parser
    let parsedData = parseHotelBooking(rawText) || {
      confidence: 30
    };

    // 2. AI Fallback if critical info is missing
    const isMissingCriticalInfo = !parsedData.hotel_name || !parsedData.check_in;
    if (isMissingCriticalInfo && process.env.OPENAI_API_KEY) {
      console.log('[HotelVoucherParser] Critical info missing. Triggering OpenAI fallback...');
      try {
        const { default: OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const prompt = `
Eres un extractor de datos de hotel experto de la plataforma JP Intelligence. 
Tu tarea es extraer los datos clave del siguiente texto extraído de una confirmación de hotel o voucher de alojamiento.

Analiza el texto y responde ÚNICAMENTE con un objeto JSON (sin markdown, sin bloques de código) con la siguiente estructura. Si un campo no está presente, pon null:

{
  "hotel_name": "Nombre del hotel",
  "confirmation_number": "Número de confirmación/reserva",
  "check_in": "Fecha de check-in en formato ISO YYYY-MM-DDTHH:mm:00 (si no hay año, asume 2026)",
  "check_out": "Fecha de check-out en formato ISO YYYY-MM-DDTHH:mm:00 (si no hay año, asume 2026)",
  "address": "Dirección completa del hotel",
  "room_type": "Tipo de habitación (e.g. Doble Estándar)"
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
          console.log('[HotelVoucherParser] OpenAI hotel extraction succeeded:', aiData);
          parsedData = {
            ...parsedData,
            hotel_name: aiData.hotel_name || parsedData.hotel_name,
            confirmation_number: aiData.confirmation_number || parsedData.confirmation_number,
            check_in: aiData.check_in || parsedData.check_in,
            check_out: aiData.check_out || parsedData.check_out,
            address: aiData.address || parsedData.address,
            room_type: aiData.room_type || parsedData.room_type,
            confidence: Math.max(parsedData.confidence || 0, 95)
          };
        }
      } catch (e: any) {
        console.error('[HotelVoucherParser] OpenAI fallback failed:', e.message);
      }
    }

    if (!parsedData.hotel_name) {
      console.warn('[HotelVoucherParser] Failed to extract hotel name.');
      return null;
    }

    // 3. Return NormalizedTravelEntity
    return {
      type: 'hotel_reservation',
      provider: parsedData.hotel_name || 'Hotel stay',
      confidence: parsedData.confidence ? parsedData.confidence * 100 : 80,
      booking_reference: parsedData.confirmation_number,
      hotel: {
        hotel_name: parsedData.hotel_name || '',
        confirmation_number: parsedData.confirmation_number || '',
        check_in: parsedData.check_in || '',
        check_out: parsedData.check_out || '',
        address: parsedData.address || '',
        room_type: parsedData.room_type
      },
      raw_payload: parsedData
    };
  }
}
