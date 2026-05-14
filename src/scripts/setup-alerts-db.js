const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function setup() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    console.log('Creating table "alerts"...');
    await client.query(`
      create table if not exists alerts (
        id uuid primary key default gen_random_uuid(),
        plan_id uuid references contact_travel_plans(id) on delete cascade,
        profile_id uuid not null references profiles(id) on delete cascade,
        type text not null,
        title text not null,
        message text not null,
        priority text not null default 'normal',
        scheduled_for timestamptz,
        read_at timestamptz,
        action_label text,
        action_url text,
        metadata jsonb default '{}'::jsonb,
        created_at timestamptz default now()
      );
    `);
    console.log('Table "alerts" created or already exists');

    await client.query(`
      create index if not exists idx_alerts_plan on alerts(plan_id);
      create index if not exists idx_alerts_profile on alerts(profile_id);
      create index if not exists idx_alerts_dedupe on alerts((metadata->>'dedupe_key'));
    `);
    console.log('Indices created');

    // RLS
    await client.query(`
      alter table alerts enable row level security;
    `);
    
    // Policies
    await client.query(`
      drop policy if exists "Users can view their own alerts" on alerts;
      create policy "Users can view their own alerts" on alerts
        for select using (auth.uid() = profile_id);

      drop policy if exists "Users can update their own alerts" on alerts;
      create policy "Users can update their own alerts" on alerts
        for update using (auth.uid() = profile_id);
        
      drop policy if exists "Admins can do everything on alerts" on alerts;
      create policy "Admins can do everything on alerts" on alerts
        for all using (
          exists (
            select 1 from profiles
            where id = auth.uid() and role = 'admin'
          )
        );
    `);
    console.log('RLS Policies applied');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

setup();
