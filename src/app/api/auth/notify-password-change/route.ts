import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    const { data: profile } = await getSupabaseAdmin()
      .from('profiles')
      .select('nombre, apellidos, email')
      .eq('id', user.id)
      .single();

    // Notify Admin via Resend
    const { resend } = await import('@/lib/resend');
    await resend.emails.send({
      from: 'JP Intelligence System <operaciones@quilprocardio.com>',
      to: ['juanjo.pinazo@quilprocardio.com'],
      subject: `Notificación: Cambio de Contraseña - ${profile?.nombre || user.email}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2 style="color: #00e5ff;">Notificación de Seguridad</h2>
          <p>El usuario <strong>${profile?.nombre} ${profile?.apellidos}</strong> (${user.email}) ha actualizado su contraseña de acceso.</p>
          <p>Este cambio se ha realizado correctamente desde la página de configuración de contraseña.</p>
          <hr />
          <p style="font-size: 10px; color: #888;">Este es un mensaje automático de control de JP Intelligence.</p>
        </div>
      `
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Notify password change error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
