import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const resend = new Resend(process.env.RESEND_API_KEY);

async function run() {
  const targetEmail = 'juanjo.pinazo@quilprocardio.com';
  console.log('Sending test email to:', targetEmail);

  // 1. Try sending from operaciones@quilprocardio.com
  console.log('Attempt 1: Sending from operaciones@quilprocardio.com...');
  try {
    const res = await resend.emails.send({
      from: 'JP Intelligence <operaciones@quilprocardio.com>',
      to: [targetEmail],
      subject: 'Test Email - quilprocardio.com',
      html: '<p>Este es un email de prueba desde operaciones@quilprocardio.com</p>'
    });
    console.log('Attempt 1 result:', res);
  } catch (err) {
    console.error('Attempt 1 failed:', err);
  }

  // 2. Try sending from operaciones@quilmedic.com
  console.log('\nAttempt 2: Sending from operaciones@quilmedic.com...');
  try {
    const res = await resend.emails.send({
      from: 'JP Intelligence <operaciones@quilmedic.com>',
      to: [targetEmail],
      subject: 'Test Email - quilmedic.com',
      html: '<p>Este es un email de prueba desde operaciones@quilmedic.com</p>'
    });
    console.log('Attempt 2 result:', res);
  } catch (err) {
    console.error('Attempt 2 failed:', err);
  }

  // 3. Try sending from onboarding@resend.dev
  console.log('\nAttempt 3: Sending from onboarding@resend.dev...');
  try {
    const res = await resend.emails.send({
      from: 'JP Intelligence <onboarding@resend.dev>',
      to: [targetEmail],
      subject: 'Test Email - onboarding@resend.dev',
      html: '<p>Este es un email de prueba desde onboarding@resend.dev</p>'
    });
    console.log('Attempt 3 result:', res);
  } catch (err) {
    console.error('Attempt 3 failed:', err);
  }
}

run();
