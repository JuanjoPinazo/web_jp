const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Sup@Jp26.AD2@db.skmcljcolcpqkmjjppdk.supabase.co:5432/postgres';

const client = new Client({
  connectionString: connectionString,
});

async function setupSupportRequests() {
  try {
    await client.connect();
    console.log('Connected to database to setup support_requests...');

    // 1. Create table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.support_requests (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        plan_id uuid REFERENCES public.contact_travel_plans(id) ON DELETE CASCADE,
        profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
        coordinator_id uuid REFERENCES public.logistic_contacts(id) ON DELETE SET NULL,
        type text NOT NULL,
        title text NOT NULL,
        message text,
        status text DEFAULT 'open',
        priority text DEFAULT 'normal',
        related_entity text,
        related_entity_id uuid,
        created_at timestamp with time zone DEFAULT now(),
        resolved_at timestamp with time zone,
        metadata jsonb DEFAULT '{}'::jsonb
      );
    `);
    console.log('support_requests table created or verified.');

    // 2. Enable RLS
    await client.query(`
      ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
    `);
    console.log('Row Level Security enabled.');

    // 3. Drop existing policies
    await client.query(`
      DROP POLICY IF EXISTS "Allow reading own support requests" ON public.support_requests;
      DROP POLICY IF EXISTS "Allow inserting own support requests" ON public.support_requests;
      DROP POLICY IF EXISTS "Allow updating own support requests" ON public.support_requests;
      DROP POLICY IF EXISTS "Allow all for admins on support requests" ON public.support_requests;
    `);
    console.log('Old policies dropped.');

    // 4. Create policies
    await client.query(`
      CREATE POLICY "Allow reading own support requests" ON public.support_requests
        FOR SELECT USING (profile_id = auth.uid());
        
      CREATE POLICY "Allow inserting own support requests" ON public.support_requests
        FOR INSERT WITH CHECK (profile_id = auth.uid());
        
      CREATE POLICY "Allow updating own support requests" ON public.support_requests
        FOR UPDATE USING (profile_id = auth.uid());
        
      CREATE POLICY "Allow all for admins on support requests" ON public.support_requests
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
          )
        );
    `);
    console.log('New RLS policies created.');

  } catch (err) {
    console.error('Database setup error:', err.message);
  } finally {
    await client.end();
  }
}

setupSupportRequests();
