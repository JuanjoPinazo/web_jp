const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('travel_flights').select('*').limit(1);
  if (error) console.log('ERROR:', error);
  else console.log('DATA:', data);
}
run();
