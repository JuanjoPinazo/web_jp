const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const tables = ['travel_hotels', 'travel_restaurants'];
  for (const table of tables) {
    console.log(`Checking ${table}...`);
    const { data, error } = await supabase.from(table).select('id').is('deleted_at', null).limit(1);
    if (error) {
      console.log(`Error for ${table} with deleted_at filter:`, error.message);
    } else {
      console.log(`Success for ${table} with deleted_at filter!`);
    }
  }
}

test();
