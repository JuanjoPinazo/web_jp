-- Add status to hospitality_events
ALTER TABLE hospitality_events ADD COLUMN IF NOT EXISTS status text DEFAULT 'planned';
