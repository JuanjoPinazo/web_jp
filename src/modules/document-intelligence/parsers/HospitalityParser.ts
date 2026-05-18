import { BaseParser } from './BaseParser';
import { NormalizedTravelEntity } from '../types';

export class HospitalityParser implements BaseParser {
  async parse(rawText: string, fileBuffer?: Buffer, mimeType?: string): Promise<NormalizedTravelEntity | null> {
    console.log('[HospitalityParser] Starting hospitality and restaurant parsing...');

    const t = rawText.toUpperCase();
    const isHospitalityOrRestaurant = 
      t.includes('RESTAURANTE') || t.includes('RESTAURANT') || t.includes('MESA') || t.includes('TABLE') ||
      t.includes('THE FORK') || t.includes('ELTENEDOR') || t.includes('OPENTABLE') || t.includes('RESERVANDOMESA') ||
      t.includes('EVENT') || t.includes('ENTRADA') || t.includes('CONGRESS') || t.includes('CONGRESO') ||
      t.includes('ACCESO VIP') || t.includes('VIP PASS') || t.includes('TICKETMASTER') || t.includes('CENA DE GALA') ||
      t.includes('SYMPOSIUM') || t.includes('CONFERENCE') || t.includes('PONENCIA') ||
      (fileBuffer && (mimeType?.includes('restaurant') || mimeType?.includes('event') || mimeType?.includes('ticket')));

    if (!isHospitalityOrRestaurant) {
      console.log('[HospitalityParser] Document is not hospitality or restaurant. Skipping.');
      return null;
    }

    if (!process.env.OPENAI_API_KEY) {
      console.warn('[HospitalityParser] No OpenAI API Key found.');
      return null;
    }

    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Determine likely subtype
      const isRestaurant = t.includes('RESTAURANTE') || t.includes('RESTAURANT') || t.includes('MESA') || t.includes('TABLE') || t.includes('THE FORK') || t.includes('ELTENEDOR') || t.includes('OPENTABLE');
      const prompt = `
Eres un extractor de datos de hostelería y eventos de élite para la plataforma premium JP Intelligence.
Analiza el siguiente texto de confirmación de restaurante o entrada de evento y responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin bloques de código) con la estructura indicada a continuación.

Si el documento es una reserva de RESTAURANTE:
{
  "entity_type": "restaurant",
  "restaurant_name": "Nombre del restaurante",
  "reservation_time": "Fecha y hora de la reserva en formato ISO YYYY-MM-DDTHH:mm:00 (si no hay año, asume 2026)",
  "reservation_name": "Nombre de la persona que reserva",
  "passengers": 2, // Número entero de comensales/personas
  "booking_reference": "Código de reserva o localizador si aparece",
  "notes": "Notas adicionales relevantes (e.g. Alergias, Menú Premium, Terraza)",
  "parsed_confidence": 95
}

Si el documento es una entrada de EVENTO/CONGRESO/CONCIERGE:
{
  "entity_type": "event",
  "title": "Nombre o título del evento (e.g. Cena de Gala, Gala Dinner EuroPCR, Ponencia Científica)",
  "description": "Descripción corta o detalles del evento",
  "start_datetime": "Fecha y hora de inicio en formato ISO YYYY-MM-DDTHH:mm:00 (si no hay año, asume 2026)",
  "end_datetime": "Fecha y hora de fin en formato ISO YYYY-MM-DDTHH:mm:00 o null si no se indica",
  "venue_name": "Nombre de la sede/local de celebración",
  "venue_address": "Dirección completa de la sede",
  "contact_phone": "Teléfono de contacto o soporte",
  "is_agenda": true, // Pon true si es una sesión científica, congreso, ponencia médica o agenda. Pon false si es un evento social/ocio (cena de gala, cóctel).
  "booking_reference": "Código de barra o localizador de entrada si aparece",
  "parsed_confidence": 90
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
        console.log('[HospitalityParser] AI extraction succeeded:', parsed);

        if (parsed.entity_type === 'restaurant') {
          return {
            type: 'restaurant_booking',
            provider: parsed.restaurant_name || 'Restaurant',
            confidence: parsed.parsed_confidence || 90,
            booking_reference: parsed.booking_reference,
            restaurant: {
              restaurant_name: parsed.restaurant_name || '',
              reservation_time: parsed.reservation_time || '',
              reservation_name: parsed.reservation_name,
              passengers: Number(parsed.passengers) || undefined,
              notes: parsed.notes
            },
            raw_payload: parsed
          };
        } else {
          return {
            type: 'hospitality_event',
            provider: parsed.title || 'Event',
            confidence: parsed.parsed_confidence || 85,
            booking_reference: parsed.booking_reference,
            event: {
              title: parsed.title || '',
              description: parsed.description,
              start_datetime: parsed.start_datetime || '',
              end_datetime: parsed.end_datetime,
              venue_name: parsed.venue_name || '',
              venue_address: parsed.venue_address,
              contact_phone: parsed.contact_phone,
              is_agenda: !!parsed.is_agenda
            },
            raw_payload: parsed
          };
        }
      }
    } catch (e: any) {
      console.error('[HospitalityParser] AI extraction failed:', e.message);
    }

    return null;
  }
}
