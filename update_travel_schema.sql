-- 1. Update travel_hotels table
ALTER TABLE public.travel_hotels 
ADD COLUMN IF NOT EXISTS traveler_name text,
ADD COLUMN IF NOT EXISTS confirmation_number text,
ADD COLUMN IF NOT EXISTS pin_code text,
ADD COLUMN IF NOT EXISTS breakfast_included boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cancellation_policy text,
ADD COLUMN IF NOT EXISTS provider text;

-- 2. Update travel_flights table
ALTER TABLE public.travel_flights 
ADD COLUMN IF NOT EXISTS reservation_code text,
ADD COLUMN IF NOT EXISTS passengers text,
ADD COLUMN IF NOT EXISTS baggage_info text,
ADD COLUMN IF NOT EXISTS provider text;

-- 3. Update travel_documents table to support associations
ALTER TABLE public.travel_documents 
ADD COLUMN IF NOT EXISTS related_entity text, -- 'hotel', 'flight', etc.
ADD COLUMN IF NOT EXISTS related_entity_id uuid;

-- 4. Ensure RLS is updated (if needed, but existing policies should cover new columns)
-- Existing policies are based on plan_id, so they should still work.

-- 5. Create storage bucket for travel documents if it doesn't exist
-- Note: This usually needs to be done via Supabase dashboard or API, 
-- but we can try to insert into storage.buckets if we have permissions.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('travel-documents', 'travel-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Allow public access to travel documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'travel-documents');

CREATE POLICY "Allow admins to upload travel documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'travel-documents' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
