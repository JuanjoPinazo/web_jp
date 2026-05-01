/**
 * TEST SCRIPT: MediCRM -> JP Intelligence Integration
 * This script simulates a real sync call from MediCRM.
 * 
 * Usage:
 * export MEDICRM_INTEGRATION_SECRET=your_secret_here
 * node scratch/test-integration.js [target_url]
 */

const http = require('http');
const https = require('https');

// Configuration
const SECRET = process.env.MEDICRM_INTEGRATION_SECRET || 'jp_intelligence_sync_secret_2026';
const TARGET_URL = process.argv[2] || 'http://localhost:3000/api/integrations/medicrm/travel-plan';

console.log(`\n🚀 Starting Integration Test`);
console.log(`📍 Target: ${TARGET_URL}`);
console.log(`🔐 Using Secret: ${SECRET.substring(0, 4)}****\n`);

// Realistic PCL Payload
const payload = {
  contact: {
    email: 'juanjopinazo2@gmail.com',
    name: 'Joan Josep',
    surname: 'Pinazo',
    phone: '+34629083361',
    external_id: 'medicrm-contact-1001'
  },
  client: {
    name: 'HMD General Albacete',
    external_id: 'medicrm-client-2001'
  },
  event: {
    name: 'EuroPCR 2026',
    start_date: '2026-05-19',
    end_date: '2026-05-22',
    external_id: 'medicrm-event-3001'
  },
  travel_plan: {
    external_id: 'medicrm-plan-4001',
    status: 'planned'
  }
};

const data = JSON.stringify(payload);
const urlObj = new URL(TARGET_URL);

const options = {
  hostname: urlObj.hostname,
  port: urlObj.port,
  path: urlObj.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'x-integration-secret': SECRET
  }
};

const lib = TARGET_URL.startsWith('https') ? https : http;

const req = lib.request(options, (res) => {
  let body = '';
  
  console.log(`📡 Status Code: ${res.statusCode}`);
  
  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(body);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('✅ Success! Response data:');
        console.log(JSON.stringify(response, null, 2));
      } else {
        console.error('❌ Integration Failed:');
        console.error(response.error || body);
      }
    } catch (e) {
      console.error('❌ Failed to parse response body:');
      console.log(body);
    }
    console.log('\n--- End of Test ---\n');
  });
});

req.on('error', (error) => {
  console.error(`❌ Request Error: ${error.message}`);
});

req.write(data);
req.end();
