'use server';

import { getActiveAlerts, markAlertAsRead, generatePlanAlerts } from '@/modules/alerts/alert-engine';
import { FullTravelPlan } from '@/hooks/useTravelPlans';

export async function fetchAlertsAction(planId: string, profileId: string) {
  try {
    return await getActiveAlerts(planId, profileId);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }
}

export async function processPlanAlertsAction(plan: FullTravelPlan, profileId: string) {
  try {
    await generatePlanAlerts(plan, profileId);
    return { success: true };
  } catch (error) {
    console.error('Error processing alerts:', error);
    return { success: false, error };
  }
}

export async function markAlertAsReadAction(alertId: string) {
  try {
    await markAlertAsRead(alertId);
    return { success: true };
  } catch (error) {
    console.error('Error marking alert as read:', error);
    return { success: false, error };
  }
}
