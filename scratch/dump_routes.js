const { getSupabaseAdmin } = require('./src/lib/supabase-admin');
async function dump() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('travel_routes').select('*').limit(10);
  console.log(JSON.stringify(data, null, 2));
}
dump();
