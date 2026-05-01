-- fix_access_requests_rls.sql

DO $$
BEGIN
    -- Ensure RLS is enabled for access_requests
    ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

    -- Allow all operations for authenticated users (admins) on access_requests
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for authenticated on access_requests') THEN
        CREATE POLICY "Allow all for authenticated on access_requests" ON public.access_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    
    -- Allow insert for unauthenticated users (so public users can submit their requests)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert for anon on access_requests') THEN
        CREATE POLICY "Allow insert for anon on access_requests" ON public.access_requests FOR INSERT TO anon WITH CHECK (true);
    END IF;
END $$;
