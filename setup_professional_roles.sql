-- 1. Create professional_roles table
CREATE TABLE IF NOT EXISTS public.professional_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text,
    name text NOT NULL,
    scope text NOT NULL CHECK (scope IN ('hospital', 'empresa', 'otro')),
    created_at timestamp with time zone DEFAULT now()
);

-- Ensure code column exists if table was already created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'professional_roles' AND column_name = 'code'
    ) THEN
        ALTER TABLE public.professional_roles ADD COLUMN code text;
    END IF;
END $$;

-- Ensure the unique constraint exists for ON CONFLICT to work
DO $$
BEGIN
    -- If code column exists and is NOT NULL, make it nullable to avoid errors during initial seeding
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'professional_roles' AND column_name = 'code' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.professional_roles ALTER COLUMN code DROP NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'professional_roles_name_scope_key'
    ) THEN
        ALTER TABLE public.professional_roles ADD CONSTRAINT professional_roles_name_scope_key UNIQUE (name, scope);
    END IF;

    -- Drop and recreate scope check constraint to ensure it matches our allowed values
    -- First, remove any existing check constraint on scope
    DECLARE
        constraint_name text;
    BEGIN
        SELECT conname INTO constraint_name
        FROM pg_constraint
        WHERE conname LIKE 'professional_roles_scope_check%' OR conname = 'professional_roles_scope_check';
        
        IF constraint_name IS NOT NULL THEN
            EXECUTE 'ALTER TABLE public.professional_roles DROP CONSTRAINT ' || constraint_name;
        END IF;

        -- ALSO drop any unique constraint on "code" that might conflict with our seed data
        SELECT conname INTO constraint_name
        FROM pg_constraint
        WHERE conname = 'professional_roles_code_key';
        
        IF constraint_name IS NOT NULL THEN
            EXECUTE 'ALTER TABLE public.professional_roles DROP CONSTRAINT ' || constraint_name;
        END IF;
    END;

    -- Migrate existing data to new scope keys if necessary
    UPDATE public.professional_roles SET scope = 'hospital' WHERE lower(scope) IN ('hospitalario', 'hosp');
    UPDATE public.professional_roles SET scope = 'empresa' WHERE lower(scope) IN ('empresarial', 'comp');
    -- Set any other invalid values to 'otro' to satisfy the constraint
    UPDATE public.professional_roles SET scope = 'otro' WHERE scope NOT IN ('hospital', 'empresa', 'otro');

    ALTER TABLE public.professional_roles ADD CONSTRAINT professional_roles_scope_check CHECK (scope IN ('hospital', 'empresa', 'otro'));
END $$;

-- 2. Insert some default roles
INSERT INTO public.professional_roles (name, scope, code) VALUES 
('Jefe de Servicio', 'hospital', 'JEFE-SERV'),
('Médico Adjunto', 'hospital', 'MED-ADJ'),
('Médico Residente', 'hospital', 'MED-RES'),
('Enfermero/a', 'hospital', 'ENF'),
('Supervisor/a', 'hospital', 'SUP'),
('Administrativo/a', 'hospital', 'ADM'),
('Gerencia', 'hospital', 'GER'),
('Delegado/a de Ventas', 'empresa', 'DEL-V'),
('Product Manager', 'empresa', 'PROD-M'),
('Director/a Comercial', 'empresa', 'DIR-C'),
('Soporte Técnico', 'empresa', 'SOP-T')
ON CONFLICT (name, scope) DO UPDATE SET 
    code = EXCLUDED.code;

-- 3. Modify access_requests
DO $$
BEGIN
    -- Drop old role_title text column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'access_requests' AND column_name = 'role_title' AND data_type = 'text') THEN
        ALTER TABLE public.access_requests DROP COLUMN role_title;
    END IF;

    -- Add professional_role_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'access_requests' AND column_name = 'professional_role_id') THEN
        ALTER TABLE public.access_requests ADD COLUMN professional_role_id uuid REFERENCES public.professional_roles(id);
    END IF;

    -- Add professional_role_manual
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'access_requests' AND column_name = 'professional_role_manual') THEN
        ALTER TABLE public.access_requests ADD COLUMN professional_role_manual text;
    END IF;

    -- Add assigned_professional_role_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'access_requests' AND column_name = 'assigned_professional_role_id') THEN
        ALTER TABLE public.access_requests ADD COLUMN assigned_professional_role_id uuid REFERENCES public.professional_roles(id);
    END IF;
END $$;

-- 4. Modify profiles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'professional_role_id') THEN
        ALTER TABLE public.profiles ADD COLUMN professional_role_id uuid REFERENCES public.professional_roles(id);
    END IF;
END $$;

-- 5. Enable RLS and Policies for professional_roles
ALTER TABLE public.professional_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access on professional_roles') THEN
        CREATE POLICY "Allow public read access on professional_roles" 
        ON public.professional_roles FOR SELECT 
        USING (true);
    END IF;
    
    -- For Admin CRUD, we need to allow all actions for authenticated users (since we don't have strict RBAC in postgres yet)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all actions for authenticated users on professional_roles') THEN
        CREATE POLICY "Allow all actions for authenticated users on professional_roles" 
        ON public.professional_roles FOR ALL 
        TO authenticated 
        USING (true) WITH CHECK (true);
    END IF;
END $$;
