const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKongEvents() {
  const { data: events, error } = await supabase
    .from('hospitality_events')
    .select('id, title, venue_name, plan_id, created_at')
    .eq('venue_name', 'Kong');

  if (error) {
    console.error('Error fetching events:', error);
    return;
  }

  console.log('Events found with "Kong" as venue:');
  console.log(JSON.stringify(events, null, 2));
}

checkKongEvents();
