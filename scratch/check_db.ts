import { supabase } from '../src/lib/supabase';

async function test() {
  const { data, error } = await supabase.from('context_users').select('*').limit(1);
  console.log('Context Users Record:', data);
  if (error) console.error('Error:', error);
}

test();
