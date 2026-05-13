import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, surname, email, role, client_id, company_id, user_type, phone, avatar_url } = body;

    if (!userId) {
      return NextResponse.json({ error: 'ID de usuario es obligatorio' }, { status: 400 });
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

    // Check role in profiles
    const { data: profile } = await getSupabaseAdmin()
      .from('profiles')
      .select('role')
      .eq('id', requester.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    // 2. Check if email changed to reset password
    const { data: oldProfile } = await getSupabaseAdmin()
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    const emailChanged = oldProfile && oldProfile.email !== email;
    let newTempPassword = null;
    let onboardingStatusToSet = undefined;

    if (emailChanged) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
      newTempPassword = '';
      for (let i = 0; i < 12; i++) {
        newTempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      onboardingStatusToSet = 'invited';
    }

    // 3. Update Auth User if email changed or password reset needed
    if (email) {
      const updateData: any = {
        email: email,
        email_confirm: true,
        user_metadata: { name, surname, role }
      };
      
      if (emailChanged && newTempPassword) {
        updateData.password = newTempPassword;
      }

      const { error: authUpdateError } = await getSupabaseAdmin().auth.admin.updateUserById(userId, updateData);
      if (authUpdateError) {
        return NextResponse.json({ error: 'Error al actualizar Auth: ' + authUpdateError.message }, { status: 400 });
      }
    }

    // 4. Update profile in the database
    const profileUpdateData: any = {
      nombre: name,
      apellidos: surname,
      email: email,
      role: role,
      client_id: client_id || null,
      company_id: company_id || null,
      user_type: user_type || 'hospital',
      telefono: phone,
      avatar_url: avatar_url
    };

    if (emailChanged && newTempPassword) {
      profileUpdateData.temp_password = newTempPassword;
      profileUpdateData.onboarding_status = onboardingStatusToSet;
    }

    const { error: profileError } = await getSupabaseAdmin()
      .from('profiles')
      .update(profileUpdateData)
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return NextResponse.json({ error: 'Error al actualizar perfil: ' + profileError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      emailChanged, 
      tempPassword: newTempPassword 
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
