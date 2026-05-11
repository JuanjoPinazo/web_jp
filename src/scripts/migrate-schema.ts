
// @ts-ignore
import { Client } from 'pg';

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL no encontrada en el entorno.');
    return;
  }

  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Conectado a Postgres...');

    console.log('Añadiendo columna temp_password a profiles si no existe...');
    await client.query(`
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS temp_password TEXT;
    `);
    
    console.log('✓ Columna temp_password añadida/verificada.');
    
    console.log('Añadiendo columna image_url a hospitality_events si no existe...');
    await client.query(`
      ALTER TABLE hospitality_events 
      ADD COLUMN IF NOT EXISTS image_url TEXT;
    `);
    console.log('✓ Columna image_url añadida/verificada.');
  } catch (err: any) {
    console.error('Error en la migración:', err.message);
  } finally {
    await client.end();
  }
}

migrate();
