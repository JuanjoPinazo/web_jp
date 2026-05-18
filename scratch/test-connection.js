const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  try {
    await client.connect();
    console.log("Success! Connected to Postgres.");
    const res = await client.query("SELECT NOW()");
    console.log("Time from DB:", res.rows[0]);
  } catch (err) {
    console.error("Error connecting to DB:", err.message);
  } finally {
    await client.end();
  }
}
run();
