const { Client } = require('pg');

const regions = ['eu-west-3', 'eu-west-1', 'eu-central-1', 'us-east-1', 'us-east-2'];

async function testConnection() {
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const connStr = `postgresql://postgres.skmcljcolcpqkmjjppdk:Sup%40Jp26.AD2@${host}:5432/postgres`;
    
    console.log(`Testing region ${region} with host ${host}...`);
    const client = new Client({ connectionString: connStr, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      console.log(`SUCCESS connected to ${region}!`);
      const res = await client.query('SELECT NOW()');
      console.log('Query result:', res.rows[0]);
      await client.end();
      return; // Stop on first success
    } catch (err) {
      console.log(`FAILED for ${region}:`, err.message);
    }
  }
}

testConnection();
