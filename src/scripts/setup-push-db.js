const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function setup() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    await client.query(`
      create table if not exists push_subscriptions (
        id uuid primary key default gen_random_uuid(),
        profile_id uuid not null,
        endpoint text not null unique,
        p256dh text not null,
        auth text not null,
        user_agent text,
        created_at timestamptz default now(),
        last_used_at timestamptz,
        revoked_at timestamptz
      );
    `);
    console.log('Table push_subscriptions created or already exists');

    await client.query(`
      create index if not exists idx_push_subs_profile on push_subscriptions(profile_id);
    `);
    console.log('Index created');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

setup();
