export interface Location {
  address: string;
  latitude: number;
  longitude: number;
}

export interface DepartureCalculationParams {
  origin: Location;
  destination: Location;
  targetArrivalTime: Date;
  bufferMinutes: number;
  travelMode?: 'driving' | 'walking' | 'transit';
}

export interface RecommendedDeparture {
  recommendedTime: Date;
  estimatedTravelTimeMinutes: number;
  distanceKm: number;
  origin: string;
  destination: string;
}

export async function calculateRecommendedDeparture(params: DepartureCalculationParams): Promise<RecommendedDeparture> {
  const { origin, destination, targetArrivalTime, bufferMinutes, travelMode = 'driving' } = params;

  // For now, we use a simple Haversine + speed estimate as fallback 
  // but ideally we'd call Google Distance Matrix here.
  // Given we have the API key, let's try a fetch to Google if possible.
  
  let travelTimeMinutes = 30; // Default fallback
  let distanceKm = 10;

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.latitude},${origin.longitude}&destinations=${destination.latitude},${destination.longitude}&mode=${travelMode}&key=${apiKey}`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
        const element = data.rows[0].elements[0];
        travelTimeMinutes = Math.ceil(element.duration.value / 60);
        distanceKm = element.distance.value / 1000;
      }
    }
  } catch (error) {
    console.warn('SmartDeparture: Google API failed, using estimates', error);
    // Rough estimate: 50km/h average
    const dist = calculateHaversineDistance(origin, destination);
    travelTimeMinutes = Math.ceil((dist / 50) * 60) + 15; // +15 min traffic buffer
    distanceKm = dist;
  }

  const totalTimeNeeded = travelTimeMinutes + bufferMinutes;
  const recommendedTime = new Date(targetArrivalTime.getTime() - totalTimeNeeded * 60 * 1000);

  return {
    recommendedTime,
    estimatedTravelTimeMinutes: travelTimeMinutes,
    distanceKm,
    origin: origin.address,
    destination: destination.address
  };
}

function calculateHaversineDistance(loc1: Location, loc2: Location): number {
  const R = 6371; // Earth radius in km
  const dLat = (loc2.latitude - loc1.latitude) * (Math.PI / 180);
  const dLon = (loc2.longitude - loc1.longitude) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(loc1.latitude * (Math.PI / 180)) * Math.cos(loc2.latitude * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
