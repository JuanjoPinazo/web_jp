
import { getSupabaseAdmin } from '../lib/supabase-admin';

const users = [
  { email: 'planasdelviejo73@gmail.com', password: 'RbhE7yjuYNpH' },
  { email: 'ernestopicher@hotmail.com', password: 'smzGLNzQacw8' },
  { email: 'evarumiz@hotmail.com', password: 'yb3sPegAEV2c' },
  { email: 'fmpd@hotmail.es', password: 'bLYcXtJubffp' },
  { email: 'jimenezmazuecos@hotmail.com', password: 'x386@QWhMrTa' },
  { email: 'juanjo.pinazo@quilprocardio.com', password: 'juanjo26' },
  { email: 'jcgarlop@gmail.com', password: 'vsHjgZHekq9Q' },
  { email: 'jgcordobas@hotmail.com', password: '5NwkzKAuvZUJ' },
  { email: 'lauralacastabonet@gmail.com', password: 'hRx46YAbwP45' },
  { email: 'sandrasantosmartinez@gmail.com', password: 'rL4B3YA4SLt3' },
  { email: 'sara.ruiz86@hotmail.com', password: 'SLMQezsrLS6G' },
  { email: 'epbhva@yahoo.es', password: '2e3HhqWj6WFx' },
  { email: 'eperis0@gmail.com', password: '9WzePvggreq6' },
  { email: 'miguelleivag@gmail.com', password: '5bpQX8uzTzKM' },
  { email: 'marinamm62@gmail.com', password: '6yRxA2wwWerw' }
];

async function updatePasswords() {
  const supabase = getSupabaseAdmin();
  console.log('Iniciando actualización de contraseñas temporales...');

  for (const user of users) {
    console.log(`Actualizando ${user.email}...`);
    const { error } = await supabase
      .from('profiles')
      .update({ temp_password: user.password } as any)
      .eq('email', user.email);

    if (error) {
      console.error(`Error actualizando ${user.email}:`, error.message);
      if (error.message.includes('column "temp_password" does not exist')) {
        console.error('CRÍTICO: La columna temp_password no existe en la tabla profiles.');
        return;
      }
    } else {
      console.log(`✓ ${user.email} actualizado.`);
    }
  }
  console.log('Proceso completado.');
}

updatePasswords();
