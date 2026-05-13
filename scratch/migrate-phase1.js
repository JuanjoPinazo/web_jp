
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://skmcljcolcpqkmjjppdk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrbWNsamNvbGNwcWttampwcGRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkxNDQzMSwiZXhwIjoyMDg5NDkwNDMxfQ.UzBimOlc2haEvIksb7WW_U0NcYe7fZ11Txk5DMFrXx0';

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
-- 1. TABLA MAESTRA DE HOTELES
CREATE TABLE IF NOT EXISTS hotels_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    postal_code TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    stars INTEGER CHECK (stars >= 1 AND stars <= 5),
    rating DECIMAL(3,2),
    google_place_id TEXT UNIQUE,
    phone TEXT,
    website TEXT,
    checkin_time TIME DEFAULT '15:00',
    checkout_time TIME DEFAULT '12:00',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABLA DE CACHÉ DE RUTAS (TRAVEL_ROUTES)
CREATE TABLE IF NOT EXISTS travel_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID,
    origin_label TEXT,
    destination_label TEXT,
    origin_lat DOUBLE PRECISION NOT NULL,
    origin_lng DOUBLE PRECISION NOT NULL,
    destination_lat DOUBLE PRECISION NOT NULL,
    destination_lng DOUBLE PRECISION NOT NULL,
    travel_mode TEXT NOT NULL,
    distance_meters INTEGER,
    duration_seconds INTEGER,
    distance_text TEXT,
    duration_text TEXT,
    provider TEXT DEFAULT 'google',
    raw_response JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ÍNDICE ÚNICO DE CACHÉ
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_route_cache 
ON travel_routes (origin_lat, origin_lng, destination_lat, destination_lng, travel_mode);

-- 4. ACTUALIZACIÓN ROBUSTA DE TABLAS EXISTENTES
DO $$ 
BEGIN 
    -- Hospitality Events
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'hospitality_events') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='hospitality_events' AND column_name='latitude') THEN
            ALTER TABLE hospitality_events ADD COLUMN latitude DOUBLE PRECISION;
        END IF;
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='hospitality_events' AND column_name='longitude') THEN
            ALTER TABLE hospitality_events ADD COLUMN longitude DOUBLE PRECISION;
        END IF;
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='hospitality_events' AND column_name='google_place_id') THEN
            ALTER TABLE hospitality_events ADD COLUMN google_place_id TEXT;
        END IF;
    END IF;

    -- Hotel Stays
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'hotel_stays') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='hotel_stays' AND column_name='master_hotel_id') THEN
            ALTER TABLE hotel_stays ADD COLUMN master_hotel_id UUID REFERENCES hotels_master(id);
        END IF;
    END IF;
END $$;
`;

async function main() {
  console.log('🚀 Ejecutando migración SQL...');
  // Nota: supabase.rpc('exec_sql') solo funciona si has creado esa función previamente.
  // Intentaremos usar una consulta directa si el cliente lo permite o informar al usuario.
  // Como no podemos ejecutar SQL arbitrario vía API de Supabase sin una función RPC helper,
  // informaremos al usuario si falla, pero muchos entornos ya tienen 'exec_sql' configurado.
  
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    if (error.message.includes('function "exec_sql" does not exist')) {
      console.log('\n❌ La función RPC "exec_sql" no existe en Supabase.');
      console.log('Por favor, ejecuta el siguiente SQL manualmente en el SQL Editor de Supabase:\n');
      console.log(sql);
    } else {
      console.error('❌ Error ejecutando SQL:', error.message);
    }
  } else {
    console.log('✅ Migración completada con éxito.');
  }
}

main();
