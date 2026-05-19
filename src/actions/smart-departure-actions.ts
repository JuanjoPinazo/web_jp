'use server';

import { calculateRecommendedDeparture } from '@/modules/smart-departure/smart-departure.service';
import { DepartureCalculationParams, RecommendedDeparture } from '@/modules/smart-departure/types';

export async function calculateRecommendedDepartureAction(
  params: DepartureCalculationParams
): Promise<{ success: boolean; data?: RecommendedDeparture; error?: string }> {
  try {
    // Deserialize Date from client-side transition
    const formattedParams = {
      ...params,
      targetArrivalTime: new Date(params.targetArrivalTime)
    };
    
    const data = await calculateRecommendedDeparture(formattedParams);
    return { success: true, data };
  } catch (error: any) {
    console.error('[calculateRecommendedDepartureAction] Error calculating smart departure:', error);
    return { success: false, error: error.message || 'Error al calcular la salida inteligente.' };
  }
}
