import { TrafficEvaluation, CongestionLevel } from './types';

export function evaluateTrafficAndWeather(
  distanceKm: number,
  weatherCondition?: string
): TrafficEvaluation {
  let congestionLevel: CongestionLevel = 'LIGHT';
  let delayMinutes = 0;
  let weatherImpactMinutes = 0;
  let descriptions: string[] = [];

  // 1. Time & Congestive Analysis (simulate realistic inner city traffic based on distance)
  const currentHour = new Date().getHours();
  
  // Rush hours: 8-10 AM, 5-7 PM (17-19)
  const isRushHour = (currentHour >= 8 && currentHour <= 10) || (currentHour >= 17 && currentHour <= 19);

  if (isRushHour) {
    if (distanceKm > 15) {
      congestionLevel = 'HEAVY';
      delayMinutes = Math.ceil(distanceKm * 1.5); // 1.5 min delay per km
      descriptions.push('Congestión alta por hora punta de tráfico.');
    } else {
      congestionLevel = 'MODERATE';
      delayMinutes = Math.ceil(distanceKm * 0.8);
      descriptions.push('Tránsito denso en vías metropolitanas.');
    }
  } else {
    // Normal hours
    if (distanceKm > 25) {
      congestionLevel = 'MODERATE';
      delayMinutes = Math.ceil(distanceKm * 0.5);
      descriptions.push('Tránsito moderado en vías interurbanas.');
    } else {
      congestionLevel = 'LIGHT';
      delayMinutes = 0;
      descriptions.push('Tránsito fluido sin retenciones.');
    }
  }

  // 2. Weather Conditions Modifier
  if (weatherCondition) {
    const condition = weatherCondition.toUpperCase();
    if (condition.includes('RAIN') || condition.includes('LLUVIA')) {
      weatherImpactMinutes = 15;
      descriptions.push('Precipitaciones: velocidad reducida en calzada (+15 min).');
    } else if (condition.includes('WIND') || condition.includes('VIENTO')) {
      weatherImpactMinutes = 10;
      descriptions.push('Vientos fuertes: precaución en accesos (+10 min).');
    } else if (condition.includes('HEAT') || condition.includes('CALOR')) {
      weatherImpactMinutes = 5;
      descriptions.push('Ola de calor extrema (+5 min).');
    } else if (condition.includes('SNOW') || condition.includes('NIEVE')) {
      weatherImpactMinutes = 25;
      descriptions.push('Nieve/Hielo: Retenciones y desvíos preventivos (+25 min).');
    }
  }

  return {
    congestionLevel,
    delayMinutes,
    weatherImpactMinutes,
    description: descriptions.join(' ')
  };
}
