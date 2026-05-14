const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  const { data, error } = await supabase
    .rpc('get_tables'); // If this RPC exists

  if (error) {
    // Try querying a system view if possible, but usually restricted.
    // Instead, let's try to query some common tables to see which ones fail.
    const tables = ['profiles', 'contact_travel_plans', 'alerts', 'clients', 'hotels_master'];
    for (const table of tables) {
      const { error: tableError } = await supabase.from(table).select('count', { count: 'exact', head: true });
      if (tableError) {
        console.log(`Table "${table}": Error ${tableError.code} - ${tableError.message}`);
      } else {
        console.log(`Table "${table}": OK`);
      }
    }
  } else {
    console.log('Tables:', data);
  }
}

listTables();
