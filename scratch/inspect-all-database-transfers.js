const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
  console.log('Fetching ALL rows from travel_transfers...');
  const { data: transfers, error } = await supabase
    .from('travel_transfers')
    .select('*');

  if (error) {
    console.error(error);
    return;
  }

  console.log('Found', transfers.length, 'total transfers in DB.');

  const problematic = transfers.filter(t => 
    t.pickup_address === 'undefined' || 
    t.destination_address === 'undefined' ||
    t.pickup_address === 'null' ||
    t.destination_address === 'null' ||
    t.pickup_location === 'undefined' ||
    t.dropoff_location === 'undefined' ||
    t.passenger_name === 'undefined'
  );

  console.log('Problematic transfers with literal "undefined" or "null" strings:', problematic.length);
  problematic.forEach((t, i) => {
    console.log(`\n--- Problematic Transfer ${i + 1} ---`);
    console.log('ID:', t.id);
    console.log('Plan ID:', t.plan_id);
    console.log('Provider:', t.provider);
    console.log('Deleted At:', t.deleted_at);
    console.log('Pickup Address:', t.pickup_address);
    console.log('Destination Address:', t.destination_address);
    console.log('Passenger Name:', t.passenger_name);
    console.log('Notes:', t.notes);
  });
}

inspect();
