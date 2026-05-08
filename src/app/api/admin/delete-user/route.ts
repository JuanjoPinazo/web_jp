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

    const { data: profile } = await getSupabaseAdmin()
      .from('profiles')
      .select('role')
      .eq('id', requester.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    // 2. Deep Cleanup: Find all plans for this user to delete their dependencies
    const admin = getSupabaseAdmin();
    
    // Get all plans of the user
    const { data: plans } = await admin
      .from('contact_travel_plans')
      .select('id')
      .eq('user_id', userId);
    
    const planIds = (plans || []).map(p => p.id);

    if (planIds.length > 0) {
      // Delete all related records in sub-tables
      await Promise.all([
        admin.from('travel_flights').delete().in('plan_id', planIds),
        admin.from('travel_hotels').delete().in('plan_id', planIds),
        admin.from('hotel_stays').delete().in('plan_id', planIds),
        admin.from('travel_transfers').delete().in('plan_id', planIds),
        admin.from('travel_restaurants').delete().in('plan_id', planIds),
        admin.from('hospitality_events').delete().in('plan_id', planIds),
        admin.from('travel_documents').delete().in('plan_id', planIds),
        admin.from('travel_registrations').delete().in('plan_id', planIds),
      ]);

      // Delete the plans themselves
      await admin.from('contact_travel_plans').delete().in('id', planIds);
    }

    // Delete hospitality invitations/attendance
    await admin.from('hospitality_event_attendees').delete().eq('profile_id', userId);

    // CRITICAL: Handle audit fields (last_updated_by) in ALL tables to avoid FK violations
    // We set them to null so we don't have to delete the records if they belong to other users
    const auditTables = [
      'travel_flights', 'travel_hotels', 'hotel_stays', 
      'travel_transfers', 'travel_restaurants', 'hospitality_events', 
      'travel_documents', 'contact_travel_plans'
    ];

    await Promise.all(auditTables.map(table => 
      admin.from(table).update({ last_updated_by: null }).eq('last_updated_by', userId)
    ));

    // 3. Delete from Profiles table
    const { error: profileDeleteError } = await admin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError);
      return NextResponse.json({ error: 'Error al borrar perfil: ' + profileDeleteError.message }, { status: 500 });
    }

    // 4. Delete from Supabase Auth
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
    
    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      return NextResponse.json({ error: 'Error al borrar usuario de autenticación: ' + authDeleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
