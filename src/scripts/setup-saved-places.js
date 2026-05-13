const { Client } = require('pg');

// Using the same connection string from previous setup scripts
const connectionString = 'postgresql://postgres:Sup@Jp26.AD2@db.skmcljcolcpqkmjjppdk.supabase.co:5432/postgres';

const client = new Client({
  connectionString: connectionString,
});

async function setupSavedPlaces() {
  try {
    await client.connect();
    console.log('Connected to database to create saved_places table...');

    await client.query(`
      create table if not exists public.saved_places (
        id uuid primary key default gen_random_uuid(),
        plan_id uuid references public.travel_plans(id) on delete cascade,
        profile_id uuid references public.profiles(id) on delete cascade,
        google_place_id text,
        name text not null,
        address text,
        latitude double precision,
        longitude double precision,
        category text,
        notes text,
        created_at timestamptz default now()
      );
    `);
    console.log('Table saved_places checked/created.');

    // Enable RLS and add policies
    await client.query(`
      alter table public.saved_places enable row level security;
      
      drop policy if exists "Users can manage their own saved places" on public.saved_places;
      create policy "Users can manage their own saved places"
        on public.saved_places
        for all
        using (profile_id = auth.uid());

      drop policy if exists "Admins can view all saved places" on public.saved_places;
      create policy "Admins can view all saved places"
        on public.saved_places
        for select
        using (
          exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
          )
        );
    `);
    console.log('RLS policies for saved_places created.');

  } catch (err) {
    console.error('Database error:', err.message);
  } finally {
    await client.end();
  }
}

setupSavedPlaces();
