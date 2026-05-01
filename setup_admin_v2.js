const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://skmcljcolcpqkmjjppdk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrbWNsamNvbGNwcWttampwcGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTQ0MzEsImV4cCI6MjA4OTQ5MDQzMX0.n0mP28rEXMlrJj8o1ivR_nvQ928I9-nSSspwWACUdgc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ADMIN_EMAIL = 'juanjopinazo@gmail.com';
const ADMIN_PASS = 'Jupica-1976-0610'; // Nueva clave sugerida

async function resetAndSetupAdmin() {
  console.log('--- REINICIO DE ADMINISTRADOR ---');
  console.log(`Email: ${ADMIN_EMAIL}`);
  console.log(`Nueva Clave: ${ADMIN_PASS}`);

  // Intenta registrar
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
    options: {
        data: {
            name: 'Juanjo',
            surname: 'Pinazo',
            role: 'admin'
        }
    }
  });

  if (signUpError) {
    if (signUpError.message.includes('already registered')) {
        console.log('---');
        console.log('¡AVISO! El usuario ya existe en Supabase.');
        console.log('Como no podemos cambiar la clave de un usuario sin confirmar desde aquí, por favor haz lo siguiente:');
        console.log('1. Ve al Dashboard de Supabase -> Authentication -> Users.');
        console.log('2. BORRA el usuario juanjopinazo@gmail.com.');
        console.log('3. Vuelve a ejecutar este script (node setup_admin_v2.js).');
        console.log('---');
    } else {
        console.error('Error en el registro:', signUpError.message);
    }
  } else {
    console.log('Usuario registrado correctamente en Auth con la NUEVA CLAVE.');
    console.log('IMPORTANTE: Ve a tu Dashboard -> Authentication -> Users y confirma el email manualmente (Confirm User).');
    console.log('Después, para crear el perfil corre este SQL en el Editor SQL de Supabase:');
    console.log(`
      INSERT INTO public.profiles (id, email, nombre, apellidos, role)
      VALUES (
        '${signUpData.user.id}',
        '${ADMIN_EMAIL}',
        'Juanjo',
        'Pinazo',
        'admin'
      )
      ON CONFLICT (id) DO UPDATE SET role = 'admin';
    `);
  }
}

resetAndSetupAdmin();
