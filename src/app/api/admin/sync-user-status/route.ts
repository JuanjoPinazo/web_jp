import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Authorization check
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user: requester }, error: authError } = await supabase.auth.getUser();
    if (authError || !requester) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

    const { data: profile } = await getSupabaseAdmin()
      .from('profiles')
      .select('role')
      .eq('id', requester.id)
      .single();

    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });

    // 2. Fetch all users from Auth using Admin SDK
    const admin = getSupabaseAdmin();
    const { data: { users: authUsers }, error: listError } = await admin.auth.admin.listUsers();
    
    if (listError) throw listError;

    // 3. Identify users who should be 'active'
    // Criteria: last_sign_in_at is not null OR email_confirmed_at is not null
    const activeUserIds = authUsers
      .filter(u => u.last_sign_in_at || u.email_confirmed_at)
      .map(u => u.id);

    if (activeUserIds.length === 0) {
      return NextResponse.json({ success: true, updated: 0, message: 'No hay usuarios para sincronizar.' });
    }

    // 4. Bulk update profiles to 'active'
    const { error: updateError } = await admin
      .from('profiles')
      .update({ onboarding_status: 'active' })
      .in('id', activeUserIds)
      .neq('onboarding_status', 'active'); // Only update those who are not already active

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      updated: activeUserIds.length,
      message: `Se han sincronizado ${activeUserIds.length} usuarios correctamente.` 
    });

  } catch (error: any) {
    console.error('Sync Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
