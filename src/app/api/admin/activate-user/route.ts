import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, temporaryPassword } = body;

    if (!userId || !temporaryPassword) {
      return NextResponse.json(
        { error: 'userId y temporaryPassword son obligatorios' },
        { status: 400 }
      );
    }

    // 1. Verify the requester is an admin
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
      return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 });
    }

    const { data: profile, error: profileFetchError } = await getSupabaseAdmin()
      .from('profiles')
      .select('role')
      .eq('id', requester.id)
      .single();

    if (profileFetchError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    // 2. Set the temporary password using Supabase Admin SDK
    const { data: updatedUser, error: updateError } = await getSupabaseAdmin()
      .auth.admin.updateUserById(userId, {
        password: temporaryPassword,
        email_confirm: true, // Ensure the email is confirmed so they can log in
      });

    if (updateError) {
      return NextResponse.json(
        { error: 'Error al establecer contraseña: ' + updateError.message },
        { status: 500 }
      );
    }

    // 3. Mark profile as active and flag that password change is required on first login
    const { error: profileError } = await getSupabaseAdmin()
      .from('profiles')
      .update({
        onboarding_status: 'active',
        temp_password: temporaryPassword
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      return NextResponse.json(
        { error: 'Error al actualizar el estado del perfil: ' + profileError.message },
        { status: 500 }
      );
    }

    // 4. Send Premium Email with credentials
    try {
      const { resend } = await import('@/lib/resend');
      const { data: userProfile } = await getSupabaseAdmin()
        .from('profiles')
        .select('nombre, email')
        .eq('id', userId)
        .single();

      if (userProfile?.email) {
        await resend.emails.send({
          from: 'JP Intelligence <operaciones@quilprocardio.com>',
          to: [userProfile.email],
          subject: 'Acceso a JP Intelligence | Tus credenciales están listas',
          html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #000000; color: #ffffff; padding: 0; margin: 0; width: 100%;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #050505; border: 1px solid #1a1a1a;">
                <!-- Header -->
                <div style="padding: 40px 20px; text-align: center; border-bottom: 1px solid #1a1a1a;">
                  <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -1px; margin: 0; text-transform: uppercase; color: #ffffff;">JP Intelligence</h1>
                  <p style="font-size: 10px; color: #00e5ff; letter-spacing: 4px; text-transform: uppercase; margin: 10px 0 0 0; font-weight: 700;">Operational Access</p>
                </div>

                <!-- Main Content -->
                <div style="padding: 50px 40px; text-align: center;">
                  <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 20px; line-height: 1.1;">Tu Dossier está Activado.</h2>
                  <p style="font-size: 14px; line-height: 1.6; color: #888; margin-bottom: 30px;">
                    Hola, ${userProfile.nombre || 'Usuario'}. Tu cuenta ha sido activada por la dirección de operaciones. Ya puedes acceder a tu plataforma logística con las siguientes credenciales temporales:
                  </p>
                  
                  <div style="background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 16px; padding: 25px; margin: 30px 0; text-align: left;">
                    <p style="margin: 0 0 15px 0; font-size: 12px; color: #444; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Credenciales de Acceso:</p>
                    <div style="margin-bottom: 10px;">
                      <span style="color: #666; font-size: 11px; text-transform: uppercase;">Usuario:</span>
                      <p style="margin: 5px 0 0 0; font-family: monospace; color: #ffffff; font-weight: 700; font-size: 14px;">${userProfile.email}</p>
                    </div>
                    <div>
                      <span style="color: #666; font-size: 11px; text-transform: uppercase;">Contraseña Temporal:</span>
                      <p style="margin: 5px 0 0 0; font-family: monospace; color: #00e5ff; font-weight: 900; font-size: 16px; letter-spacing: 1px;">${temporaryPassword}</p>
                    </div>
                  </div>

                  <div style="text-align: center; margin: 40px 0;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://jpintelligence.vercel.app'}/login" style="display: inline-block; background-color: #00e5ff; color: #000000; padding: 18px 40px; border-radius: 12px; text-decoration: none; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">
                      Entrar en la Plataforma
                    </a>
                  </div>

                  <p style="font-size: 11px; color: #555; font-style: italic;">
                    * Por motivos de seguridad, se te pedirá cambiar esta contraseña inmediatamente después de tu primer acceso.
                  </p>
                </div>

                <!-- Footer -->
                <div style="padding: 40px; text-align: center; background-color: #020202; border-top: 1px solid #1a1a1a;">
                  <p style="font-size: 10px; color: #333; text-transform: uppercase; letter-spacing: 1px; margin: 0;">
                    © 2026 JP Intelligence Platform | Private & Confidential
                  </p>
                </div>
              </div>
            </div>
          `
        });
      }
    } catch (emailErr) {
      console.error('Failed to send activation email:', emailErr);
      // We don't block the response if email fails, as the user is already activated in DB
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario activado con contraseña temporal.',
      user: updatedUser.user,
    });
  } catch (error: any) {
    console.error('API activate-user error:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
