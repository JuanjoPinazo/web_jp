const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const parseRichTransfer = (t) => {
  let rich = {};
  try {
    if (t.notes && (t.notes.startsWith('{') || t.notes.startsWith('['))) {
      rich = JSON.parse(t.notes);
    }
  } catch (e) {
    console.error('Error parsing rich transfer notes:', e);
  }
  
  const sanitizeStr = (val) => {
    if (!val || val === 'undefined' || val === 'null' || val === '[object Object]') return '';
    return String(val).trim();
  };

  const companyName = sanitizeStr(t.provider) || sanitizeStr(t.company_name) || sanitizeStr(rich.provider) || sanitizeStr(rich.company_name);
  const pickup = sanitizeStr(t.pickup_location) || sanitizeStr(t.pickup_address) || sanitizeStr(rich.pickup_location) || '';
  const dropoff = sanitizeStr(t.dropoff_location) || sanitizeStr(t.destination_address) || sanitizeStr(rich.dropoff_location) || '';
  
  return {
    ...t,
    type: t.transfer_type || (rich.pickup_type === 'airport' ? 'airport_pickup' : (t.type || 'hotel_transfer')),
    pickup_datetime: t.pickup_datetime || t.pickup_time,
    pickup_location: pickup,
    dropoff_location: dropoff,
    provider: companyName,
    company_name: companyName,
  };
};

async function inspect() {
  const planId = '831ebead-3e4c-48f2-839c-1362cb3318ff';
  console.log('Fetching transfers raw from DB for plan:', planId);

  const { data: transfers, error } = await supabase
    .from('travel_transfers')
    .select('*')
    .eq('plan_id', planId)
    .is('deleted_at', null);

  if (error) {
    console.error(error);
    return;
  }

  console.log('Transfers count:', transfers.length);
  
  transfers.forEach((t, i) => {
    console.log(`\n--- Transfer ${i + 1} ---`);
    console.log('Raw DB pickup_address:', t.pickup_address);
    console.log('Raw DB pickup_location:', t.pickup_location);
    console.log('Raw DB destination_address:', t.destination_address);
    console.log('Raw DB dropoff_location:', t.dropoff_location);

    const parsed = parseRichTransfer(t);
    console.log('Parsed pickup_location:', parsed.pickup_location);
    console.log('Parsed dropoff_location:', parsed.dropoff_location);
  });
}

inspect();
