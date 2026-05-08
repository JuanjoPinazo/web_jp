-- Update hospitality_event_attendees table
ALTER TABLE hospitality_event_attendees
ADD COLUMN IF NOT EXISTS guest_name text,
ADD COLUMN IF NOT EXISTS guest_email text,
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS last_updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Update RLS for attendees to ensure visibility
DROP POLICY IF EXISTS "Admins have full access to hospitality_event_attendees" ON hospitality_event_attendees;
CREATE POLICY "Management access for hospitality_event_attendees" 
  ON hospitality_event_attendees
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);
