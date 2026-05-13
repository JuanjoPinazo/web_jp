
import { getSupabaseAdmin } from '../lib/supabase-admin';

async function main() {
  const supabase = getSupabaseAdmin();
  
  console.log('--- travel_restaurants ---');
  const { data: res1 } = await supabase.from('travel_restaurants').select('*').limit(1);
  console.log(Object.keys(res1?.[0] || {}));

  console.log('\n--- hospitality_events ---');
  const { data: res2 } = await supabase.from('hospitality_events').select('*').limit(1);
  console.log(Object.keys(res2?.[0] || {}));
}

main();
