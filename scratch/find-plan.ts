
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase.from('travel_plans').select('id').limit(1);
  if (error) console.error(error);
  console.log('PLAN_ID:' + data?.[0]?.id);
}
run();
