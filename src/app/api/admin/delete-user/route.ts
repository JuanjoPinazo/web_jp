import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

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

    // Prevent self-deletion
    if (requester.id === userId) {
      return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 });
    }

    // 2. Delete user from Supabase Auth
    // This will trigger cascade delete in profiles if configured, 
    // or we might need to delete profile manually if not.
    const { error: deleteError } = await getSupabaseAdmin().auth.admin.deleteUser(userId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    // 3. Optional: Manual profile cleanup if cascade is not set
    // In most cases, the trigger/cascade handles this, but let's be sure
    await getSupabaseAdmin().from('profiles').delete().eq('id', userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
