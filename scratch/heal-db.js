const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const { processTimelineEvents } = require('../src/core/services/travel-timeline.service');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  console.log('Fetching all active plans...');
  const { data: plans, error: plansError } = await supabase.from('contact_travel_plans').select('*').is('deleted_at', null);
  if (plansError) {
    console.error('Error fetching plans:', plansError);
    return;
  }

  console.log(`Scanning timeline events for all ${plans.length} active plans...`);
  
  for (const plan of plans) {
    const { data: transfers } = await supabase.from('travel_transfers').select('*').eq('plan_id', plan.id).is('deleted_at', null);
    const { data: docs } = await supabase.from('travel_documents').select('*').eq('plan_id', plan.id).is('deleted_at', null);

    const fullPlan = {
      ...plan,
      transfers: transfers || [],
      documents: docs || []
    };

    const events = processTimelineEvents(fullPlan, docs || []);
    const problematicEvents = events.filter(e => {
      const titleStr = String(e.title).toLowerCase();
      const subtitleStr = String(e.subtitle).toLowerCase();
      const locationStr = String(e.location).toLowerCase();
      
      return titleStr.includes('undefined') || subtitleStr.includes('undefined') || locationStr.includes('undefined');
    });

    if (problematicEvents.length > 0) {
      console.log(`\n🚨 FOUND PROBLEM IN PLAN: ${plan.id} (Destination: ${plan.destination})`);
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', plan.contact_id || plan.user_id).single().catch(() => ({ data: null }));
      if (profile) {
        console.log(`   User: ${profile.name} ${profile.surname} (${profile.email})`);
      }
      
      problematicEvents.forEach((e, idx) => {
        console.log(`   Event ${idx + 1}:`);
        console.log(`     Type: ${e.event_type}`);
        console.log(`     Title: "${e.title}"`);
        console.log(`     Subtitle: "${e.subtitle}"`);
        console.log(`     Location: "${e.location}"`);
        console.log(`     Raw metadata:`, JSON.stringify(e.metadata, null, 2));
      });
    }
  }
  
  console.log('\nScan completed successfully.');
}

test();
