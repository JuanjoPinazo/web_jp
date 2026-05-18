'use server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resend } from '@/lib/resend';
import { buildTravelDossierData } from '@/modules/travel-dossier/dossier-builder';
import { getTravelDossierAttachments } from '@/modules/travel-dossier/attachment-engine';
import { renderTravelDossierEmailHtml } from '@/modules/travel-dossier/email-renderer';

export interface SendEmailResponse {
  success: boolean;
  emailId?: string;
  recipient?: string;
  error?: string;
}

/**
 * Server Action: Generates, packages, and sends the premium digital travel dossier
 * to the specified user with systematically organized attachments and log auditing.
 */
export async function sendTravelDossierEmail(planId: string, profileId: string): Promise<SendEmailResponse> {
  const supabase = getSupabaseAdmin();
  let recipientEmail = 'Desconocido';
  let attachmentsCount = 0;

  try {
    if (!planId || !profileId) {
      throw new Error('planId y profileId son campos obligatorios.');
    }

    console.log(`[ServerAction] Starting Digital Travel Dossier Email flow for plan: ${planId}, user: ${profileId}`);

    // 1. Gather dossier logistics data
    const dossierData = await buildTravelDossierData(planId);
    recipientEmail = dossierData.userEmail;

    if (!recipientEmail) {
      throw new Error('El perfil de usuario asociado al plan no contiene una dirección de correo electrónico.');
    }

    // 2. Fetch, sort, download, and professionally rename attachments
    const attachments = await getTravelDossierAttachments(planId);
    attachmentsCount = attachments.length;

    // 3. Render premium dark luxury HTML
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jpintelligence.vercel.app';
    const html = renderTravelDossierEmailHtml(dossierData, siteUrl);

    // 4. Send email using Resend
    console.log(`[ServerAction] Triggering email delivery via Resend to: ${recipientEmail} with ${attachmentsCount} attachments.`);
    
    // Map our custom DossierAttachment to Resend Attachment schema
    const resendAttachments = attachments.map(att => ({
      filename: att.filename,
      content: att.content
    }));

    const { data: resendData, error: resendError } = await resend.emails.send({
      from: 'JP Intelligence <operaciones@quilprocardio.com>',
      to: [recipientEmail],
      subject: `Tu Dossier Digital de Viaje Exclusivo — ${dossierData.eventName}`,
      html,
      attachments: resendAttachments
    });

    if (resendError) {
      console.error('[ServerAction] Resend integration failed:', resendError);
      throw new Error(`Error en el envío de correo (Resend): ${resendError.message}`);
    }

    console.log(`[ServerAction] Email sent successfully. Resend ID: ${resendData?.id}`);

    // 5. Audit log: Success
    const { error: logError } = await supabase
      .from('travel_email_logs')
      .insert({
        plan_id: planId,
        profile_id: profileId,
        recipient_email: recipientEmail,
        attachments_count: attachmentsCount,
        status: 'sent',
        error: null
      });

    if (logError) {
      console.error('[ServerAction] Failed to save audit log to DB:', logError.message);
    }

    return {
      success: true,
      emailId: resendData?.id,
      recipient: recipientEmail
    };

  } catch (err: any) {
    console.error(`[ServerAction] Critical failure in sendTravelDossierEmail:`, err);
    
    // 6. Audit log: Failure (if we could at least resolve profileId and planId)
    if (planId && profileId) {
      try {
        const { error: logError } = await supabase
          .from('travel_email_logs')
          .insert({
            plan_id: planId,
            profile_id: profileId,
            recipient_email: recipientEmail,
            attachments_count: attachmentsCount,
            status: 'failed',
            error: err.message || 'Error desconocido'
          });

        if (logError) {
          console.error('[ServerAction] Failed to save failure audit log to DB:', logError.message);
        }
      } catch (logErr) {
        console.error('[ServerAction] Error inserting failure log:', logErr);
      }
    }

    return {
      success: false,
      recipient: recipientEmail,
      error: err.message || 'Ocurrió un error inesperado al procesar el dossier de viaje.'
    };
  }
}
