const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
  const { data: plan, error } = await supabase
    .from('contact_travel_plans')
    .select('user_id, profiles(nombre, apellidos)')
    .eq('id', '42f188de-33fd-40d1-9064-52b98742d47b')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('User for this plan:', plan.profiles.nombre, plan.profiles.apellidos);
}

checkUser();
