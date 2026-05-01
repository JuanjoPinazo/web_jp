-- 1. Create hospitals table
CREATE TABLE IF NOT EXISTS public.hospitals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text,
    name text NOT NULL,
    city text,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    domain text,
    hospital_id uuid REFERENCES public.hospitals(id),
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Create contexts table
CREATE TABLE IF NOT EXISTS public.contexts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id),
    name text NOT NULL,
    type text,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT now()
);

-- 4. Create context_users table
CREATE TABLE IF NOT EXISTS public.context_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    context_id uuid REFERENCES public.contexts(id),
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, context_id)
);

-- 5. Add client_id to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'client_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN client_id uuid REFERENCES public.clients(id);
    END IF;

    -- Add city to hospitals if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'hospitals' AND column_name = 'city'
    ) THEN
        ALTER TABLE public.hospitals ADD COLUMN city text;
    END IF;
END $$;

-- 6. Insert some dummy data for Hospitals
INSERT INTO public.hospitals (name, city)
SELECT 'Hospital Universitario Quirónsalud', 'Madrid'
WHERE NOT EXISTS (SELECT 1 FROM public.hospitals WHERE name = 'Hospital Universitario Quirónsalud');

INSERT INTO public.hospitals (name, city)
SELECT 'Hospital Clínic', 'Barcelona'
WHERE NOT EXISTS (SELECT 1 FROM public.hospitals WHERE name = 'Hospital Clínic');

-- 7. ENABLE ROW LEVEL SECURITY AND ADD POLICIES
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_users ENABLE ROW LEVEL SECURITY;

-- For MVP, allow full access to authenticated users
CREATE POLICY "Allow all actions for authenticated users on hospitals" ON public.hospitals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated users on clients" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated users on contexts" ON public.contexts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated users on context_users" ON public.context_users FOR ALL TO authenticated USING (true) WITH CHECK (true);
