import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, surname, email, role, client_id, company_id, user_type, phone } = body;

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

    // 2. Update Auth User if email changed
    if (email) {
      const { error: authUpdateError } = await getSupabaseAdmin().auth.admin.updateUserById(userId, {
        email: email,
        user_metadata: { name, surname, role }
      });
      if (authUpdateError) {
        return NextResponse.json({ error: 'Error al actualizar Auth: ' + authUpdateError.message }, { status: 400 });
      }
    }

    // 3. Update profile in the database
    const { error: profileError } = await getSupabaseAdmin()
      .from('profiles')
      .update({
        nombre: name,
        apellidos: surname,
        email: email,
        role: role,
        client_id: client_id || null,
        company_id: company_id || null,
        user_type: user_type || 'hospital',
        telefono: phone
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return NextResponse.json({ error: 'Error al actualizar perfil: ' + profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
