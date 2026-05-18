const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Querying Supabase to find Air France flights and related documents...');
  
  // 1. Fetch flights matching AF1421
  const { data: flights, error: flightErr } = await supabase
    .from('travel_flights')
    .select('*')
    .eq('flight_number', 'AF1421')
    .is('deleted_at', null);

  if (flightErr) {
    console.error('Error fetching flights:', flightErr);
    return;
  }

  console.log(`Found ${flights.length} flights for AF1421:`);
  for (const flight of flights) {
    console.log(`Flight ID: ${flight.id}, Plan ID: ${flight.plan_id}, Airline: ${flight.airline}, Date: ${flight.departure_time}`);
    
    // Fetch all documents for this plan
    const { data: docs, error: docErr } = await supabase
      .from('travel_documents')
      .select('*')
      .eq('plan_id', flight.plan_id)
      .is('deleted_at', null);
      
    if (docErr) {
      console.error('Error fetching documents:', docErr);
      continue;
    }
    
    console.log(`  Associated documents for Plan ${flight.plan_id} (count: ${docs.length}):`);
    for (const doc of docs) {
      console.log(`    - Doc ID: ${doc.id}`);
      console.log(`      Title: ${doc.title}`);
      console.log(`      Type: ${doc.document_type || doc.type}`);
      console.log(`      File URL: ${doc.file_url}`);
      console.log(`      Related Flight: ${doc.related_flight_id}`);
      console.log(`      Related Entity/ID: ${doc.related_entity} / ${doc.related_entity_id}`);
      console.log(`      Booking Ref: ${doc.booking_reference}`);
      console.log(`      QR Code: ${doc.qr_code}`);
      console.log(`      QR Raw Payload: ${doc.qr_raw_payload}`);
      console.log(`      Visible to Client: ${doc.visible_to_client}`);
    }
  }
}

test();
