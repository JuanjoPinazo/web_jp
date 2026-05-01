const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Sup@Jp26.AD2@db.skmcljcolcpqkmjjppdk.supabase.co:5432/postgres';

const client = new Client({
  connectionString: connectionString,
});

async function setupTables() {
  try {
    await client.connect();
    console.log('Connected to database to create missing tables...');

    // 1. Create hospitals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.hospitals (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name text NOT NULL,
        location text,
        created_at timestamp with time zone DEFAULT now()
      );
    `);
    console.log('Hospitals table checked/created.');

    // 2. Create clients table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.clients (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name text NOT NULL,
        domain text,
        hospital_id uuid REFERENCES public.hospitals(id),
        created_at timestamp with time zone DEFAULT now()
      );
    `);
    console.log('Clients table checked/created.');

    // 3. Create contexts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.contexts (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        client_id uuid REFERENCES public.clients(id),
        name text NOT NULL,
        type text,
        start_date date,
        end_date date,
        created_at timestamp with time zone DEFAULT now()
      );
    `);
    console.log('Contexts table checked/created.');

    // 4. Create context_users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.context_users (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid REFERENCES auth.users(id),
        context_id uuid REFERENCES public.contexts(id),
        created_at timestamp with time zone DEFAULT now(),
        UNIQUE(user_id, context_id)
      );
    `);
    console.log('Context_users table checked/created.');

    // 5. Add client_id to profiles if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'profiles' AND column_name = 'client_id'
        ) THEN
          ALTER TABLE public.profiles ADD COLUMN client_id uuid REFERENCES public.clients(id);
        END IF;
      END $$;
    `);
    console.log('Profiles table altered to have client_id.');

    // Insert some dummy data for Hospitals
    await client.query(`
      INSERT INTO public.hospitals (name, location)
      SELECT 'Hospital Universitario Quirónsalud', 'Madrid'
      WHERE NOT EXISTS (SELECT 1 FROM public.hospitals WHERE name = 'Hospital Universitario Quirónsalud');
      
      INSERT INTO public.hospitals (name, location)
      SELECT 'Hospital Clínic', 'Barcelona'
      WHERE NOT EXISTS (SELECT 1 FROM public.hospitals WHERE name = 'Hospital Clínic');
    `);
    console.log('Dummy data for hospitals inserted.');

  } catch (err) {
    console.error('Database error:', err.message);
  } finally {
    await client.end();
  }
}

setupTables();
