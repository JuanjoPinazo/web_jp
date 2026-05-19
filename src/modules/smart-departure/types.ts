export interface Location {
  address: string;
  latitude: number;
  longitude: number;
}

export type TravelMode = 'driving' | 'walking' | 'transit';
export type CongestionLevel = 'LIGHT' | 'MODERATE' | 'HEAVY';

export interface DepartureCalculationParams {
  origin: Location;
  destination: Location;
  targetArrivalTime: Date | string;
  bufferMinutes?: number;
  travelMode?: TravelMode;
  planId?: string;
  profileId?: string;
  eventType?: 'flight' | 'congress' | 'restaurant' | 'hospitality' | 'transfer' | 'hotel' | 'station';
  metadata?: any;
}

export interface TrafficEvaluation {
  congestionLevel: CongestionLevel;
  delayMinutes: number;
  weatherImpactMinutes: number;
  description: string;
}

export interface DepartureBuffers {
  airportBufferMinutes: number;
  securityBufferMinutes: number;
  checkInBufferMinutes: number;
  boardingBufferMinutes: number;
  walkingBufferMinutes: number;
  customBufferMinutes: number;
}

export interface RecommendedDeparture {
  recommendedTime: Date;
  estimatedTravelTimeMinutes: number;
  distanceKm: number;
  origin: string;
  destination: string;
  congestionLevel: CongestionLevel;
  trafficDelayMinutes: number;
  weatherDelayMinutes: number;
  buffers: DepartureBuffers;
  recommendationMessage: string;
  recommendedDepartureMinutes?: number;
  alertTriggered?: 'departure_now' | 'heavy_traffic' | 'airport_congestion' | null;
}
