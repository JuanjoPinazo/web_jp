const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  console.log('Fetching all active plans...');

  const { data: plans, error } = await supabase
    .from('contact_travel_plans')
    .select('*')
    .is('deleted_at', null);

  if (error) {
    console.error('Error fetching plans:', error);
    return;
  }

  console.log(`Found ${plans.length} active plans:`);
  plans.forEach(p => {
    console.log(`ID: ${p.id}, Destination: ${p.destination}, Status: ${p.status}, Context ID: ${p.context_id}`);
  });
}

test();
