'use server';

import { buildTravelTimeline, TravelTimelineEvent } from '@/core/services/travel-timeline.service';

/**
 * Server Action: Exposes the single source of truth for travel timelines
 * to the client side.
 */
export async function getTravelTimelineAction(planId: string): Promise<{ success: boolean; data?: TravelTimelineEvent[]; error?: string }> {
  try {
    if (!planId) {
      return { success: false, error: 'ID de plan no proporcionado.' };
    }
    const timeline = await buildTravelTimeline(planId);
    return { success: true, data: timeline };
  } catch (error: any) {
    console.error('[getTravelTimelineAction] Error:', error);
    return { success: false, error: error.message || 'Error al obtener el timeline de viaje.' };
  }
}
