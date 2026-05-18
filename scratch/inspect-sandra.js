const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const { buildTravelTimeline } = require('../src/core/services/travel-timeline.service');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  const planId = 'a220fee1-0d1c-45eb-942b-45d2990db65a';
  console.log('Building timeline for plan:', planId);

  const timeline = await buildTravelTimeline(planId);
  console.log('Timeline events count:', timeline.length);
  
  timeline.forEach((e, idx) => {
    console.log(`Event ${idx + 1}: ID="${e.id}", Type="${e.event_type}", Title="${e.title}"`);
  });

  const hotelEvents = timeline.filter(e => e.event_type === 'hotel');
  console.log('Hotel events:', hotelEvents);
}

test();
