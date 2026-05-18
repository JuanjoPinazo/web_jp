const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
  console.log('Fetching ALL active travel plans...');
  const { data: plans, error: planError } = await supabase
    .from('contact_travel_plans')
    .select('*')
    .is('deleted_at', null);

  if (planError) {
    console.error('Error fetching plans:', planError);
    return;
  }

  console.log('Found', plans.length, 'active plans.');

  for (const plan of plans) {
    // Fetch transfers
    const { data: transfers, error: transferError } = await supabase
      .from('travel_transfers')
      .select('*')
      .eq('plan_id', plan.id)
      .is('deleted_at', null);

    if (transferError) {
      console.error(`Error fetching transfers for plan ${plan.id}:`, transferError);
      continue;
    }

    if (transfers.length === 0) continue;

    console.log(`\n=== Plan ID: ${plan.id} | User ID: ${plan.user_id} ===`);
    
    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', plan.user_id)
      .maybeSingle();

    console.log(`User Profile Name: ${profile ? (profile.nombre || profile.display_name) : 'Unknown'}`);

    transfers.forEach((t, i) => {
      console.log(`  [Transfer ${i + 1}] ID: ${t.id}`);
      console.log(`    Provider: ${t.provider}`);
      console.log(`    Booking Ref: ${t.booking_reference}`);
      console.log(`    Pickup Address: ${t.pickup_address}`);
      console.log(`    Destination Address: ${t.destination_address}`);
      console.log(`    Pickup Location: ${t.pickup_location}`);
      console.log(`    Dropoff Location: ${t.dropoff_location}`);
      console.log(`    Raw notes present: ${!!t.notes}`);
    });
  }
}

inspect();
