const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Sup@Jp26.AD2@db.skmcljcolcpqkmjjppdk.supabase.co:5432/postgres';

const client = new Client({
  connectionString: connectionString,
});

const USER_ID = '72ecb416-5c30-4b2f-9659-5abfe5e5c611'; // Obtained from previous run
const EMAIL = 'juanjopinazo@gmail.com';

async function directSetup() {
  try {
    await client.connect();
    console.log('Conectado a la base de datos directamente...');

    // Insert into profiles
    const query = `
      INSERT INTO profiles (id, email, nombre, apellidos, role)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE
      SET role = 'admin', nombre = 'Juanjo', apellidos = 'Pinazo';
    `;
    
    const values = [USER_ID, EMAIL, 'Juanjo', 'Pinazo', 'admin'];
    
    await client.query(query, values);
    console.log('Perfil creado/actualizado como ADMIN con éxito en la base de datos.');

  } catch (err) {
    console.error('Error en la base de datos:', err.message);
  } finally {
    await client.end();
  }
}

directSetup();
