-- setup_travel_email_logs.sql
-- Create travel_email_logs table for audit purposes

CREATE TABLE IF NOT EXISTS public.travel_email_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id uuid REFERENCES public.contact_travel_plans(id) ON DELETE CASCADE NOT NULL,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    sent_at timestamp with time zone DEFAULT now(),
    recipient_email text NOT NULL,
    attachments_count integer DEFAULT 0,
    status text NOT NULL, -- 'sent', 'failed'
    error text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.travel_email_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow users to read their own email logs" ON public.travel_email_logs;
DROP POLICY IF EXISTS "Allow all for admins on email logs" ON public.travel_email_logs;

-- Policies
CREATE POLICY "Allow users to read their own email logs" ON public.travel_email_logs
    FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Allow all for admins on email logs" ON public.travel_email_logs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Indices
CREATE INDEX IF NOT EXISTS idx_travel_email_logs_plan ON public.travel_email_logs(plan_id);
CREATE INDEX IF NOT EXISTS idx_travel_email_logs_profile ON public.travel_email_logs(profile_id);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
