import { createClient } from '@supabase/supabase-js';

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function getUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('email, role');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Profiles:', data);
  }
}

getUsers();
