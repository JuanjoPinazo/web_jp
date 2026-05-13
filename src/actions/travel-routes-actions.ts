'use server';

import { GoogleMapsService } from '@/core/services/google-maps.service';
import { TravelMode } from '@/core/types/geo';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

interface CalculateRouteParams {
  planId: string;
  originLabel: string;
  originLat: number;
  originLng: number;
  destinationLabel: string;
  destinationLat: number;
  destinationLng: number;
  travelMode: TravelMode;
}

/**
 * Calculates a route between two points and caches it in travel_routes.
 * Specifically linked to a planId for easy retrieval.
 */
export async function calculateRouteAction(params: CalculateRouteParams) {
  const { 
    planId, 
    originLabel, originLat, originLng, 
    destinationLabel, destinationLat, destinationLng, 
    travelMode 
  } = params;

  if (!originLat || !originLng || !destinationLat || !destinationLng) {
    return { success: false, error: 'Faltan coordenadas para calcular esta ruta.' };
  }

  try {
    const route = await GoogleMapsService.getRoute(
      { lat: originLat, lng: originLng },
      { lat: destinationLat, lng: destinationLng },
      travelMode
    );

    if (!route) {
      return { success: false, error: 'No se pudo obtener respuesta de Google Maps.' };
    }

    const supabase = getSupabaseAdmin();
    
    // Explicitly update the metadata for this plan
    // We use a range or precision-safe check if possible, but for now we'll update the most recent one 
    // that matches these coordinates and travel mode.
    const { error: updateError } = await supabase.from('travel_routes')
      .update({
        plan_id: planId,
        origin_label: originLabel,
        destination_label: destinationLabel,
        updated_at: new Date().toISOString()
      })
      .match({
        origin_lat: originLat,
        origin_lng: originLng,
        destination_lat: destinationLat,
        destination_lng: destinationLng,
        travel_mode: travelMode
      });

    if (updateError) {
      console.warn('[calculateRouteAction] Update Warning:', updateError.message);
      // Even if update fails, we might have the route in result
    }

    return { success: true, route };
  } catch (error: any) {
    console.error('[calculateRouteAction] Error:', error.message);
    return { success: false, error: error.message || 'Error al calcular la ruta.' };
  }
}

/**
 * Calculates multiple travel modes for a single route.
 */
export async function calculateMultiModeRouteAction(params: Omit<CalculateRouteParams, 'travelMode'>) {
  const modes: TravelMode[] = ['WALKING', 'DRIVING', 'TRANSIT'];
  const results = [];
  let lastError = 'No se encontraron rutas disponibles.';

  for (const mode of modes) {
    try {
      console.log(`[MultiMode] Calculating ${mode} for Plan ${params.planId}...`);
      const res = await calculateRouteAction({ ...params, travelMode: mode });
      if (res.success && res.route) {
        results.push(res.route);
        console.log(`[MultiMode] ${mode} OK: ${res.route.duration_text}`);
      } else {
        console.warn(`[MultiMode] ${mode} FAILED: ${res.error}`);
        lastError = `${mode}: ${res.error}`;
      }
    } catch (e: any) {
      console.error(`[MultiMode] Exception in ${mode}:`, e.message);
      lastError = e.message;
    }
  }

  return { 
    success: results.length > 0, 
    routes: results,
    error: results.length === 0 ? lastError : undefined
  };
}

/**
 * Retrieves all cached routes for a specific plan.
 */
export async function getPlanRoutesAction(planId: string) {
  if (!planId) return { success: false, error: 'ID de plan no proporcionado.' };

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('travel_routes')
      .select('*')
      .eq('plan_id', planId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, routes: data || [] };
  } catch (error: any) {
    console.error('[getPlanRoutesAction] Error:', error.message);
    return { success: false, error: error.message || 'Error al obtener rutas del plan.' };
  }
}
