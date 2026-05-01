-- update_profiles_schema.sql
-- 1. Ensure profiles table has hospital_id and department_id for tracking the user's professional location
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'hospital_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN hospital_id uuid REFERENCES public.hospitals(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'department_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN department_id uuid REFERENCES public.departments(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'access_requests' AND column_name = 'assigned_client_id'
    ) THEN
        ALTER TABLE public.access_requests ADD COLUMN assigned_client_id uuid REFERENCES public.clients(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'access_requests' AND column_name = 'assigned_hospital_id'
    ) THEN
        ALTER TABLE public.access_requests ADD COLUMN assigned_hospital_id uuid REFERENCES public.hospitals(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'access_requests' AND column_name = 'assigned_department_id'
    ) THEN
        ALTER TABLE public.access_requests ADD COLUMN assigned_department_id uuid REFERENCES public.departments(id);
    END IF;
END $$;
