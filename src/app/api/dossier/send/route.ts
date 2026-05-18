import { NextRequest, NextResponse } from 'next/server';
import { sendTravelDossierEmail } from '@/actions/travel-dossier-actions';
import { buildTravelDossierData } from '@/modules/travel-dossier/dossier-builder';
import { getTravelDossierAttachments } from '@/modules/travel-dossier/attachment-engine';
import { renderTravelDossierEmailHtml } from '@/modules/travel-dossier/email-renderer';
import { resend } from '@/lib/resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, profileId, testEmail, attachmentIds } = body;

    if (!planId || !profileId) {
      return NextResponse.json({ error: 'planId y profileId son obligatorios' }, { status: 400 });
    }

    // Test send: override recipient without audit log
    if (testEmail) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
      const dossierData = await buildTravelDossierData(planId);
      const allAttachments = await getTravelDossierAttachments(planId);

      // Filter to selected attachments if provided
      const attachments = attachmentIds?.length
        ? allAttachments.filter((_: any, i: number) => attachmentIds.includes(i))
        : allAttachments;

      const html = await renderTravelDossierEmailHtml(dossierData, siteUrl);

      const { data, error } = await resend.emails.send({
        from: 'JP Intelligence <operaciones@quilprocardio.com>',
        to: [testEmail],
        subject: `[TEST] Dossier Digital — ${dossierData.eventName}`,
        html,
        attachments: attachments.map((a: any) => ({ filename: a.filename, content: a.content }))
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, emailId: data?.id, recipient: testEmail });
    }

    // Regular send via server action
    const result = await sendTravelDossierEmail(planId, profileId, attachmentIds);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET: return last email log entries for a plan
export async function GET(request: NextRequest) {
  const planId = request.nextUrl.searchParams.get('planId');
  if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('travel_email_logs')
    .select('id, created_at, recipient_email, status, attachments_count, error')
    .eq('plan_id', planId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data || [] });
}
