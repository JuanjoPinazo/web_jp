-- fix_clients_contexts.sql

-- 1. Enhance clients table
DO $$
BEGIN
    -- Add hospital_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'hospital_id') THEN
        ALTER TABLE public.clients ADD COLUMN hospital_id uuid REFERENCES public.hospitals(id);
    END IF;

    -- Add department_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'department_id') THEN
        ALTER TABLE public.clients ADD COLUMN department_id uuid REFERENCES public.departments(id);
    END IF;

    -- Add domain if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'domain') THEN
        ALTER TABLE public.clients ADD COLUMN domain text;
    END IF;
END $$;

-- 2. Enhance contexts table
DO $$
BEGIN
    -- Add client_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contexts' AND column_name = 'client_id') THEN
        ALTER TABLE public.contexts ADD COLUMN client_id uuid REFERENCES public.clients(id);
    END IF;

    -- Add type if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contexts' AND column_name = 'type') THEN
        ALTER TABLE public.contexts ADD COLUMN type text DEFAULT 'event';
    END IF;

    -- Add start_date if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contexts' AND column_name = 'start_date') THEN
        ALTER TABLE public.contexts ADD COLUMN start_date timestamp with time zone DEFAULT now();
    END IF;

    -- Add end_date if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contexts' AND column_name = 'end_date') THEN
        ALTER TABLE public.contexts ADD COLUMN end_date timestamp with time zone DEFAULT now();
    END IF;
END $$;

-- 3. Ensure RLS for authenticated users
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contexts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Clients policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read access for authenticated users on clients') THEN
        CREATE POLICY "Allow read access for authenticated users on clients" ON public.clients FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for admin on clients') THEN
        CREATE POLICY "Allow all for admin on clients" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- Contexts policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read access for authenticated users on contexts') THEN
        CREATE POLICY "Allow read access for authenticated users on contexts" ON public.contexts FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for admin on contexts') THEN
        CREATE POLICY "Allow all for admin on contexts" ON public.contexts FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;
