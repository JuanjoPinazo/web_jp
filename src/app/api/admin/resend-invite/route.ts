import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, name, role } = body;

    if (!userId || !email) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    // 1. Verify authorization (Check if requester is admin)
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

    const { data: { user: requester }, error: authError } = await supabase.auth.getUser();
    if (authError || !requester) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    const { data: profile } = await getSupabaseAdmin()
      .from('profiles')
      .select('role')
      .eq('id', requester.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    // 2. Check user status in Auth
    const { data: { user: authUser }, error: getUserError } = await getSupabaseAdmin().auth.admin.getUserById(userId);
    
    if (getUserError || !authUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // If user is already confirmed, don't send invitation, just inform
    if (authUser.email_confirmed_at) {
      return NextResponse.json({ 
        success: false,
        message: 'ESTADO_ACTIVO',
        info: 'Este usuario ya ha activado su cuenta anteriormente.' 
      });
    }

    // 3. Generate Invitation Link
    const { data: inviteData, error: linkError } = await getSupabaseAdmin().auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://jpintelligence.vercel.app'}/set-password`
      }
    });
    
    if (linkError || !inviteData) {
      return NextResponse.json({ error: linkError?.message || 'Error al generar link' }, { status: 400 });
    }

    const invitationLink = inviteData.properties.action_link;

    // 4. Send Premium Email via Resend
    const { resend } = await import('@/lib/resend');
    await resend.emails.send({
      from: 'JP Intelligence <operaciones@quilprocardio.com>',
      to: [email],
      subject: 'Bienvenido a JP Intelligence | Tu Dossier Operativo está listo',
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #000000; color: #ffffff; padding: 0; margin: 0; width: 100%;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #050505; border: 1px solid #1a1a1a;">
            <!-- Header -->
            <div style="padding: 40px 20px; text-align: center; border-bottom: 1px solid #1a1a1a;">
              <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -1px; margin: 0; text-transform: uppercase; color: #ffffff;">JP Intelligence</h1>
              <p style="font-size: 10px; color: #00e5ff; letter-spacing: 4px; text-transform: uppercase; margin: 10px 0 0 0; font-weight: 700;">Operational Platform</p>
            </div>

            <!-- Hero Section -->
            <div style="padding: 50px 40px; text-align: center;">
              <h2 style="font-size: 32px; font-weight: 800; margin-bottom: 20px; line-height: 1.1;">Bienvenido a la Excelencia Operativa.</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #888; margin-bottom: 30px;">
                Hola, ${name || 'Usuario'}. Has sido seleccionado para acceder a la plataforma de gestión logística integral de **JP Intelligence**.
              </p>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${invitationLink}" style="display: inline-block; background-color: #00e5ff; color: #000000; padding: 20px 45px; border-radius: 12px; text-decoration: none; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 10px 20px rgba(0, 229, 255, 0.2);">
                  Activar mi Cuenta Premium
                </a>
              </div>
            </div>

            <!-- Features / Instructions -->
            <div style="padding: 0 40px 50px 40px;">
              <div style="background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 24px; padding: 30px;">
                <h3 style="font-size: 12px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; border-bottom: 1px solid #1a1a1a; padding-bottom: 15px;">Cómo proceder:</h3>
                
                <div style="margin-bottom: 20px;">
                  <p style="font-size: 13px; color: #ffffff; font-weight: 700; margin-bottom: 5px;">1. Activación de Seguridad</p>
                  <p style="font-size: 12px; color: #666; margin: 0;">Pulsa el botón superior para verificar tu identidad y establecer tu contraseña de acceso.</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                  <p style="font-size: 13px; color: #ffffff; font-weight: 700; margin-bottom: 5px;">2. Gestión de Itinerarios</p>
                  <p style="font-size: 12px; color: #666; margin: 0;">Accede a tu panel para visualizar vuelos, hoteles y traslados asignados en tiempo real.</p>
                </div>
                
                <div>
                  <p style="font-size: 13px; color: #ffffff; font-weight: 700; margin-bottom: 5px;">3. Soporte Concierge 24/7</p>
                  <p style="font-size: 12px; color: #666; margin: 0;">Tendrás línea directa con nuestro equipo de operaciones para cualquier ajuste en tu logística.</p>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div style="padding: 40px; text-align: center; background-color: #020202; border-top: 1px solid #1a1a1a;">
              <p style="font-size: 11px; color: #444; line-height: 1.6; margin: 0;">
                Este es un mensaje automático del sistema de operaciones de JP Intelligence.<br>
                Si tienes problemas para acceder, contacta con <a href="mailto:juanjo.pinazo@quilprocardio.com" style="color: #00e5ff; text-decoration: none;">juanjo.pinazo@quilprocardio.com</a>
              </p>
              <p style="font-size: 10px; color: #333; margin-top: 20px; text-transform: uppercase; letter-spacing: 1px;">
                © 2026 JP Intelligence Platform | Private & Confidential
              </p>
            </div>
          </div>
        </div>
      `
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
