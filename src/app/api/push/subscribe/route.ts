import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const { subscription, profileId } = await req.json();

    if (!subscription || !profileId) {
      return NextResponse.json({ error: 'Faltan datos de suscripción' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Guardar o actualizar suscripción
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        profile_id: profileId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: req.headers.get('user-agent'),
        last_used_at: new Date().toISOString()
      }, { onConflict: 'endpoint' });

    if (error) {
      console.error('Error saving subscription to Supabase:', error);
      return NextResponse.json({ 
        error: 'Error al guardar suscripción', 
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
