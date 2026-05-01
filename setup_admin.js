const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://skmcljcolcpqkmjjppdk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrbWNsamNvbGNwcWttampwcGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTQ0MzEsImV4cCI6MjA4OTQ5MDQzMX0.n0mP28rEXMlrJj8o1ivR_nvQ928I9-nSSspwWACUdgc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ADMIN_EMAIL = 'juanjopinazo@gmail.com';
const ADMIN_PASS = 'Jp@Jp26.AD2';

async function setupAdmin() {
  console.log(`Intentando registrar administrador: ${ADMIN_EMAIL}...`);
  
  // 1. Sign Up
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
        console.log('El usuario ya está registrado en Supabase Auth.');
        // Try to log in to get the session/id
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: ADMIN_EMAIL,
            password: ADMIN_PASS
        });
        
        if (signInError) {
            console.error('Error al iniciar sesión (posible contraseña incorrecta):', signInError.message);
            return;
        }
        
        console.log('Sesión obtenida correctamente.');
        await createProfile(signInData.user.id);
    } else {
        console.error('Error en el registro:', signUpError.message);
    }
  } else {
    console.log('Usuario registrado correctamente en Auth.');
    if (signUpData.user) {
        await createProfile(signUpData.user.id);
    }
  }
}

async function createProfile(userId) {
    console.log(`Creando/Actualizando perfil para el usuario: ${userId}...`);
    
    // Check if profile exists
    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
    if (existingProfile) {
        console.log('El perfil ya existe. Actualizando a rol admin...');
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', userId);
            
        if (updateError) {
            console.error('Error al actualizar el rol:', updateError.message);
            console.log('TIP: Si el error es de RLS (policy), tendrás que cambiar el rol manualmente en el dashboard de Supabase.');
        } else {
            console.log('Perfil actualizado a ADMIN con éxito.');
        }
    } else {
        const { error: insertError } = await supabase
            .from('profiles')
            .insert([
                { 
                    id: userId,
                    email: ADMIN_EMAIL,
                    nombre: 'Juanjo',
                    apellidos: 'Pinazo',
                    role: 'admin'
                }
            ]);
            
        if (insertError) {
            console.error('Error al crear el perfil:', insertError.message);
            console.log('TIP: Si el error es de RLS (policy), tendrás que crear el perfil manualmente en el dashboard de Supabase o ajustar las políticas.');
        } else {
            console.log('Perfil creado como ADMIN con éxito.');
        }
    }
}

setupAdmin();
