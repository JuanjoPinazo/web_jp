-- setup_coordinator_support.sql
-- 1. Create support_requests table
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

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if any to avoid collision
DROP POLICY IF EXISTS "Allow reading own support requests" ON public.support_requests;
DROP POLICY IF EXISTS "Allow inserting own support requests" ON public.support_requests;
DROP POLICY IF EXISTS "Allow updating own support requests" ON public.support_requests;
DROP POLICY IF EXISTS "Allow all for admins on support requests" ON public.support_requests;

-- 4. Create client policies
CREATE POLICY "Allow reading own support requests" ON public.support_requests
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Allow inserting own support requests" ON public.support_requests
    FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Allow updating own support requests" ON public.support_requests
    FOR UPDATE USING (profile_id = auth.uid());

-- 5. Create admin policy
CREATE POLICY "Allow all for admins on support requests" ON public.support_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
