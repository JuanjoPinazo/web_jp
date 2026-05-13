
import { getSupabaseAdmin } from '../lib/supabase-admin';

async function main() {
  const supabase = getSupabaseAdmin();
  
  console.log('--- travel_restaurants data ---');
  const { data: res1 } = await supabase.from('travel_restaurants').select('restaurant_name, image_url, plan_id').is('deleted_at', null);
  console.log(res1);

  console.log('\n--- hospitality_events data ---');
  const { data: res2 } = await supabase.from('hospitality_events').select('title, image_url, plan_id').is('deleted_at', null);
  console.log(res2);
}

main();
