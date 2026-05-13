export interface UserTravelContext {
  profile_id: string;
  plan_id: string;
  hotel?: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  event?: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  current_location?: {
    latitude: number;
    longitude: number;
  };
  agenda_items: any[];
  flights: any[];
  hospitality_events: any[];
  mobility_preferences?: string[];
  time_window_minutes?: number;
}

export interface PlaceCandidate {
  google_place_id: string;
  name: string;
  category: string;
  rating?: number;
  address: string;
  vicinity?: string;
  distance_meters?: number;
  duration_minutes?: number;
  open_now?: boolean;
  latitude: number;
  longitude: number;
  price_level?: number;
  user_ratings_total?: number;
}

export interface AIRecommendation {
  place_id: string;
  score: number; // 0 to 100
  reason: string;
  best_for: string[];
  warnings?: string[];
  suggested_action?: string;
}

export type RecommendationIntent = 
  | 'quick_lunch' 
  | 'business_dinner' 
  | 'coffee_nearby' 
  | 'museum_short_visit' 
  | 'tourist_walk' 
  | 'pharmacy' 
  | 'transport_option' 
  | 'free_time_plan';
