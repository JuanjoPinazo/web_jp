import { DepartureBuffers, RecommendedDeparture, CongestionLevel } from './types';

export function calculateBuffers(
  eventType?: string,
  metadata?: any
): DepartureBuffers {
  let airportBufferMinutes = 0;
  let securityBufferMinutes = 0;
  let checkInBufferMinutes = 0;
  let boardingBufferMinutes = 0;
  let walkingBufferMinutes = 0;
  let customBufferMinutes = 0;

  if (eventType === 'flight') {
    // Determine Schengen (2h) vs Long-Haul (3h)
    const isLongHaul = 
      metadata?.is_long_haul === true || 
      metadata?.long_haul === true ||
      metadata?.flight_type?.toLowerCase() === 'long_haul' ||
      metadata?.arrival_location?.toLowerCase().includes('new york') ||
      metadata?.arrival_location?.toLowerCase().includes('jfk') ||
      metadata?.arrival_location?.toLowerCase().includes('tokyo') ||
      metadata?.arrival_location?.toLowerCase().includes('miami');

    // 2h = 120min buffer, 3h = 180min buffer
    airportBufferMinutes = isLongHaul ? 180 : 120;
    securityBufferMinutes = 30;
    checkInBufferMinutes = 30;
    boardingBufferMinutes = 20;
  } else if (eventType === 'congress') {
    securityBufferMinutes = 10;
    walkingBufferMinutes = 5;
    customBufferMinutes = 15; // Target arriving 15m early
  } else if (eventType === 'restaurant') {
    customBufferMinutes = 10; // Target 10m early
  } else if (eventType === 'hospitality') {
    customBufferMinutes = 15;
  } else if (eventType === 'station') {
    boardingBufferMinutes = 15;
    customBufferMinutes = 10;
  } else if (eventType === 'hotel') {
    customBufferMinutes = 10;
  } else {
    // Default fallback buffer
    customBufferMinutes = 15;
  }

  return {
    airportBufferMinutes,
    securityBufferMinutes,
    checkInBufferMinutes,
    boardingBufferMinutes,
    walkingBufferMinutes,
    customBufferMinutes
  };
}

export function buildRecommendationMessage(
  destinationName: string,
  recommendedTime: Date,
  travelDurationMinutes: number,
  congestionLevel: CongestionLevel,
  eventType?: string
): string {
  const now = new Date();
  const timeDiffMs = recommendedTime.getTime() - now.getTime();
  const timeDiffMins = Math.round(timeDiffMs / (1000 * 60));

  const destinationBrief = destinationName.split('(')[0].trim();

  if (timeDiffMins <= 0) {
    if (Math.abs(timeDiffMins) < 5) {
      return `Debes salir ahora hacia ${destinationBrief}. El viaje tomará ${travelDurationMinutes} min.`;
    }
    return `Salida recomendada inmediata hacia ${destinationBrief} (prioridad urgente).`;
  }

  if (timeDiffMins <= 30) {
    return `Debes salir en ${timeDiffMins} min hacia ${destinationBrief}.`;
  }

  // Future departures
  const timeStr = recommendedTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  let trafficLabel = 'Tránsito normal';
  if (congestionLevel === 'HEAVY') {
    trafficLabel = 'Tránsito denso';
  } else if (congestionLevel === 'LIGHT') {
    trafficLabel = 'Tránsito fluido';
  }

  return `Salida recomendada a las ${timeStr} hacia ${destinationBrief} (${trafficLabel}, viaje de ${travelDurationMinutes} min).`;
}
