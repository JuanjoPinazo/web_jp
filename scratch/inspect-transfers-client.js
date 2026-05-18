const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const { processTimelineEvents } = require('../src/core/services/travel-timeline.service');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  const planId = '0c31ccc2-2016-4bea-9083-7e1dec790aee';
  console.log('Fetching data using admin client...');

  const { data: plan } = await supabase.from('contact_travel_plans').select('*').eq('id', planId).single();
  const { data: transfers } = await supabase.from('travel_transfers').select('*').eq('plan_id', planId).is('deleted_at', null);
  const { data: docs } = await supabase.from('travel_documents').select('*').eq('plan_id', planId).is('deleted_at', null);

  // We DO NOT call parseRichTransfer, matching the raw travel-timeline.service.ts behavior!
  const rawPlan = {
    ...plan,
    transfers: transfers || [],
    documents: docs || []
  };

  console.log('\n--- SIMULATING TIMELINE WITH RAW TRANSFERS ---');
  const events = processTimelineEvents(rawPlan, docs || []);
  
  const transferEvents = events.filter(e => e.event_type === 'transfer');
  console.log('Found', transferEvents.length, 'transfer events.');
  transferEvents.forEach((e, i) => {
    console.log(`\nEvent ${i + 1}:`);
    console.log('  Title:', e.title);
    console.log('  Subtitle:', e.subtitle);
    console.log('  Location:', e.location);
    console.log('  Metadata pickup_location:', e.metadata.pickup_location);
    console.log('  Metadata dropoff_location:', e.metadata.dropoff_location);
    console.log('  Metadata pickup_address:', e.metadata.pickup_address);
    console.log('  Metadata destination_address:', e.metadata.destination_address);
  });
}

test();
