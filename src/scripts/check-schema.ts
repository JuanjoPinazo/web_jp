
import { getSupabaseAdmin } from '../lib/supabase-admin';

async function main() {
  const supabase = getSupabaseAdmin();
  console.log('Añadiendo columna temp_password a la tabla profiles...');
  
  // Como no podemos ejecutar SQL directamente fácilmente sin psql, 
  // intentaremos hacer un RPC si existe o simplemente asumiremos que el usuario puede añadirla.
  // Pero para este entorno, intentaré usar el cliente de supabase para ver si puedo 'deducir' si existe.
  
  const { data, error } = await supabase
    .from('profiles')
    .select('temp_password')
    .limit(1);

  if (error && error.message.includes('column "temp_password" does not exist')) {
    console.log('La columna no existe. Por favor, ejecuta este SQL en tu consola de Supabase:');
    console.log('ALTER TABLE profiles ADD COLUMN temp_password TEXT;');
  } else {
    console.log('La columna ya existe o hay otro error:', error?.message || 'Ninguno');
  }
}

main();
