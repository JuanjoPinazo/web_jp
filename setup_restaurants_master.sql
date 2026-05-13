-- Creación de la tabla maestro de restaurantes
CREATE TABLE IF NOT EXISTS public.restaurants_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    cuisine_type TEXT,
    google_place_id TEXT UNIQUE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    preferred BOOLEAN DEFAULT false,
    rating NUMERIC(3,2),
    price_level INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.restaurants_master ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso (Admin puede todo, Clientes pueden leer si están habilitados)
CREATE POLICY "Enable all access for authenticated users" ON public.restaurants_master
    FOR ALL USING (auth.role() = 'authenticated');

-- Vincular hospitality_events con el catálogo maestro
ALTER TABLE public.hospitality_events 
ADD COLUMN IF NOT EXISTS master_restaurant_id UUID REFERENCES public.restaurants_master(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.hospitality_events.master_restaurant_id IS 'Vinculación con el catálogo maestro de restaurantes';

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_restaurants_master_updated_at
    BEFORE UPDATE ON public.restaurants_master
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
