import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * UNIFIED INTEGRATION ENDPOINT: MediCRM -> JP Intelligence Travel Plan
 * Receives a bundle of contact, client, event, and plan data.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  console.log('--- MediCRM Travel Plan Sync Started ---');
  
  try {
    // 1. Security Check
    const secret = request.headers.get('x-integration-secret');
    const expectedSecret = process.env.MEDICRM_INTEGRATION_SECRET || 'jp_intelligence_sync_secret_2026';
    
    if (secret !== expectedSecret) {
      console.error('Unauthorized access attempt to integration endpoint');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const { contact, client, event, travel_plan } = payload;

    if (!contact?.email || !client?.external_id || !event?.external_id) {
      return NextResponse.json({ error: 'Missing mandatory fields (contact.email, client.external_id, event.external_id)' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 2. Sync Client (Hospital/Account)
    console.log(`Syncing Client: ${client.name} (${client.external_id})`);
    const { data: dbClient, error: clientError } = await supabase
      .from('clients')
      .upsert({
        external_id: client.external_id,
        name: client.name,
        external_source: 'medicrm',
        synced_at: new Date().toISOString()
      }, { onConflict: 'external_source, external_id' })
      .select('id')
      .single();
    
    if (clientError) throw new Error(`Client Sync Failed: ${clientError.message}`);

    // 3. Sync Event (Context)
    console.log(`Syncing Event: ${event.name} (${event.external_id})`);
    const { data: dbEvent, error: eventError } = await supabase
      .from('contexts')
      .upsert({
        external_id: event.external_id,
        name: event.name,
        start_date: event.start_date,
        end_date: event.end_date,
        external_source: 'medicrm',
        synced_at: new Date().toISOString()
      }, { onConflict: 'external_source, external_id' })
      .select('id')
      .single();
    
    if (eventError) throw new Error(`Event Sync Failed: ${eventError.message}`);

    // 4. Sync Contact (Profile)
    console.log(`Checking/Syncing Contact: ${contact.email}`);
    
    let userId;
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', contact.email)
      .single();

    if (existingProfile) {
      userId = existingProfile.id;
      console.log(`Existing user found with ID: ${userId}`);
    } else {
      console.log(`New user detected, creating invitation in Auth...`);
      const { data: newUser, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(contact.email, {
        data: {
          name: contact.name,
          surname: contact.surname,
          role: 'client'
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://jpintelligence.vercel.app'}/set-password`
      });
      
      if (inviteError) throw new Error(`Auth Invitation Failed: ${inviteError.message}`);
      userId = newUser.user.id;
      console.log(`New user created with ID: ${userId}`);
    }

    const { data: dbProfile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: contact.email,
        nombre: contact.name,
        apellidos: contact.surname,
        telefono: contact.phone,
        client_id: dbClient.id,
        external_id: contact.external_id,
        external_source: 'medicrm',
        synced_at: new Date().toISOString()
      }, { onConflict: 'email' })
      .select('id')
      .single();
    
    if (profileError) throw new Error(`Profile Sync Failed: ${profileError.message}`);

    // 5. Ensure Link: User <-> Event (context_users)
    await supabase
      .from('context_users')
      .upsert({
        context_id: dbEvent.id,
        user_id: dbProfile.id
      }, { onConflict: 'context_id, user_id' });

    // 6. Ensure Link: Client <-> Event (context_clients)
    await supabase
      .from('context_clients')
      .upsert({
        context_id: dbEvent.id,
        client_id: dbClient.id
      }, { onConflict: 'context_id, client_id' });

    // 7. Sync Travel Plan Base
    console.log(`Syncing Travel Plan Base: ${travel_plan?.external_id || 'new'}`);
    const { data: dbPlan, error: planError } = await supabase
      .from('contact_travel_plans')
      .upsert({
        user_id: dbProfile.id,
        context_id: dbEvent.id,
        status: travel_plan?.status || 'planned',
        external_id: travel_plan?.external_id,
        external_source: 'medicrm',
        synced_at: new Date().toISOString()
      }, { onConflict: 'user_id, context_id' })
      .select('id')
      .single();
    
    if (planError) throw new Error(`Travel Plan Sync Failed: ${planError.message}`);

    console.log('--- Sync Completed Successfully ---');
    
    return NextResponse.json({ 
      success: true, 
      data: {
        profile_id: dbProfile.id,
        client_id: dbClient.id,
        event_id: dbEvent.id,
        plan_id: dbPlan.id
      }
    });

  } catch (error: any) {
    console.error('Integration Fatal Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
