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
      create table if not exists user_locations (
        id uuid primary key default gen_random_uuid(),
        profile_id uuid not null references auth.users(id) on delete cascade,
        label text not null,
        address text not null,
        latitude double precision not null,
        longitude double precision not null,
        google_place_id text,
        is_default_departure boolean default false,
        consent_given boolean default false,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );
    `);
    console.log('Table user_locations created or already exists');

    await client.query(`
      create index if not exists idx_user_locations_profile on user_locations(profile_id);
    `);
    console.log('Index created');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

setup();
