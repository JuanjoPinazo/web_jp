import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { MediCRMSyncPayload } from '@/lib/integrations/medicrm/types';
import { 
  mapMediCRMContactToProfile, 
  mapMediCRMEventToContext, 
  mapMediCRMTravelPayloadToPlan,
  mapMediCRMFlightToTravelFlight,
  mapMediCRMHotelToHotelStay,
  mapMediCRMTransferToTransfer,
  mapMediCRMDocumentToTravelDocument
} from '@/lib/integrations/medicrm/mapper';

export const dynamic = 'force-dynamic';

/**
 * NEW LOGISTICS SYNC ENDPOINT: MediCRM -> JP Intelligence
 * Receives a full payload containing client, contact, event, and travel plan details.
 */
export async function POST(request: Request) {
  console.log('--- MEDICRM SYNC START ---');
  
  try {
    // 1. Security Check
    const secret = request.headers.get('x-integration-secret');
    const expectedSecret = process.env.MEDICRM_INTEGRATION_SECRET;
    
    if (!expectedSecret) {
      console.error('MEDICRM_INTEGRATION_SECRET not set in environment');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (secret !== expectedSecret) {
      console.error('Unauthorized access attempt: invalid secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: MediCRMSyncPayload = await request.json();
    const { client, contact, event, travel_plan } = payload;

    if (!contact?.email || !client?.external_id || !event?.external_id || !travel_plan?.external_id) {
      return NextResponse.json({ 
        error: 'Missing mandatory fields (contact.email, client.external_id, event.external_id, travel_plan.external_id)' 
      }, { status: 400 });
    }

    console.log(`- Contact: ${contact.email}`);
    console.log(`- Event External ID: ${event.external_id}`);

    const supabase = getSupabaseAdmin();

    // 2. Sync Client (Hospital/Account)
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
    const { data: dbEvent, error: eventError } = await supabase
      .from('contexts')
      .upsert(mapMediCRMEventToContext(event), { onConflict: 'external_source, external_id' })
      .select('id')
      .single();
    
    if (eventError) throw new Error(`Event Sync Failed: ${eventError.message}`);

    // 4. Sync Contact (Profile)
    let userId;
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', contact.email)
      .maybeSingle();

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      // Create invitation in Auth
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
    }

    const { data: dbProfile, error: profileError } = await supabase
      .from('profiles')
      .upsert(mapMediCRMContactToProfile(contact, dbClient.id), { onConflict: 'email' })
      .select('id')
      .single();
    
    if (profileError) throw new Error(`Profile Sync Failed: ${profileError.message}`);

    // 5. Ensure Links (context_users, context_clients)
    await Promise.all([
      supabase.from('context_users').upsert({ context_id: dbEvent.id, user_id: dbProfile.id }, { onConflict: 'context_id, user_id' }),
      supabase.from('context_clients').upsert({ context_id: dbEvent.id, client_id: dbClient.id }, { onConflict: 'context_id, client_id' })
    ]);

    // 6. Sync Travel Plan Base
    const { data: dbPlan, error: planError } = await supabase
      .from('contact_travel_plans')
      .upsert(mapMediCRMTravelPayloadToPlan(travel_plan, dbProfile.id, dbEvent.id), { onConflict: 'user_id, context_id' })
      .select('id')
      .single();
    
    if (planError) throw new Error(`Travel Plan Sync Failed: ${planError.message}`);

    console.log(`- Created/Updated Plan ID: ${dbPlan.id}`);

    // 7. Sync Logistics (Flights, Hotels, Transfers, Documents)
    const syncResults = {
      flights: 0,
      hotels: 0,
      transfers: 0,
      documents: 0
    };

    // VUELOS
    if (travel_plan.flights && travel_plan.flights.length > 0) {
      const flightData = travel_plan.flights.map(f => mapMediCRMFlightToTravelFlight(f, dbPlan.id));
      const { error: fErr } = await supabase.from('travel_flights').upsert(flightData, { onConflict: 'external_source, external_id' });
      if (fErr) console.error('Flight Sync Error:', fErr);
      else syncResults.flights = travel_plan.flights.length;
    }

    // HOTELES
    if (travel_plan.hotels && travel_plan.hotels.length > 0) {
      const hotelData = travel_plan.hotels.map(h => mapMediCRMHotelToHotelStay(h, dbPlan.id));
      const { error: hErr } = await supabase.from('hotel_stays').upsert(hotelData, { onConflict: 'external_source, external_id' });
      if (hErr) console.error('Hotel Sync Error:', hErr);
      else syncResults.hotels = travel_plan.hotels.length;
    }

    // TRANSFERS
    if (travel_plan.transfers && travel_plan.transfers.length > 0) {
      const transferData = travel_plan.transfers.map(t => mapMediCRMTransferToTransfer(t, dbPlan.id));
      const { error: tErr } = await supabase.from('travel_transfers').upsert(transferData, { onConflict: 'external_source, external_id' });
      if (tErr) console.error('Transfer Sync Error:', tErr);
      else syncResults.transfers = travel_plan.transfers.length;
    }

    // DOCUMENTOS
    if (travel_plan.documents && travel_plan.documents.length > 0) {
      const docData = travel_plan.documents.map(d => mapMediCRMDocumentToTravelDocument(d, dbPlan.id));
      const { error: dErr } = await supabase.from('travel_documents').upsert(docData, { onConflict: 'external_source, external_id' });
      if (dErr) console.error('Document Sync Error:', dErr);
      else syncResults.documents = travel_plan.documents.length;
    }

    console.log(`- Synced Counts: Flights(${syncResults.flights}), Hotels(${syncResults.hotels}), Transfers(${syncResults.transfers}), Docs(${syncResults.documents})`);
    console.log('--- Sync Completed ---');

    return NextResponse.json({
      ok: true,
      plan_id: dbPlan.id,
      user_id: dbProfile.id,
      context_id: dbEvent.id,
      synced: syncResults
    });

  } catch (error: any) {
    console.error('Integration Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
