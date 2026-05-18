const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
  const previewUserId = '1501348e-a358-4e96-9814-1bfa59739ffe';
  console.log('Fetching active plan for preview user:', previewUserId);

  const { data: plans, error: planError } = await supabase
    .from('contact_travel_plans')
    .select('*')
    .eq('user_id', previewUserId)
    .is('deleted_at', null);

  if (planError) {
    console.error('Error fetching plans:', planError);
    return;
  }

  console.log('Found plans:', plans.map(p => ({ id: p.id, title: p.title, context_id: p.context_id })));

  if (plans.length === 0) {
    console.log('No active plans found for this user.');
    return;
  }

  const planId = plans[0].id;
  console.log('Fetching transfers for plan:', planId);

  const { data: transfers, error: transferError } = await supabase
    .from('travel_transfers')
    .select('*')
    .eq('plan_id', planId)
    .is('deleted_at', null);

  if (transferError) {
    console.error('Error fetching transfers:', transferError);
    return;
  }

  console.log('Found transfers:', transfers.length);
  transfers.forEach((row, i) => {
    console.log(`\n--- Transfer ${i + 1} ---`);
    console.log('ID:', row.id);
    console.log('Provider:', row.provider);
    console.log('Pickup Address:', row.pickup_address);
    console.log('Destination Address:', row.destination_address);
    console.log('Full JSON:', JSON.stringify(row, null, 2));
  });
}

inspect();
