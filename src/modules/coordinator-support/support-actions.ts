'use server';

import { supabase } from '@/lib/supabase';
import { SupportService } from './support.service';
import { SupportRequestInput } from './support-types';

export async function createSupportRequestAction(input: SupportRequestInput) {
  try {
    const request = await SupportService.createSupportRequest(input);
    return { success: true, request };
  } catch (error: any) {
    console.error('[support-actions] createSupportRequestAction failed:', error);
    return { success: false, error: error.message || 'Error desconocido' };
  }
}

export async function getSupportRequestsForUserAction(profileId: string) {
  try {
    const requests = await SupportService.getSupportRequestsForUser(profileId);
    return { success: true, requests };
  } catch (error: any) {
    console.error('[support-actions] getSupportRequestsForUserAction failed:', error);
    return { success: false, error: error.message || 'Error desconocido' };
  }
}

export async function getSupportRequestsForAdminAction() {
  try {
    const requests = await SupportService.getSupportRequestsForAdmin();
    return { success: true, requests };
  } catch (error: any) {
    console.error('[support-actions] getSupportRequestsForAdminAction failed:', error);
    return { success: false, error: error.message || 'Error desconocido' };
  }
}

export async function updateSupportRequestStatusAction(
  id: string,
  status: 'open' | 'resolved',
  notes?: string
) {
  try {
    const request = await SupportService.updateSupportRequestStatus(id, status, notes);
    return { success: true, request };
  } catch (error: any) {
    console.error('[support-actions] updateSupportRequestStatusAction failed:', error);
    return { success: false, error: error.message || 'Error desconocido' };
  }
}

export async function assignCoordinatorAction(id: string, coordinatorId: string | null) {
  try {
    const request = await SupportService.assignCoordinator(id, coordinatorId);
    return { success: true, request };
  } catch (error: any) {
    console.error('[support-actions] assignCoordinatorAction failed:', error);
    return { success: false, error: error.message || 'Error desconocido' };
  }
}

export async function getCoordinatorsAction() {
  try {
    const { data: coordinators, error } = await supabase
      .from('logistic_contacts')
      .select('*')
      .order('name');
    if (error) throw error;
    return { success: true, coordinators };
  } catch (error: any) {
    console.error('[support-actions] getCoordinatorsAction failed:', error);
    return { success: false, error: error.message || 'Error desconocido' };
  }
}
