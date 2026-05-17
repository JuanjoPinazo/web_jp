const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Querying Supabase contact_travel_plans with RLS bypass...');
  const { data, error } = await supabase
    .from('contact_travel_plans')
    .select(`
      *,
      profiles:user_id (id, nombre, apellidos, email, avatar_url),
      contexts:context_id (name, latitude, longitude),
      flights:travel_flights(count),
      hotels:travel_hotels(count),
      hotel_stays:hotel_stays(count),
      transfers:travel_transfers(count),
      restaurants:travel_restaurants(count),
      hospitality:hospitality_events(count),
      documents:travel_documents(count)
    `)
    .is('travel_flights.deleted_at', null)
    .is('travel_hotels.deleted_at', null)
    .is('hotel_stays.deleted_at', null)
    .is('travel_transfers.deleted_at', null)
    .is('hospitality_events.deleted_at', null)
    .is('travel_documents.deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error details:', error);
    return;
  }
  console.log('Query success! Count of plans:', data.length);
}

test();
