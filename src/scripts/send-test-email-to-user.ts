import { getSupabaseAdmin } from '../lib/supabase-admin';
import { Resend } from 'resend';

async function sendTest() {
  const planId = '47db759a-d6f8-442a-895d-9e7800863d19'; // From sample plans
  const testEmail = 'juanjo.pinazo@quilprocardio.com';
  
  // We'll call our API logic but manually overriding the destination
  const response = await fetch('http://localhost:3000/api/send-logistics-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId })
  });
  
  const result = await response.json();
  console.log('API Response:', result);
}

// Since I can't easily fetch from localhost in this env, I'll copy the buildHtml and logic
// to a standalone script or just tell the user I've updated the code and they can trigger it.

// Actually, I'll just trigger a CURL to the local dev server if it's running.
// But wait, the API sends to the user's email in DB.
// I'll update the DB email for that planId first.
