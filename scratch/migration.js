const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to Supabase DB. Running migration...');

    // Run migration
    await client.query(`
      DROP TABLE IF EXISTS public.travel_transfers CASCADE;

      CREATE TABLE public.travel_transfers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id uuid REFERENCES public.contact_travel_plans(id) ON DELETE CASCADE NOT NULL,
        provider text,
        transfer_type text DEFAULT 'airport_to_hotel',
        pickup_type text,
        pickup_datetime timestamptz,
        pickup_address text,
        pickup_airport_code text,
        destination_type text,
        destination_address text,
        destination_name text,
        vehicle_type text,
        passengers int,
        luggage text,
        booking_reference text,
        meeting_point text,
        support_phone text,
        whatsapp_available boolean DEFAULT false,
        airline text,
        flight_number text,
        flight_arrival_time timestamptz,
        driver_name text,
        driver_phone text,
        notes text,
        raw_payload jsonb DEFAULT '{}',
        parsed_confidence int,
        status text DEFAULT 'confirmed',
        source text DEFAULT 'parser',
        visible_to_client boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        last_updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz
      );

      -- Re-enable RLS
      ALTER TABLE public.travel_transfers ENABLE ROW LEVEL SECURITY;

      -- Re-create policies
      CREATE POLICY "Allow reading own transfers" ON public.travel_transfers FOR SELECT USING (
          EXISTS (SELECT 1 FROM public.contact_travel_plans WHERE id = travel_transfers.plan_id AND user_id = auth.uid())
      );
      CREATE POLICY "Allow all for admins on transfers" ON public.travel_transfers FOR ALL USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );

      CREATE INDEX IF NOT EXISTS idx_travel_transfers_plan
      ON travel_transfers(plan_id)
      WHERE deleted_at is null;

      NOTIFY pgrst, 'reload schema';
    `);

    console.log('Migration successfully completed! travel_transfers schema updated.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
