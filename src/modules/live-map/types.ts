export type MapLocationType = 
  | 'hotel' 
  | 'airport' 
  | 'congress' 
  | 'restaurant' 
  | 'hospitality' 
  | 'transfer' 
  | 'user'
  | 'other';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MapLocation {
  id: string;
  name: string;
  type: MapLocationType;
  coordinates: Coordinates;
  address?: string;
  details?: string;
  time?: string;
  icon?: string;
  meta?: any;
}

export interface RouteMetrics {
  distanceMeters: number;
  durationSeconds: number;
  distanceText: string;
  durationText: string;
  mode: 'DRIVING' | 'WALKING' | 'TRANSIT';
  polyline?: string;
}

export interface ETAEngineResult {
  etaText: string; // e.g. "Llegada 14:45h"
  durationText: string; // e.g. "25 min"
  trafficStatus: 'light' | 'moderate' | 'heavy';
  trafficText: string; // e.g. "Tráfico fluido", "Retención moderada", "Tráfico intenso"
  aiRecommendation: string; // Contextual recommendation
  recommendedMode: 'WALKING' | 'DRIVING' | 'TRANSIT';
}
