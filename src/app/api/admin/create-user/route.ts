import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// GET handler for testing connectivity
export async function GET() {
  return NextResponse.json({ message: 'API de creación de usuarios activa' });
}

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 });
    }

    const { email, name, surname, role, client_id, phone } = body;

    if (!email) {
      return NextResponse.json({ error: 'El email es obligatorio' }, { status: 400 });
    }

    // 1. Verify authorization (Check if requester is admin)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado - Sin cabecera' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user: requester }, error: authError } = await supabase.auth.getUser();
    if (authError || !requester) {
      return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 });
    }

    // Check role in profiles
    const { data: profile, error: profileFetchError } = await getSupabaseAdmin()
      .from('profiles')
      .select('role')
      .eq('id', requester.id)
      .single();

    if (profileFetchError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    // 2. Generate Invitation Link
    const { data: inviteData, error: linkError } = await getSupabaseAdmin().auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: {
          name: name || 'Usuario',
          surname: surname || '',
          role: role || 'client',
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login`
      }
    });
    
    if (linkError || !inviteData) {
      return NextResponse.json({ error: linkError?.message || 'Error al generar link' }, { status: 400 });
    }

    const invitationLink = inviteData.properties.action_link;

    // 3. Create or update profile in the database
    const { error: profileError } = await getSupabaseAdmin()
      .from('profiles')
      .upsert({
        id: inviteData.user.id,
        email: email,
        nombre: name || 'Usuario',
        apellidos: surname || '',
        role: role || 'client',
        client_id: client_id || null,
        telefono: phone || null
      }, { onConflict: 'id' });

    if (profileError) {
      return NextResponse.json({ error: 'Usuario creado pero fallo el perfil: ' + profileError.message }, { status: 500 });
    }

    // 4. Send Custom Email via Resend
    try {
      const { resend } = await import('@/lib/resend');
      await resend.emails.send({
        from: 'JP Intelligence <operaciones@jpinazo.com>',
        to: [email],
        subject: 'Invitación a JP Intelligence Operational Platform',
        html: `
          <div style="font-family: sans-serif; background-color: #050505; color: #ffffff; padding: 40px; border-radius: 20px; max-width: 600px; margin: auto;">
            <div style="text-align: center; margin-bottom: 40px;">
              <h1 style="font-size: 24px; font-weight: 900; letter-spacing: -1px; margin: 0; text-transform: uppercase;">JP Intelligence</h1>
              <p style="font-size: 10px; color: #666; letter-spacing: 2px; text-transform: uppercase; margin-top: 5px;">Operational Excellence</p>
            </div>
            
            <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 20px;">Hola, ${name || 'Usuario'}.</h2>
            
            <p style="font-size: 14px; line-height: 1.6; color: #aaa; margin-bottom: 30px;">
              Has sido invitado a unirte a la plataforma operacional de **JP Intelligence**. Desde aquí podrás gestionar toda tu logística, itinerarios y dossiers exclusivos de forma integral.
            </p>
            
            <div style="background-color: #111; padding: 20px; border-radius: 15px; margin-bottom: 30px; border: 1px solid #222;">
              <p style="font-size: 12px; font-weight: bold; color: #00e5ff; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Detalles de Acceso</p>
              <p style="font-size: 13px; color: #fff; margin: 5px 0;"><strong>Usuario:</strong> ${email}</p>
              <p style="font-size: 13px; color: #fff; margin: 5px 0;"><strong>Rol:</strong> ${role === 'admin' ? 'Administrador' : 'Cliente Premium'}</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${invitationLink}" style="display: inline-block; background-color: #00e5ff; color: #000; padding: 18px 35px; border-radius: 12px; text-decoration: none; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                Activar mi Acceso
              </a>
            </div>
            
            <p style="font-size: 11px; color: #444; text-align: center; margin-top: 40px; line-height: 1.5;">
              Este enlace de invitación expirará pronto. Si no esperabas esta invitación, puedes ignorar este mensaje.<br>
              © 2026 JP Intelligence Platform.
            </p>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Error sending Resend email:', emailErr);
      // We don't fail the whole request if email fails, but we should log it
    }

    return NextResponse.json({ success: true, user: inviteData.user });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
