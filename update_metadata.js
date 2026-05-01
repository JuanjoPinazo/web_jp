const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://skmcljcolcpqkmjjppdk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrbWNsamNvbGNwcWttampwcGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTQ0MzEsImV4cCI6MjA4OTQ5MDQzMX0.n0mP28rEXMlrJj8o1ivR_nvQ928I9-nSSspwWACUdgc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ADMIN_EMAIL = 'juanjopinazo@gmail.com';
const ADMIN_PASS = 'Jp@Jp26.AD2';

async function updateMetadata() {
  console.log(`Iniciando sesión para actualizar metadatos de: ${ADMIN_EMAIL}...`);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASS
  });

  if (error) {
    console.error('Error al iniciar sesión:', error.message);
    return;
  }

  console.log('Sesión iniciada. Actualizando metadatos...');

  const { data: updateData, error: updateError } = await supabase.auth.updateUser({
    data: { 
        role: 'admin',
        name: 'Juanjo',
        surname: 'Pinazo'
    }
  });

  if (updateError) {
    console.error('Error al actualizar metadatos:', updateError.message);
  } else {
    console.log('Metadatos actualizados con éxito. Rol ADMIN asignado en metadatos.');
    console.log('Ahora intenta entrar en /admin/admin con tus credenciales.');
  }
}

updateMetadata();
