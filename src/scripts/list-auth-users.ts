import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kkmdmymckctxlrxalhzr.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbWRteW1ja2N0eGxyeGFsaHpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwOTA4MSwiZXhwIjoyMDgzODg1MDgxfQ.4_ihvszGYsF4dXJigHLDFr-fzVojxg22mGcalekxhNo';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function getAuthUsers() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('Auth Users:', data.users.map(u => ({ email: u.email, id: u.id, metadata: u.user_metadata })));
  }
}

getAuthUsers();
