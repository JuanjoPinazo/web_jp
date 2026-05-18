import { LiveFlightStatus, LiveTrafficStatus, LiveWeatherStatus, LiveRecommendation } from './types';

export function generateLiveRecommendations(
  flightStatus: LiveFlightStatus | null,
  trafficStatus: LiveTrafficStatus | null,
  weatherStatus: LiveWeatherStatus | null,
  nextEvent: any
): LiveRecommendation[] {
  const recommendations: LiveRecommendation[] = [];
  const now = new Date();

  // 1. Flight Status Recommendations
  if (flightStatus) {
    if (flightStatus.status === 'DELAYED') {
      recommendations.push({
        id: `rec_flight_delayed_${flightStatus.flightId}`,
        type: 'operational',
        title: 'Vuelo Retrasado',
        message: `Tu vuelo ${flightStatus.flightNumber} tiene un retraso estimado de ${flightStatus.delayMinutes} min. Nueva salida: ${flightStatus.estimatedTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}.`,
        priority: 'high',
        actionLabel: 'Ver Estado',
        actionUrl: '/dashboard?tab=home&view=airport'
      });

      recommendations.push({
        id: `rec_transfer_adjusted_${flightStatus.flightId}`,
        type: 'operational',
        title: 'Traslado Ajustado',
        message: `Tu conductor privado ha sido notificado del retraso y ajustará la hora de recogida automáticamente.`,
        priority: 'normal'
      });
    } else if (flightStatus.status === 'CANCELLED') {
      recommendations.push({
        id: `rec_flight_cancelled_${flightStatus.flightId}`,
        type: 'operational',
        title: 'Vuelo Cancelado',
        message: `¡ATENCIÓN! Tu vuelo ${flightStatus.flightNumber} figura como CANCELADO. Contacta inmediatamente con tu coordinador de viajes.`,
        priority: 'urgent',
        actionLabel: 'Llamar Coordinador',
        actionUrl: 'coordinator_call'
      });
    }

    if (flightStatus.gate && flightStatus.status !== 'CANCELLED') {
      recommendations.push({
        id: `rec_gate_assigned_${flightStatus.flightId}`,
        type: 'contextual',
        title: 'Puerta Asignada',
        message: `Embarque por la puerta ${flightStatus.gate}. Ten listo tu Boarding Pass en tu dispositivo.`,
        priority: 'normal',
        actionLabel: 'Ver Boarding Pass',
        actionUrl: 'show_boarding_pass'
      });
    }
  }

  // 2. Traffic & Smart Departure Recommendations
  if (trafficStatus && nextEvent) {
    const diffMs = trafficStatus.recommendedDepartureTime.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / (60 * 1000));

    if (trafficStatus.congestionLevel === 'HEAVY') {
      recommendations.push({
        id: `rec_traffic_heavy_${nextEvent.id}`,
        type: 'transport',
        title: 'Tráfico Muy Intenso',
        message: `Congestión alta en la ruta hacia ${nextEvent.title}. Retraso estimado de ${trafficStatus.delayMinutes} min.`,
        priority: 'high',
        actionLabel: 'Ver Mapa',
        actionUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(nextEvent.location)}`
      });
    }

    // Departure countdown warnings
    if (diffMinutes <= 0 && diffMinutes > -30) {
      recommendations.push({
        id: `rec_depart_now_${nextEvent.id}`,
        type: 'departure',
        title: 'Sal Ahora Mismo',
        message: `Hora de salida recomendada alcanzada. Trayecto estimado: ${Math.round(trafficStatus.durationInTrafficSeconds / 60)} min.`,
        priority: 'urgent',
        actionLabel: 'Cómo llegar',
        actionUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(nextEvent.location)}`
      });
    } else if (diffMinutes > 0 && diffMinutes <= 20) {
      recommendations.push({
        id: `rec_depart_soon_${nextEvent.id}`,
        type: 'departure',
        title: 'Prepárate para Salir',
        message: `Debes partir en ${diffMinutes} min hacia ${nextEvent.title} para llegar puntualmente.`,
        priority: 'high',
        actionLabel: 'Ver Destino',
        actionUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(nextEvent.location)}`
      });
    }
  }

  // 3. Weather Context Recommendations
  if (weatherStatus) {
    if (weatherStatus.condition === 'RAIN') {
      recommendations.push({
        id: `rec_weather_rain`,
        type: 'contextual',
        title: 'Lluvia Prevista',
        message: `Lluvia activa en la zona. Te recomendamos solicitar un traslado/Uber en lugar de caminar.`,
        priority: 'normal'
      });
    } else if (weatherStatus.condition === 'WINDY') {
      recommendations.push({
        id: `rec_weather_wind`,
        type: 'contextual',
        title: 'Viento Fuerte en Aeropuerto',
        message: `Vientos fuertes en las pistas. Posibles demoras en la entrega de equipajes.`,
        priority: 'normal'
      });
    } else if (weatherStatus.condition === 'HEAT_WAVE') {
      recommendations.push({
        id: `rec_weather_heat`,
        type: 'contextual',
        title: 'Calor Extremo',
        message: `Temperatura de ${weatherStatus.temperatureCelsius}°C en la ciudad. Se aconseja transporte climatizado.`,
        priority: 'low'
      });
    }
  }

  // 4. Default Operational Warnings
  if (nextEvent && nextEvent.event_type === 'flight') {
    recommendations.push({
      id: `rec_passport_control`,
      type: 'operational',
      title: 'Control de Seguridad',
      message: `Tiempos de espera moderados en control de seguridad. Te aconsejamos llevar líquidos y aparatos listos.`,
      priority: 'low'
    });
  }

  return recommendations;
}
