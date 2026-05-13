const { Client } = require('pg');

// Using the same connection string from previous setup scripts
const connectionString = 'postgresql://postgres:Sup@Jp26.AD2@db.skmcljcolcpqkmjjppdk.supabase.co:5432/postgres';

const client = new Client({
  connectionString: connectionString,
});

async function setupAICache() {
  try {
    await client.connect();
    console.log('Connected to database to create ai_recommendation_cache table...');

    await client.query(`
      create table if not exists public.ai_recommendation_cache (
        id uuid primary key default gen_random_uuid(),
        plan_id uuid references public.contact_travel_plans(id) on delete cascade,
        profile_id uuid references public.profiles(id) on delete cascade,
        intent text,
        category text,
        location_hash text,
        input_hash text,
        result jsonb not null,
        created_at timestamptz default now()
      );

      create index if not exists idx_ai_reco_cache_plan
      on public.ai_recommendation_cache(plan_id, profile_id, intent, category);
    `);
    console.log('Table ai_recommendation_cache checked/created.');

  } catch (err) {
    console.error('Database error:', err.message);
  } finally {
    await client.end();
  }
}

setupAICache();
