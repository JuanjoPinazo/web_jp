-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users(id) PRIMARY KEY,
    email text UNIQUE NOT NULL,
    nombre text,
    apellidos text,
    role text DEFAULT 'client',
    telefono text,
    onboarding_status text DEFAULT 'draft',
    invitation_sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Ensure clients table exists (it should, but just in case)
CREATE TABLE IF NOT EXISTS public.clients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    domain text,
    external_id text,
    external_source text,
    synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(external_source, external_id)
);

-- 3. Ensure hospitals table exists
CREATE TABLE IF NOT EXISTS public.hospitals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text,
    name text NOT NULL,
    city text,
    location text,
    created_at timestamp with time zone DEFAULT now()
);

-- 4. Ensure departments table exists
CREATE TABLE IF NOT EXISTS public.departments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    hospital_id uuid REFERENCES public.hospitals(id),
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 5. Add references to profiles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'client_id') THEN
        ALTER TABLE public.profiles ADD COLUMN client_id uuid REFERENCES public.clients(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'hospital_id') THEN
        ALTER TABLE public.profiles ADD COLUMN hospital_id uuid REFERENCES public.hospitals(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'department_id') THEN
        ALTER TABLE public.profiles ADD COLUMN department_id uuid REFERENCES public.departments(id);
    END IF;
END $$;
