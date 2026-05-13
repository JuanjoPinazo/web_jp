export type TravelMode = 'WALKING' | 'DRIVING' | 'TRANSIT' | 'BICYCLING';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distance_meters: number;
  duration_seconds: number;
  distance_text: string;
  duration_text: string;
  travel_mode: TravelMode;
  source: 'cache' | 'google';
}
