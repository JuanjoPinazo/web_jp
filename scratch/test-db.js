const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('Connected to DB!');
    
    const res = await client.query(`
      SELECT id, provider, transfer_type, pickup_datetime, pickup_address, destination_address, notes
      FROM travel_transfers
      ORDER BY created_at DESC
      LIMIT 5;
    `);
    
    console.log('Transfers count:', res.rows.length);
    res.rows.forEach((row, i) => {
      console.log(`\n--- Row ${i + 1} ---`);
      console.log(`ID: ${row.id}`);
      console.log(`Provider: ${row.provider}`);
      console.log(`Type: ${row.transfer_type}`);
      console.log(`Pickup Datetime: ${row.pickup_datetime}`);
      console.log(`Pickup Address: ${row.pickup_address}`);
      console.log(`Destination Address: ${row.destination_address}`);
      console.log(`Notes: ${row.notes}`);
    });
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await client.end();
  }
}
test();
