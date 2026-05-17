import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const resend = new Resend(process.env.RESEND_API_KEY);

async function testResend() {
  console.log('Testing Resend with API Key:', process.env.RESEND_API_KEY ? 'Present' : 'Missing');
  try {
    const { data: domains, error: domainsError } = await resend.domains.list();
    if (domainsError) {
      console.error('Error listing domains:', domainsError);
    } else {
      console.log('Verified Domains in Resend:');
      console.log(JSON.stringify(domains, null, 2));
    }
  } catch (err) {
    console.error('Caught error listing domains:', err);
  }
}

testResend();
