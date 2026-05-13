import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kkmdmymckctxlrxalhzr.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbWRteW1ja2N0eGxyeGFsaHpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwOTA4MSwiZXhwIjoyMDgzODg1MDgxfQ.4_ihvszGYsF4dXJigHLDFr-fzVojxg22mGcalekxhNo';

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
