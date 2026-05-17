const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service Role Key bypasses RLS!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Querying Supabase with Service Role...');
  const { data, error } = await supabase
    .from('travel_transfers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.error('Error querying Supabase:', error);
    return;
  }
  
  console.log('Transfers count:', data.length);
  data.forEach((row, i) => {
    console.log(`\n--- Row ${i + 1} ---`);
    console.log(`ID: ${row.id}`);
    console.log(`Provider: ${row.provider}`);
    console.log(`Type: ${row.transfer_type}`);
    console.log(`Pickup Datetime: ${row.pickup_datetime}`);
    console.log(`Pickup Address: ${row.pickup_address}`);
    console.log(`Destination Address: ${row.destination_address}`);
    console.log(`Notes: ${row.notes}`);
  });
}

test();
