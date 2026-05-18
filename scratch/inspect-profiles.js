const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
  console.log("Fetching all profiles...");
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*');

  if (error) {
    console.error(error);
    return;
  }

  const matching = profiles.filter(p => p.id.startsWith('1501348e'));
  console.log('Profiles matching startsWith 1501348e:', matching.length);
  for (const p of matching) {
    console.log(`\nID: ${p.id}, Nombre: ${p.nombre || p.display_name}`);
    
    // Find plans
    const { data: plans } = await supabase
      .from('contact_travel_plans')
      .select('*')
      .eq('user_id', p.id);
    console.log('Plans:', plans.map(pl => ({ id: pl.id, title: pl.title })));
    for (const pl of plans) {
      const { data: transfers } = await supabase
        .from('travel_transfers')
        .select('*')
        .eq('plan_id', pl.id);
      console.log(`Transfers for Plan ${pl.id}:`, transfers.map(t => ({ id: t.id, pickup: t.pickup_address, dropoff: t.destination_address })));
    }
  }
}

inspect();
