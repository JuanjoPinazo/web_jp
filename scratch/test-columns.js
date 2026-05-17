const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('Connected to DB!');
    
    const tables = ['travel_flights', 'travel_hotels', 'hotel_stays', 'travel_transfers', 'travel_restaurants', 'hospitality_events', 'travel_documents'];
    for (const table of tables) {
      const res = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1;
      `, [table]);
      console.log(`Columns for ${table}:`, res.rows.map(r => r.column_name).join(', '));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
test();
