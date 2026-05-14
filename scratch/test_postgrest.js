const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNonExistent() {
  const { error } = await supabase.from('non_existent_table_abc_123').select('count', { count: 'exact', head: true });
  if (error) {
    console.log(`Error: ${error.code} - ${error.message}`);
  } else {
    console.log('OK (Wait, what?)');
  }
}

testNonExistent();
