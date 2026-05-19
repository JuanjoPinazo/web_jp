import { Location, TravelMode } from './types';

export interface ETAResult {
  durationMinutes: number;
  distanceKm: number;
  source: 'google' | 'fallback';
}

export async function estimateTravelTime(
  origin: Location,
  destination: Location,
  mode: TravelMode = 'driving'
): Promise<ETAResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey && origin.latitude && origin.longitude && destination.latitude && destination.longitude) {
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.latitude},${origin.longitude}&destinations=${destination.latitude},${destination.longitude}&mode=${mode}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.rows?.[0]?.elements?.[0]?.status === 'OK') {
        const element = data.rows[0].elements[0];
        const durationMinutes = Math.ceil(element.duration.value / 60);
        const distanceKm = Number((element.distance.value / 1000).toFixed(1));
        return {
          durationMinutes,
          distanceKm,
          source: 'google'
        };
      }
    } catch (error) {
      console.warn('[SmartDeparture ETA Engine] Google Distance Matrix request failed, falling back to calculation.', error);
    }
  }

  // Fallback Haversine Calculation
  const dist = calculateHaversineDistance(origin, destination);
  let speedKmh = 45; // Default driving speed inside city limit
  let baseBuffer = 5;

  if (mode === 'walking') {
    speedKmh = 5; // 5 km/h walking speed
    baseBuffer = 0;
  } else if (mode === 'transit') {
    speedKmh = 25; // 25 km/h average public transport speed including wait times
    baseBuffer = 10;
  }

  const travelHours = dist / speedKmh;
  const durationMinutes = Math.ceil(travelHours * 60) + baseBuffer;

  return {
    durationMinutes,
    distanceKm: Number(dist.toFixed(1)),
    source: 'fallback'
  };
}

export function calculateHaversineDistance(loc1: Location, loc2: Location): number {
  if (!loc1.latitude || !loc1.longitude || !loc2.latitude || !loc2.longitude) {
    return 10; // realistic default distance in km
  }
  const R = 6371; // Earth's radius in km
  const dLat = (loc2.latitude - loc1.latitude) * (Math.PI / 180);
  const dLon = (loc2.longitude - loc1.longitude) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(loc1.latitude * (Math.PI / 180)) * Math.cos(loc2.latitude * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
