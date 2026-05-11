import { getSupabaseAdmin } from '../lib/supabase-admin';

async function checkSchema() {
  const supabase = getSupabaseAdmin();
  
  console.log('Checking columns for hospitality_events...');
  
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'hospitality_events' });
  
  if (error) {
    // If RPC fails, try a direct query to information_schema via a simple select if possible
    // or just try to insert a dummy to see if it fails
    console.log('RPC get_table_columns not found. Trying direct query...');
    const { data: cols, error: colsErr } = await supabase
      .from('hospitality_events')
      .select('*')
      .limit(1);
      
    if (colsErr) {
      console.error('Error fetching table:', colsErr.message);
    } else {
      console.log('Columns in hospitality_events:', Object.keys(cols[0] || {}));
    }
  } else {
    console.log('Columns:', data);
  }
}

checkSchema();
