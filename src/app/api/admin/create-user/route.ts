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

    // 2. Invite User via Email
    const { data: inviteData, error: inviteError } = await getSupabaseAdmin().auth.admin.inviteUserByEmail(email, {
      data: {
        name: name || 'Usuario',
        surname: surname || '',
        role: role || 'client',
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://jpintelligence.vercel.app'}/set-password`
    });
    
    if (inviteError || !inviteData || !inviteData.user) {
      return NextResponse.json({ error: inviteError?.message || 'Error al invitar usuario' }, { status: 400 });
    }

    // Since we are using inviteUserByEmail, Supabase sends its own email.
    // However, if you want to use YOUR custom Resend email, we need the link.
    // BUT inviteUserByEmail doesn't return the link easily (it sends it).
    
    // If you want to keep the custom Resend email, I will stick to generateLink 
    // BUT I will fix the redirectTo logic.
    
    // Wait, the user wants inviteUserByEmail. I will use it.
    // Note: This will trigger Supabase's default email unless configured otherwise.
    
    const user = inviteData.user;

    // 3. Create or update profile in the database
    const { error: profileError } = await getSupabaseAdmin()
      .from('profiles')
      .upsert({
        id: user.id,
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

    // 4. Send Custom Email via Resend (Optional, but inviteUserByEmail already sent one)
    // If you want to use YOUR custom email, you should use generateLink instead.
    // Since inviteUserByEmail is chosen, we let Supabase handle the email.

    return NextResponse.json({ success: true, user: inviteData.user });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
