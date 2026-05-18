'use server';

import { runLiveTravelEvaluation } from '@/modules/live-travel/live-engine';
import { LiveEvaluationResult } from '@/modules/live-travel/types';

export async function getLiveTravelStatusAction(planId: string): Promise<{ success: boolean; data?: LiveEvaluationResult; error?: string }> {
  try {
    if (!planId) {
      return { success: false, error: 'ID de plan no proporcionado.' };
    }
    const data = await runLiveTravelEvaluation(planId);
    return { success: true, data };
  } catch (error: any) {
    console.error('[getLiveTravelStatusAction] Error evaluating live travel:', error);
    return { success: false, error: error.message || 'Error al evaluar el estado del viaje en vivo.' };
  }
}
