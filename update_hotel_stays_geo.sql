-- Actualización de la tabla hotel_stays para soportar geolocalización y catálogo maestro
ALTER TABLE public.hotel_stays 
ADD COLUMN IF NOT EXISTS master_hotel_id uuid REFERENCES public.hotels_master(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision;

-- Comentario informativo
COMMENT ON COLUMN public.hotel_stays.master_hotel_id IS 'Vinculación con el catálogo maestro de hoteles';
COMMENT ON COLUMN public.hotel_stays.latitude IS 'Latitud para cálculo de rutas inteligentes';
COMMENT ON COLUMN public.hotel_stays.longitude IS 'Longitud para cálculo de rutas inteligentes';

-- Actualización de la tabla contexts para soportar geolocalización de sedes/eventos
ALTER TABLE public.contexts
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision;

COMMENT ON COLUMN public.contexts.latitude IS 'Latitud de la sede del evento';
COMMENT ON COLUMN public.contexts.longitude IS 'Longitud de la sede del evento';

-- Actualización de la tabla hospitality_events para geolocalización de cenas/restaurantes
ALTER TABLE public.hospitality_events
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision;

COMMENT ON COLUMN public.hospitality_events.latitude IS 'Latitud del evento de hospitality';
COMMENT ON COLUMN public.hospitality_events.longitude IS 'Longitud del evento de hospitality';

-- Notificar a PostgREST para recargar el esquema (esto sucede automáticamente en Supabase, 
-- pero a veces el caché del navegador o de la sesión necesita un refresco)
