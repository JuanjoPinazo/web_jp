import { Coordinates } from '@/core/types/geo';

export interface LiveFlightStatus {
  flightId: string;
  flightNumber: string;
  status: 'SCHEDULED' | 'BOARDING' | 'DELAYED' | 'CANCELLED' | 'LANDED';
  delayMinutes: number;
  gate: string | null;
  scheduledTime: Date;
  estimatedTime: Date;
}

export interface LiveTrafficStatus {
  origin: string;
  destination: string;
  distanceText: string;
  durationSeconds: number;
  durationInTrafficSeconds: number;
  delayMinutes: number;
  congestionLevel: 'LOW' | 'MODERATE' | 'HEAVY';
  recommendedDepartureTime: Date;
}

export interface LiveWeatherStatus {
  location: string;
  temperatureCelsius: number;
  condition: 'CLEAR' | 'CLOUDY' | 'RAIN' | 'SNOW' | 'WINDY' | 'HEAT_WAVE';
  precipitationProbability: number;
  windSpeedKmh: number;
  description: string;
}

export interface LiveRecommendation {
  id: string;
  type: 'departure' | 'transport' | 'operational' | 'contextual';
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  actionLabel?: string;
  actionUrl?: string;
  metadata?: any;
}

export interface LiveEvaluationResult {
  planId: string;
  timestamp: string;
  activeFlightStatus: LiveFlightStatus | null;
  activeTrafficStatus: LiveTrafficStatus | null;
  activeWeatherStatus: LiveWeatherStatus | null;
  recommendations: LiveRecommendation[];
}
