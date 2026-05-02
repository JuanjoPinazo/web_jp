-- Update profiles table with onboarding tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_status text DEFAULT 'draft' CHECK (onboarding_status IN ('draft', 'invited', 'active')),
ADD COLUMN IF NOT EXISTS invitation_sent_at timestamptz;

-- Update existing profiles to 'active' if they have already signed in or have a name (legacy)
UPDATE public.profiles 
SET onboarding_status = 'active' 
WHERE onboarding_status = 'draft' AND (nombre IS NOT NULL OR apellidos IS NOT NULL);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_status ON public.profiles(onboarding_status);
