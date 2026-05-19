import { supabase } from '@/lib/supabase';
import { SupportRequest, SupportRequestInput } from './support-types';
import { sendPushToProfile } from '@/modules/push/push-service';

export class SupportService {
  /**
   * Crea una nueva solicitud de soporte y genera alertas internas para los administradores.
   */
  static async createSupportRequest(input: SupportRequestInput): Promise<SupportRequest> {
    const { data: request, error } = await supabase
      .from('support_requests')
      .insert({
        plan_id: input.plan_id || null,
        profile_id: input.profile_id,
        coordinator_id: input.coordinator_id || null,
        type: input.type,
        title: input.title,
        message: input.message || '',
        priority: input.priority || 'normal',
        related_entity: input.related_entity || null,
        related_entity_id: input.related_entity_id || null,
        status: 'open',
        metadata: input.metadata || {}
      })
      .select('*, profiles:profile_id(*), logistic_contacts:coordinator_id(*)')
      .single();

    if (error) {
      console.error('[SupportService] Error creating support request:', error);
      throw error;
    }

    // Generar alertas internas para administradores
    try {
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        const alerts = admins.map(admin => ({
          plan_id: input.plan_id || '00000000-0000-0000-0000-000000000000',
          profile_id: admin.id,
          type: 'document', // Tipo genérico
          title: `Incidencia: ${input.title}`,
          message: `Nuevo reporte del cliente: "${input.message || ''}"`,
          priority: input.priority === 'urgent' ? 'urgent' : 'high',
          action_label: 'Ver Soporte',
          action_url: '/admin/support',
          metadata: { support_request_id: request.id }
        }));

        const { error: alertErr } = await supabase.from('alerts').insert(alerts);
        if (alertErr) {
          console.warn('[SupportService] Could not insert admin alerts:', alertErr.message);
        }

        // Enviar push notification a cada administrador en tiempo real
        for (const admin of admins) {
          try {
            await sendPushToProfile(admin.id, {
              title: `Incidencia: ${input.title}`,
              body: `Nuevo reporte: "${input.message || ''}"`,
              data: { url: '/admin/support' }
            });
          } catch (pushErr) {
            console.error('[SupportService] Failed to send admin push notification:', pushErr);
          }
        }
      }
    } catch (alertEx) {
      console.error('[SupportService] Failed to notify admins:', alertEx);
    }

    return request as SupportRequest;
  }

  /**
   * Obtiene las solicitudes de soporte para un usuario específico.
   */
  static async getSupportRequestsForUser(profileId: string): Promise<SupportRequest[]> {
    const { data, error } = await supabase
      .from('support_requests')
      .select('*, profiles:profile_id(*), logistic_contacts:coordinator_id(*)')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SupportService] Error fetching support requests for user:', error);
      throw error;
    }

    return data as SupportRequest[];
  }

  /**
   * Obtiene todas las solicitudes de soporte para la vista de administración.
   */
  static async getSupportRequestsForAdmin(): Promise<SupportRequest[]> {
    const { data, error } = await supabase
      .from('support_requests')
      .select('*, profiles:profile_id(*), logistic_contacts:coordinator_id(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SupportService] Error fetching support requests for admin:', error);
      throw error;
    }

    return data as SupportRequest[];
  }

  /**
   * Actualiza el estado de una incidencia de soporte.
   */
  static async updateSupportRequestStatus(
    id: string,
    status: 'open' | 'resolved',
    notes?: string
  ): Promise<SupportRequest> {
    const updateData: any = {
      status,
      resolved_at: status === 'resolved' ? new Date().toISOString() : null
    };

    if (notes) {
      // Agregar notas internas en el jsonb de metadata
      const { data: current } = await supabase
        .from('support_requests')
        .select('metadata')
        .eq('id', id)
        .single();

      const currentMetadata = current?.metadata || {};
      const internalNotes = currentMetadata.internal_notes || [];
      
      internalNotes.push({
        note: notes,
        added_at: new Date().toISOString()
      });

      updateData.metadata = {
        ...currentMetadata,
        internal_notes: internalNotes
      };
    }

    const { data, error } = await supabase
      .from('support_requests')
      .update(updateData)
      .eq('id', id)
      .select('*, profiles:profile_id(*), logistic_contacts:coordinator_id(*)')
      .single();

    if (error) {
      console.error('[SupportService] Error updating support request status:', error);
      throw error;
    }

    return data as SupportRequest;
  }

  /**
   * Asigna un coordinador a una incidencia de soporte.
   */
  static async assignCoordinator(id: string, coordinatorId: string | null): Promise<SupportRequest> {
    const { data, error } = await supabase
      .from('support_requests')
      .update({ coordinator_id: coordinatorId })
      .eq('id', id)
      .select('*, profiles:profile_id(*), logistic_contacts:coordinator_id(*)')
      .single();

    if (error) {
      console.error('[SupportService] Error assigning coordinator:', error);
      throw error;
    }

    return data as SupportRequest;
  }
}
