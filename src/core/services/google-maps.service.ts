import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { Coordinates, TravelMode, RouteResult } from '../types/geo';

export class GoogleMapsService {
  private static getApiKey() {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      console.error('[GoogleMapsService] GOOGLE_MAPS_API_KEY no configurada');
      throw new Error('GOOGLE_MAPS_API_KEY no configurada');
    }
    return key;
  }

  /**
   * Obtiene ruta entre dos coordenadas con persistencia en Supabase
   */
  static async getRoute(
    origin: Coordinates,
    destination: Coordinates,
    mode: TravelMode = 'DRIVING'
  ): Promise<RouteResult | null> {
    try {
      const supabase = getSupabaseAdmin();

      // 1. INTENTAR RECUPERAR DE CACHÉ
      const { data: cached } = await supabase
        .from('travel_routes')
        .select('*')
        .eq('origin_lat', origin.lat)
        .eq('origin_lng', origin.lng)
        .eq('destination_lat', destination.lat)
        .eq('destination_lng', destination.lng)
        .eq('travel_mode', mode)
        .maybeSingle();

      if (cached) {
        return {
          distance_meters: cached.distance_meters,
          duration_seconds: cached.duration_seconds,
          distance_text: cached.distance_text,
          duration_text: cached.duration_text,
          travel_mode: cached.travel_mode as TravelMode,
          source: 'cache'
        };
      }

      // 2. LLAMAR A GOOGLE MAPS
      const apiKey = this.getApiKey();
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&mode=${mode.toLowerCase()}&key=${apiKey}`;
      
      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== 'OK') {
        throw new Error(`Google API Status: ${data.status}${data.error_message ? ' - ' + data.error_message : ''}`);
      }

      const element = data.rows[0].elements[0];
      if (element.status !== 'OK') {
        throw new Error(`Google Route Status: ${element.status} (Probablemente no hay ruta disponible para este modo de transporte)`);
      }

      const result: RouteResult = {
        distance_meters: element.distance.value,
        duration_seconds: element.duration.value,
        distance_text: element.distance.text,
        duration_text: element.duration.text,
        travel_mode: mode,
        source: 'google'
      };

      // 3. GUARDAR EN CACHÉ PARA FUTURAS CONSULTAS
      await supabase.from('travel_routes').insert({
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        travel_mode: mode,
        distance_meters: result.distance_meters,
        duration_seconds: result.duration_seconds,
        distance_text: result.distance_text,
        duration_text: result.duration_text,
        raw_response: data
      });

      return result;
    } catch (error: any) {
      console.error('[GoogleMapsService] Service Error:', error.message);
      throw error;
    }
  }
}
