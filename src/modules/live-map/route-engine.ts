import { Coordinates, RouteMetrics } from './types';

export class RouteEngine {
  private static cache: Record<string, RouteMetrics> = {};

  private static getCacheKey(origin: Coordinates, destination: Coordinates, mode: string): string {
    return `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}_${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}_${mode}`;
  }

  /**
   * Inyecta rutas cacheadas de la base de datos en la caché local del RouteEngine.
   */
  static injectCachedRoutes(dbRoutes: any[]) {
    if (!dbRoutes || !Array.isArray(dbRoutes)) return;
    dbRoutes.forEach(r => {
      const mode = r.travel_mode || 'DRIVING';
      const key = `${r.origin_lat.toFixed(5)},${r.origin_lng.toFixed(5)}_${r.destination_lat.toFixed(5)},${r.destination_lng.toFixed(5)}_${mode}`;
      
      this.cache[key] = {
        distanceMeters: r.distance_meters,
        durationSeconds: r.duration_seconds,
        distanceText: r.distance_text,
        durationText: r.duration_text,
        mode: mode as any,
        polyline: r.raw_response?.routes?.[0]?.overview_polyline?.points || r.raw_response?.polyline || undefined
      };
    });
  }

  /**
   * Calcula la distancia Haversine (línea recta) entre dos coordenadas.
   * Se utiliza como fallback si falla la Directions API.
   */
  static calculateHaversineDistance(coords1: Coordinates, coords2: Coordinates): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (coords1.lat * Math.PI) / 180;
    const φ2 = (coords2.lat * Math.PI) / 180;
    const Δφ = ((coords2.lat - coords1.lat) * Math.PI) / 180;
    const Δλ = ((coords2.lng - coords1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
  }

  /**
   * Calcula la ruta óptima entre dos coordenadas usando Google Maps Directions Service.
   * Si falla, devuelve un fallback estimado en línea recta.
   */
  static async calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
    mode: 'DRIVING' | 'WALKING' | 'TRANSIT' = 'DRIVING'
  ): Promise<RouteMetrics> {
    const cacheKey = this.getCacheKey(origin, destination, mode);
    
    // Retornar de la caché si existe
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    // Comprobar si estamos en entorno cliente y google maps está cargado
    if (typeof window === 'undefined' || !window.google || !window.google.maps) {
      return this.getFallbackRoute(origin, destination, mode, 'Google Maps SDK no disponible');
    }

    try {
      const directionsService = new google.maps.DirectionsService();
      
      const travelModeMap = {
        DRIVING: google.maps.TravelMode.DRIVING,
        WALKING: google.maps.TravelMode.WALKING,
        TRANSIT: google.maps.TravelMode.TRANSIT
      };

      return await new Promise<RouteMetrics>((resolve, reject) => {
        directionsService.route(
          {
            origin: new google.maps.LatLng(origin.lat, origin.lng),
            destination: new google.maps.LatLng(destination.lat, destination.lng),
            travelMode: travelModeMap[mode],
            provideRouteAlternatives: false
          },
          (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result && result.routes[0]) {
              const route = result.routes[0];
              const leg = route.legs[0];

              const metrics: RouteMetrics = {
                distanceMeters: leg.distance?.value || 0,
                durationSeconds: leg.duration?.value || 0,
                distanceText: leg.distance?.text || '0 km',
                durationText: leg.duration?.text || '0 min',
                mode,
                polyline: route.overview_polyline || undefined
              };

              // Guardar en caché
              this.cache[cacheKey] = metrics;
              resolve(metrics);
            } else {
              reject(new Error(`Directions status: ${status}`));
            }
          }
        );
      });
    } catch (err: any) {
      console.warn('[RouteEngine] Error calculando ruta real, usando fallback:', err.message);
      return this.getFallbackRoute(origin, destination, mode, err.message);
    }
  }

  /**
   * Genera un resultado de ruta aproximado (línea recta) si falla el servicio.
   */
  private static getFallbackRoute(
    origin: Coordinates,
    destination: Coordinates,
    mode: 'DRIVING' | 'WALKING' | 'TRANSIT',
    reason: string
  ): RouteMetrics {
    const distanceMeters = this.calculateHaversineDistance(origin, destination);
    
    // Velocidades estimadas en m/s (coche: 11 m/s (~40km/h), andar: 1.4 m/s (~5km/h), tránsito: 8 m/s)
    let speed = 11;
    if (mode === 'WALKING') speed = 1.4;
    if (mode === 'TRANSIT') speed = 8;

    const durationSeconds = Math.round(distanceMeters / speed);
    const distanceKm = (distanceMeters / 1000).toFixed(1);
    const durationMin = Math.round(durationSeconds / 60);

    return {
      distanceMeters,
      durationSeconds,
      distanceText: `${distanceKm} km`,
      durationText: `${durationMin} min`,
      mode,
      // No devolvemos polyline para que el mapa trace una línea recta directa
      polyline: undefined
    };
  }
}
