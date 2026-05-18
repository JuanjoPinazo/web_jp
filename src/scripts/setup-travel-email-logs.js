const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function setup() {
  if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL in .env.local');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database successfully.');

    const sqlPath = path.join(__dirname, '../../setup_travel_email_logs.sql');
    console.log(`Reading SQL script from: ${sqlPath}`);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying travel_email_logs schema and policies...');
    await client.query(sql);
    console.log('Database successfully migrated! travel_email_logs table is ready.');

  } catch (err) {
    console.error('Error executing database setup:', err);
  } finally {
    await client.end();
  }
}

setup();
