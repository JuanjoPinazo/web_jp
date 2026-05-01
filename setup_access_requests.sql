-- 1. Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT now()
);

-- 1.5 Ensure UNIQUE constraint exists for ON CONFLICT to work
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'departments_name_key'
    ) THEN
        ALTER TABLE public.departments ADD CONSTRAINT departments_name_key UNIQUE (name);
    END IF;
END $$;

-- 2. Insert some default departments (optional, ignores duplicates)
INSERT INTO public.departments (name) VALUES 
('Cardiología'),
('Cirugía Cardiovascular'),
('Hemodinámica'),
('Cirugía General'),
('Traumatología'),
('Anestesiología'),
('Cuidados Intensivos (UCI)'),
('Urgencias')
ON CONFLICT (name) DO NOTHING;

-- 3. Create access_requests table if it doesn't exist (base structure)
CREATE TABLE IF NOT EXISTS public.access_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL UNIQUE,
    nombre text NOT NULL,
    hospital text, -- Legacy / general display (kept for backwards compatibility during migration)
    status text DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT now()
);

-- 4. Alter access_requests to add new robust columns idempotently
DO $$
BEGIN
    -- Add new columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'access_requests' AND column_name = 'phone') THEN
        ALTER TABLE public.access_requests ADD COLUMN phone text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'access_requests' AND column_name = 'hospital_id') THEN
        ALTER TABLE public.access_requests ADD COLUMN hospital_id uuid REFERENCES public.hospitals(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'access_requests' AND column_name = 'hospital_manual') THEN
        ALTER TABLE public.access_requests ADD COLUMN hospital_manual text;
    END IF;

    -- Add new department columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'access_requests' AND column_name = 'department_id') THEN
        ALTER TABLE public.access_requests ADD COLUMN department_id uuid REFERENCES public.departments(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'access_requests' AND column_name = 'department_manual') THEN
        ALTER TABLE public.access_requests ADD COLUMN department_manual text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'access_requests' AND column_name = 'role_title') THEN
        ALTER TABLE public.access_requests ADD COLUMN role_title text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'access_requests' AND column_name = 'reason') THEN
        ALTER TABLE public.access_requests ADD COLUMN reason text;
    END IF;

    -- Drop the old text department column if it was created accidentally
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'access_requests' AND column_name = 'department' AND data_type = 'text') THEN
        ALTER TABLE public.access_requests DROP COLUMN department;
    END IF;
END $$;

-- 5. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- 6. Policies for departments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access on departments') THEN
        CREATE POLICY "Allow public read access on departments" 
        ON public.departments FOR SELECT 
        USING (true);
    END IF;
END $$;

-- 7. Policies for access_requests
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public inserts on access_requests') THEN
        CREATE POLICY "Allow public inserts on access_requests" 
        ON public.access_requests FOR INSERT 
        WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow reading for authenticated users on access_requests') THEN
        CREATE POLICY "Allow reading for authenticated users on access_requests" 
        ON public.access_requests FOR SELECT 
        USING (true);
    END IF;
END $$;
