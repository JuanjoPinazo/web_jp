-- setup_initial_hospitals.sql
-- 1. Ensure the hospitals table has the new 'code' column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'hospitals' AND column_name = 'code'
    ) THEN
        ALTER TABLE public.hospitals ADD COLUMN code text;
    END IF;

    -- Ensure unique constraint on name for ON CONFLICT to work
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'hospitals_name_key'
    ) THEN
        ALTER TABLE public.hospitals ADD CONSTRAINT hospitals_name_key UNIQUE (name);
    END IF;
END $$;

-- 2. Insert or update top Spanish hospitals with Codes
INSERT INTO public.hospitals (code, name, city) VALUES 
('HLA Vistahermosa', 'CLINICA VISTAHERMOSA GRUPO HLA', 'Alicante'),
('Gral. Albacete', 'COMPLEJO HOSPITALARIO UNIVERSITARIO DE ALBACETE', 'Albacete'),
('Gral. Valencia', 'CONSORCIO HOSPITAL GENERAL UNIVERSITARIO DE VALENCIA', 'Valencia'),
('Arnau', 'HOSPITAL ARNAU DE VILANOVA', 'Valencia'),
('Casa Salud', 'HOSPITAL CATOLICO CASA DE SALUD', 'Valencia'),
('HCB Benidorm', 'HOSPITAL CLINICA BENIDORM', 'Alicante'),
('Clínico', 'HOSPITAL CLINICO UNIVERSITARIO DE VALENCIA', 'Valencia'),
('Arrixaca', 'HOSPITAL CLINICO UNIVERSITARIO VIRGEN DE LA ARRIXACA', 'Murcia'),
('Vinaròs', 'HOSPITAL COMARCAL DE VINARÒS', 'Castellón'),
('Dénia', 'HOSPITAL DE DENIA', 'Alicante'),
('Manises', 'HOSPITAL DE MANISES', 'Valencia'),
('Gral. Castellón', 'HOSPITAL GENERAL UNIVERSITARIO DE CASTELLON', 'Castellón'),
('Gral. Elche', 'HOSPITAL GENERAL UNIVERSITARIO DE ELCHE', 'Alicante'),
('Elda', 'HOSPITAL GENERAL UNIVERSITARIO DE ELDA', 'Alicante'),
('Gral. Alicante', 'HOSPITAL GENERAL UNIVERSITARIO DR. BALMIS', 'Alicante'),
('Los Arcos', 'HOSPITAL GENERAL UNIVERSITARIO LOS ARCOS DEL MAR MENOR', 'Murcia'),
('Santa Lucía', 'HOSPITAL GENERAL UNIVERSITARIO SANTA LUCÍA', 'Murcia'),
('HLA La Vega', 'HOSPITAL HLA LA VEGA', 'Murcia'),
('IMED Elche', 'HOSPITAL IMED ELCHE', 'Alicante'),
('IMED Levante', 'HOSPITAL IMED LEVANTE', 'Alicante'),
('IMED Valencia', 'HOSPITAL IMED VALENCIA', 'Valencia'),
('IMED Murcia', 'HOSPITAL IMED VIRGEN DE LA FUENSANTA', 'Murcia'),
('Quirón Albacete', 'HOSPITAL QUIRÓNSALUD ALBACETE', 'Albacete'),
('Quirón Murcia', 'HOSPITAL QUIRÓNSALUD MURCIA', 'Murcia'),
('Quirón Torrevieja', 'HOSPITAL QUIRONSALUD TORREVIEJA', 'Alicante'),
('Quirón Valencia', 'HOSPITAL QUIRONSALUD VALENCIA', 'Valencia'),
('HLA San Carlos', 'HOSPITAL SAN CARLOS DE DENIA GRUPO HLA', 'Alicante'),
('La Ribera', 'HOSPITAL UNIVERSITARIO DE LA RIBERA', 'Valencia'),
('Sagunto', 'HOSPITAL UNIVERSITARIO DE SAGUNTO', 'Valencia'),
('Torrevieja', 'HOSPITAL UNIVERSITARIO DE TORREVIEJA', 'Alicante'),
('Vinalopó', 'HOSPITAL UNIVERSITARIO DE VINALOPO', 'Alicante'),
('Dr. Peset', 'HOSPITAL UNIVERSITARIO DR. PESET ALEIXANDRE', 'Valencia'),
('Gandía', 'HOSPITAL UNIVERSITARIO FRANCESC DE BORJA', 'Valencia'),
('San Juan', 'HOSPITAL UNIVERSITARIO SAN JUAN DE ALICANTE', 'Alicante'),
('La Fé', 'HOSPITAL UNIVERSITARIO Y POLITECNICO LA FE', 'Valencia'),
('Orihuela', 'HOSPITAL VEGA BAJA DE ORIHUELA', 'Alicante'),
('Alcoy', 'HOSPITAL VIRGEN DE LOS LIRIOS', 'Alicante'),
('Vithas 9dO', 'HOSPITAL VITHAS 9 DE OCTUBRE', 'Valencia'),
('Vithas Castellón', 'HOSPITAL VITHAS CASTELLÓN', 'Castellón'),
('Vithas Consuelo', 'HOSPITAL VITHAS VALENCIA CONSUELO', 'Valencia'),
('SMS Plataforma', 'SERVICIO MURCIANO DE SALUD', 'Murcia'),
('Vithas Alicante', 'VITHAS HOSPITAL PERPETUO INTERNACIONAL', 'Alicante')
ON CONFLICT (name) DO UPDATE SET 
    code = EXCLUDED.code,
    city = EXCLUDED.city;

-- 3. Ensure public read access is enabled for the public registration form
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access on hospitals') THEN
        CREATE POLICY "Allow public read access on hospitals" 
        ON public.hospitals FOR SELECT 
        USING (true);
    END IF;
END $$;
