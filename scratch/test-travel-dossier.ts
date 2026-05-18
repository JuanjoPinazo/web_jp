import * as dotenv from 'dotenv';
import * as path from 'path';

// Resolve and load environment variables first
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  // Use dynamic imports to ensure dotenv.config has loaded process.env before files are imported
  const { getSupabaseAdmin } = await import('../src/lib/supabase-admin');
  const { sendTravelDossierEmail } = await import('../src/actions/travel-dossier-actions');
  const { buildTravelDossierData } = await import('../src/modules/travel-dossier/dossier-builder');
  const { getTravelDossierAttachments } = await import('../src/modules/travel-dossier/attachment-engine');

  const planId = '47db759a-d6f8-442a-895d-9e7800863d19'; // Known existing plan
  console.log(`=== Testing Digital Travel Dossier Email for Plan: ${planId} ===\n`);

  try {
    const supabase = getSupabaseAdmin();
    
    // 1. Fetch the plan details to verify existence and extract user_id
    const { data: plan, error: planError } = await supabase
      .from('contact_travel_plans')
      .select('*, profiles:user_id(*)')
      .eq('id', planId)
      .maybeSingle();

    if (planError || !plan) {
      console.error('❌ Failed to fetch plan from Supabase:', planError?.message || 'Plan not found.');
      return;
    }

    const profileId = plan.user_id;
    console.log(`✅ Plan Found. Associated User: ${plan.profiles?.nombre} ${plan.profiles?.apellidos} (${plan.profiles?.email})`);
    console.log(`Profile ID: ${profileId}`);

    // 2. Test Data Builder
    console.log('\n--- Testing Dossier Builder ---');
    const dossierData = await buildTravelDossierData(planId);
    console.log('✅ Dossier data constructed successfully.');
    console.log(`Event Name: ${dossierData.eventName}`);
    console.log(`Dates: ${dossierData.eventDates}`);
    console.log(`City: ${dossierData.eventCity}`);
    console.log(`Main Hotel: ${dossierData.mainHotelName}`);
    console.log(`Timeline Days Count: ${dossierData.timelineDays.length}`);
    dossierData.timelineDays.forEach((day, index) => {
      console.log(`  Day ${index + 1}: ${day.dateLabel} (${day.events.length} events)`);
      day.events.forEach(ev => {
        console.log(`    [${ev.formattedTime}] ${ev.icon} ${ev.title} - ${ev.subtitle || ''}`);
      });
    });

    // 3. Test Attachment Downloader and Professional Renamer
    console.log('\n--- Testing Attachment Engine ---');
    const attachments = await getTravelDossierAttachments(planId);
    console.log(`✅ Attachment engine finished. Found ${attachments.length} visible files.`);
    attachments.forEach((att, idx) => {
      console.log(`  Attachment ${idx + 1}: ${att.filename} (${att.content.length} bytes, type: ${att.contentType})`);
    });

    // 4. Test Server Action execution
    console.log('\n--- Testing sendTravelDossierEmail Server Action ---');
    console.log('Sending email...');
    const result = await sendTravelDossierEmail(planId, profileId);
    
    if (result.success) {
      console.log('🎉 SUCCESS! Digital Travel Dossier Email executed flawlessly.');
      console.log(`Email ID: ${result.emailId}`);
      console.log(`Recipient: ${result.recipient}`);
    } else {
      console.error('❌ Failed to execute Server Action:', result.error);
    }

  } catch (err: any) {
    console.error('❌ Critical Test Error:', err);
  }
}

run();
