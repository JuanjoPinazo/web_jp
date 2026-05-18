const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const { buildTravelTimeline } = require('../src/core/services/travel-timeline.service');

async function test() {
  const planId = '0c31ccc2-2016-4bea-9083-7e1dec790aee';
  console.log('Building timeline for Ernesto plan via buildTravelTimeline:', planId);

  const events = await buildTravelTimeline(planId);
  
  const transferEvents = events.filter(e => e.event_type === 'transfer');
  console.log('Found', transferEvents.length, 'transfer events.');
  transferEvents.forEach((e, i) => {
    console.log(`\nEvent ${i + 1}:`);
    console.log('  Title:', e.title);
    console.log('  Subtitle:', e.subtitle);
    console.log('  Location:', e.location);
    console.log('  Payload pickup_location:', e.metadata.pickup_location);
    console.log('  Payload dropoff_location:', e.metadata.dropoff_location);
    console.log('  Payload pickup_address:', e.metadata.pickup_address);
    console.log('  Payload destination_address:', e.metadata.destination_address);
  });
}

test();
