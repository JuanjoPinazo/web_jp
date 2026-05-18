import { NormalizedTravelEntity } from '../types';

export class DocumentNormalizer {
  /**
   * Normalizes dates, strings, and standard structures inside a NormalizedTravelEntity.
   */
  static normalizeEntity(entity: NormalizedTravelEntity): NormalizedTravelEntity {
    if (!entity) return entity;

    // 1. Normalize dates in flights
    if (entity.flight) {
      if (entity.flight.departure_time) {
        entity.flight.departure_time = this.normalizeDateString(entity.flight.departure_time);
      }
      if (entity.flight.arrival_time) {
        entity.flight.arrival_time = this.normalizeDateString(entity.flight.arrival_time);
      }
    }

    // 2. Normalize dates in transfers
    if (entity.transfer) {
      if (entity.transfer.pickup_datetime) {
        entity.transfer.pickup_datetime = this.normalizeDateString(entity.transfer.pickup_datetime);
      }
      if (entity.transfer.flight_linkage?.arrival_time) {
        entity.transfer.flight_linkage.arrival_time = this.normalizeDateString(entity.transfer.flight_linkage.arrival_time);
      }
    }

    // 3. Normalize dates in hotels
    if (entity.hotel) {
      if (entity.hotel.check_in) {
        entity.hotel.check_in = this.normalizeDateString(entity.hotel.check_in);
      }
      if (entity.hotel.check_out) {
        entity.hotel.check_out = this.normalizeDateString(entity.hotel.check_out);
      }
    }

    // 4. Normalize dates in restaurants
    if (entity.restaurant) {
      if (entity.restaurant.reservation_time) {
        entity.restaurant.reservation_time = this.normalizeDateString(entity.restaurant.reservation_time);
      }
    }

    // 5. Normalize dates in events
    if (entity.event) {
      if (entity.event.start_datetime) {
        entity.event.start_datetime = this.normalizeDateString(entity.event.start_datetime);
      }
      if (entity.event.end_datetime) {
        entity.event.end_datetime = this.normalizeDateString(entity.event.end_datetime);
      }
    }

    return entity;
  }

  /**
   * Standardizes raw text by stripping emails, payment numbers, and generic legal footnotes.
   */
  static cleanNoise(text: string): string {
    if (!text) return '';
    return text
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '') // strip emails
      .replace(/(?:De|From|Para|To|CC|Asunto|Subject|Enviado el|Sent|Date|Fecha):\s*[^\n\r]+/gi, '') // strip email headers
      .replace(/(?:Visa|Mastercard|Amex|Pago|Total|EUR|Price|Precio|XXXXXXXXXXXX)\s*[^\n\r]+/gi, '') // strip payments info
      .replace(/(?:Aviso legal|Condiciones|T\u00e9rminos|Privacy|Pol\u00edtica|Derechos|No-reply)[^\n\r]+/gi, '') // strip terms
      .trim();
  }

  /**
   * Converts a generic date/time string to ISO YYYY-MM-DDTHH:mm:00 format.
   */
  private static normalizeDateString(dateStr: string): string {
    if (!dateStr || typeof dateStr !== 'string') return dateStr;

    // A. Already ISO format (YYYY-MM-DDTHH:mm...)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateStr)) {
      return dateStr.substring(0, 19); // YYYY-MM-DDTHH:mm:ss
    }

    // B. Formats like DD/MM/YYYY (optionally with time)
    const slashMatch = dateStr.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (slashMatch) {
      const [, d, m, y] = slashMatch;
      const timeMatch = dateStr.match(/(\d{2}:\d{2})/);
      const time = timeMatch ? timeMatch[1] : '12:00';
      return `${y}-${m}-${d}T${time}:00`;
    }

    // C. Formats like YYYY/MM/DD
    const reverseMatch = dateStr.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
    if (reverseMatch) {
      const [, y, m, d] = reverseMatch;
      const timeMatch = dateStr.match(/(\d{2}:\d{2})/);
      const time = timeMatch ? timeMatch[1] : '12:00';
      return `${y}-${m}-${d}T${time}:00`;
    }

    return dateStr;
  }
}
