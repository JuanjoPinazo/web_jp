import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function createSavedPlacesTable() {
  console.log('Creating saved_places table...');

  const sql = `
    create table if not exists saved_places (
      id uuid primary key default gen_random_uuid(),
      plan_id uuid references travel_plans(id) on delete cascade,
      profile_id uuid references profiles(id) on delete cascade,
      google_place_id text,
      name text not null,
      address text,
      latitude double precision,
      longitude double precision,
      category text,
      notes text,
      created_at timestamptz default now()
    );

    -- Enable RLS
    alter table saved_places enable row level security;

    -- Policies
    drop policy if exists "Users can manage their own saved places" on saved_places;
    create policy "Users can manage their own saved places"
      on saved_places
      for all
      using (auth.uid() = profile_id);

    drop policy if exists "Admins can view all saved places" on saved_places;
    create policy "Admins can view all saved places"
      on saved_places
      for select
      using (
        exists (
          select 1 from profiles
          where profiles.id = auth.uid()
          and profiles.role = 'admin'
        )
      );
  `;

  try {
    // We use a trick to run SQL through RPC or direct query if available, 
    // but since we don't have a direct 'sql' endpoint usually, we'll suggest the user runs it.
    // However, I'll try to use a simple query to check if I can run raw SQL.
    
    console.log('SQL to run in Supabase SQL Editor:');
    console.log(sql);
    
    // For now, I'll assume I can't run raw SQL from the client easily without a custom function.
    // I will use a different approach: check if I can use a migration or just provide the script.
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createSavedPlacesTable();
