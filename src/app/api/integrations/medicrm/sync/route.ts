import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * INTEGRATION ENDPOINT: MediCRM -> JP Intelligence
 * This endpoint receives data from MediCRM to sync hospitals, departments, clients, contacts, and events.
 * It uses an "Upsert" logic based on external_id.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Security Check (Future: Implement API Key validation for MediCRM)
    const authHeader = request.headers.get('x-api-key');
    // For now, we allow development, but this should be secured.
    
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ error: 'Missing type or data' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    let result;

    switch (type) {
      case 'hospital':
        result = await syncHospital(supabase, data);
        break;
      case 'department':
        result = await syncDepartment(supabase, data);
        break;
      case 'client':
        result = await syncClient(supabase, data);
        break;
      case 'contact':
        result = await syncContact(supabase, data);
        break;
      case 'event':
        result = await syncEvent(supabase, data);
        break;
      default:
        return NextResponse.json({ error: `Unsupported sync type: ${type}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error('Integration Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

async function syncHospital(supabase: any, data: any) {
  const { external_id, name, location } = data;
  const { data: res, error } = await supabase
    .from('hospitals')
    .upsert({ 
      external_id, 
      name, 
      location, 
      external_source: 'medicrm',
      synced_at: new Date().toISOString() 
    }, { onConflict: 'external_source, external_id' })
    .select()
    .single();
  if (error) throw error;
  return res;
}

async function syncDepartment(supabase: any, data: any) {
  const { external_id, name } = data;
  const { data: res, error } = await supabase
    .from('departments')
    .upsert({ 
      external_id, 
      name, 
      external_source: 'medicrm',
      synced_at: new Date().toISOString() 
    }, { onConflict: 'external_source, external_id' })
    .select()
    .single();
  if (error) throw error;
  return res;
}

async function syncClient(supabase: any, data: any) {
  const { external_id, name, hospital_external_id, department_external_id } = data;
  
  // Resolve internal IDs from external references
  const [hospital, department] = await Promise.all([
    supabase.from('hospitals').select('id').eq('external_id', hospital_external_id).single(),
    supabase.from('departments').select('id').eq('external_id', department_external_id).single()
  ]);

  const { data: res, error } = await supabase
    .from('clients')
    .upsert({ 
      external_id, 
      name,
      hospital_id: hospital.data?.id,
      department_id: department.data?.id,
      external_source: 'medicrm',
      synced_at: new Date().toISOString() 
    }, { onConflict: 'external_source, external_id' })
    .select()
    .single();
  if (error) throw error;
  return res;
}

async function syncContact(supabase: any, data: any) {
  const { external_id, email, name, surname, phone, role, client_external_id } = data;
  
  const client = client_external_id 
    ? await supabase.from('clients').select('id').eq('external_id', client_external_id).single()
    : { data: null };

  // Note: For contacts, we update the profile. 
  // Auth account creation must still happen via the invitation flow if user doesn't exist.
  const { data: res, error } = await supabase
    .from('profiles')
    .upsert({ 
      external_id, 
      email,
      nombre: name,
      apellidos: surname,
      telefono: phone,
      role: role || 'client',
      client_id: client.data?.id,
      external_source: 'medicrm',
      synced_at: new Date().toISOString() 
    }, { onConflict: 'external_source, external_id' })
    .select()
    .single();
  if (error) throw error;
  return res;
}

async function syncEvent(supabase: any, data: any) {
  const { external_id, name, type, start_date, end_date, location, description } = data;
  
  const { data: res, error } = await supabase
    .from('contexts')
    .upsert({ 
      external_id, 
      name,
      type,
      start_date,
      end_date,
      location,
      description,
      external_source: 'medicrm',
      synced_at: new Date().toISOString() 
    }, { onConflict: 'external_source, external_id' })
    .select()
    .single();
  if (error) throw error;
  return res;
}
