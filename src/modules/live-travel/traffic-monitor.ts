import { GoogleMapsService } from '@/core/services/google-maps.service';
import { LiveTrafficStatus } from './types';
import { Coordinates } from '@/core/types/geo';

export async function monitorTraffic(
  origin: Coordinates,
  destination: Coordinates,
  originName: string,
  destinationName: string,
  targetArrivalTime: Date
): Promise<LiveTrafficStatus> {
  let durationSeconds = 1800; // 30 mins default
  let durationInTrafficSeconds = 1800;
  let distanceText = '15 km';
  let source = 'mock';

  try {
    const route = await GoogleMapsService.getRoute(origin, destination, 'DRIVING');
    if (route) {
      durationSeconds = route.duration_seconds;
      durationInTrafficSeconds = route.duration_seconds;
      distanceText = route.distance_text;
      source = route.source;
    }
  } catch (err) {
    console.warn('[TrafficMonitor] GoogleMapsService error, using mock fallback:', err);
  }

  // Simulate traffic congestion based on current hour (rush hour simulation)
  const now = new Date();
  const currentHour = now.getHours();
  let trafficMultiplier = 1.0;

  // Rush hours: 8:00 - 9:30 and 17:30 - 19:30
  if ((currentHour >= 8 && currentHour < 10) || (currentHour >= 17 && currentHour < 20)) {
    trafficMultiplier = 1.45; // 45% delay
  } else if (currentHour >= 12 && currentHour < 14) {
    trafficMultiplier = 1.2; // 20% delay
  }

  durationInTrafficSeconds = Math.round(durationSeconds * trafficMultiplier);
  const delayMinutes = Math.max(0, Math.round((durationInTrafficSeconds - durationSeconds) / 60));

  let congestionLevel: LiveTrafficStatus['congestionLevel'] = 'LOW';
  if (trafficMultiplier >= 1.4) {
    congestionLevel = 'HEAVY';
  } else if (trafficMultiplier >= 1.15) {
    congestionLevel = 'MODERATE';
  }

  // Recommended departure: target arrival time minus transit duration in traffic, minus a buffer (e.g. 15 mins for normal, 120 mins for flight)
  const isFlight = destinationName.toLowerCase().includes('aeropuerto') || 
                   destinationName.toLowerCase().includes('airport') || 
                   destinationName.toLowerCase().includes('cdg') || 
                   destinationName.toLowerCase().includes('ory') || 
                   destinationName.toLowerCase().includes('vuelo') || 
                   destinationName.toLowerCase().includes('salida');
                   
  const bufferMinutes = isFlight ? 120 : 15; // 2 hours buffer for flight airport arrival, 15 mins for other events
  const recommendedDepartureTime = new Date(targetArrivalTime.getTime() - (durationInTrafficSeconds * 1000) - (bufferMinutes * 60 * 1000));

  return {
    origin: originName,
    destination: destinationName,
    distanceText,
    durationSeconds,
    durationInTrafficSeconds,
    delayMinutes,
    congestionLevel,
    recommendedDepartureTime
  };
}
