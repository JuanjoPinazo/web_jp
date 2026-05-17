import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const resend = new Resend(process.env.RESEND_API_KEY);

async function run() {
  const targetEmail = 'juanjopinazo@gmail.com';
  console.log('Sending test email to self:', targetEmail);

  try {
    const res = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: [targetEmail],
      subject: 'Test Email to Self',
      html: '<p>Este es un email de prueba enviado a ti mismo.</p>'
    });
    console.log('Result:', res);
  } catch (err) {
    console.error('Failed:', err);
  }
}

run();
