import { RouteMetrics, ETAEngineResult } from './types';

export class ETAEngine {
  /**
   * Calcula el ETA, estado del tráfico y recomendaciones de IA basadas en métricas de ruta y hora del día.
   */
  static calculateETA(
    metrics: RouteMetrics,
    targetArrivalTime?: string // Hora programada del evento (formato ISO o HH:MM)
  ): ETAEngineResult {
    const now = new Date();
    
    // 1. Calcular hora estimada de llegada (ETA)
    const etaDate = new Date(now.getTime() + metrics.durationSeconds * 1000);
    const etaText = `Llegada a las ${etaDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}h`;

    // 2. Determinar estado de tráfico simulado / contextual
    const currentHour = now.getHours();
    let trafficStatus: 'light' | 'moderate' | 'heavy' = 'light';
    let trafficText = 'Tráfico fluido';

    if (metrics.mode === 'DRIVING') {
      // Simular hora punta
      if ((currentHour >= 8 && currentHour <= 10) || (currentHour >= 18 && currentHour <= 20)) {
        trafficStatus = 'heavy';
        trafficText = 'Tráfico muy intenso';
      } else if (currentHour >= 12 && currentHour <= 15) {
        trafficStatus = 'moderate';
        trafficText = 'Tráfico moderado';
      }
    }

    // 3. Determinar el modo de transporte recomendado y la sugerencia de la IA
    let recommendedMode = metrics.mode;
    let aiRecommendation = '';

    const distanceKm = metrics.distanceMeters / 1000;
    const durationMin = Math.round(metrics.durationSeconds / 60);

    if (metrics.mode === 'WALKING' || (metrics.distanceMeters < 900 && metrics.mode !== 'TRANSIT')) {
      recommendedMode = 'WALKING';
      aiRecommendation = `Te sugerimos ir andando (${durationMin} min). Es la opción más rápida, saludable y ecológica para distancias cortas.`;
    } else if (trafficStatus === 'heavy' && metrics.mode === 'DRIVING') {
      recommendedMode = 'TRANSIT';
      aiRecommendation = `Tráfico intenso detectado en el trayecto en coche. Te recomendamos usar el transporte público/metro para ahorrar aproximadamente ${Math.round(durationMin * 0.3)} min.`;
    } else {
      // Calcular hora de salida recomendada
      let departureText = '';
      if (targetArrivalTime) {
        try {
          let targetDate = new Date(targetArrivalTime);
          if (isNaN(targetDate.getTime())) {
            // Si es solo HH:MM
            const [hours, minutes] = targetArrivalTime.split(':').map(Number);
            targetDate = new Date();
            targetDate.setHours(hours, minutes, 0, 0);
          }
          
          // Hora recomendada = hora del evento - duración del viaje - 10 minutos de margen de cortesía
          const recommendedDepartureDate = new Date(targetDate.getTime() - metrics.durationSeconds * 1000 - 10 * 60 * 1000);
          departureText = ` Salida recomendada a las ${recommendedDepartureDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}h.`;
        } catch (e) {
          // Ignorar error de parsing
        }
      }

      const transportOption = metrics.polyline ? 'Uber/Cabify' : 'Transfer';
      aiRecommendation = `Trayecto óptimo en coche (${durationMin} min). ${trafficText}.${departureText} Te sugerimos solicitar un ${transportOption}.`;
    }

    return {
      etaText,
      durationText: `${durationMin} min`,
      trafficStatus,
      trafficText,
      aiRecommendation,
      recommendedMode
    };
  }
}
