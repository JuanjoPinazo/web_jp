
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://skmcljcolcpqkmjjppdk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrbWNsamNvbGNwcWttampwcGRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkxNDQzMSwiZXhwIjoyMDg5NDkwNDMxfQ.UzBimOlc2haEvIksb7WW_U0NcYe7fZ11Txk5DMFrXx0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- hospitality_events data ---');
  const { data, error } = await supabase
    .from('hospitality_events')
    .select('id, title, image_url, plan_id')
    .is('deleted_at', null);

  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

main();
