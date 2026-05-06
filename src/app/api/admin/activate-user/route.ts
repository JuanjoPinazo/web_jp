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
        require_password_change: true,
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      // Non-fatal: the password was set, just warn
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
