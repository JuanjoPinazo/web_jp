-- Infraestructura de Recomendaciones para Dashboard JP

-- 1. Asegurar que existe la tabla de recomendaciones
CREATE TABLE IF NOT EXISTS public.recommendations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    categoria text,
    rating numeric,
    descripcion text,
    imagen_url text,
    user_id uuid REFERENCES auth.users(id),
    context_id text,
    client_id uuid, -- Puede ser un ID de organizacion o perfil
    activo boolean DEFAULT true,
    tags text[],
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Función RPC para obtener recomendaciones orquestadas
-- Esta función combina niveles de inteligencia para el dashboard
CREATE OR REPLACE FUNCTION get_user_recommendations(target_user_id uuid)
RETURNS TABLE (
    id uuid,
    title text,
    categoria text,
    rating numeric,
    descripcion text,
    imagen_url text,
    source_level text,
    activo boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id, 
        r.title, 
        r.categoria, 
        r.rating, 
        r.descripcion, 
        r.imagen_url,
        CASE 
            WHEN r.user_id = target_user_id THEN 'USER'
            WHEN r.context_id IS NOT NULL THEN 'CONTEXT'
            ELSE 'CLIENT'
        END as source_level,
        r.activo
    FROM recommendations r
    WHERE 
        r.activo = true 
        AND (
            r.user_id = target_user_id 
            OR r.context_id = 'EuroPCR' -- Contexto activo detectado
            OR r.client_id IS NOT NULL   -- Recomendaciones generales de cliente
        )
    ORDER BY 
        CASE 
            WHEN r.user_id = target_user_id THEN 1
            WHEN r.context_id IS NOT NULL THEN 2
            ELSE 3
        END ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Habilitar RLS (Seguridad)
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública para simplificar el MVP
-- En producción esto debería estar filtrado por user_id/client_id
CREATE POLICY "Lectura democratizada de recomendaciones" 
ON public.recommendations FOR SELECT 
USING (true);
