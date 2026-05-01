const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Basic env parser for .env.local
const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

async function createTables() {
  const client = new Client({
    connectionString: env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const sql = `
      -- 1. Travel Plans (Main header)
      CREATE TABLE IF NOT EXISTS public.contact_travel_plans (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
        context_id uuid REFERENCES public.contexts(id) ON DELETE CASCADE,
        status text DEFAULT 'active',
        support_name text,
        support_phone text,
        support_email text,
        notes text,
        created_at timestamptz DEFAULT now()
      );

      -- 2. Hotels
      CREATE TABLE IF NOT EXISTS public.travel_hotels (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id uuid REFERENCES public.contact_travel_plans(id) ON DELETE CASCADE,
        hotel_name text,
        address text,
        check_in timestamptz,
        check_out timestamptz,
        booking_reference text,
        phone text,
        map_url text,
        voucher_url text,
        notes text
      );

      -- 3. Flights
      CREATE TABLE IF NOT EXISTS public.travel_flights (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id uuid REFERENCES public.contact_travel_plans(id) ON DELETE CASCADE,
        flight_number text,
        origin text,
        destination text,
        departure_time timestamptz,
        arrival_time timestamptz,
        terminal text,
        booking_reference text,
        notes text
      );

      -- 4. Transfers
      CREATE TABLE IF NOT EXISTS public.travel_transfers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id uuid REFERENCES public.contact_travel_plans(id) ON DELETE CASCADE,
        transfer_type text,
        pickup_time timestamptz,
        pickup_location text,
        dropoff_location text,
        driver_name text,
        driver_phone text,
        vehicle text,
        booking_reference text,
        notes text
      );

      -- 5. Documents
      CREATE TABLE IF NOT EXISTS public.travel_documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id uuid REFERENCES public.contact_travel_plans(id) ON DELETE CASCADE,
        document_type text,
        title text,
        file_url text,
        notes text,
        created_at timestamptz DEFAULT now()
      );
    `;

    await client.query(sql);
    console.log('Tables created successfully');

  } catch (err) {
    console.error('Error creating tables:', err);
  } finally {
    await client.end();
  }
}

createTables();
