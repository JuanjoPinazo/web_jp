
import { getSupabaseAdmin } from '../lib/supabase-admin';

async function checkSchema() {
  const supabase = getSupabaseAdmin();
  
  console.log('Checking columns for travel_restaurants...');
  
  const { data: cols, error: colsErr } = await supabase
    .from('travel_restaurants')
    .select('*')
    .limit(1);
      
  if (colsErr) {
    console.error('Error fetching table:', colsErr.message);
  } else {
    console.log('Columns in travel_restaurants:', Object.keys(cols[0] || {}));
  }
}

checkSchema();
