import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const resend = new Resend(process.env.RESEND_API_KEY);

async function run() {
  const targetEmail = 'juanjo.pinazo@quilprocardio.com';
  console.log('Sending test email to:', targetEmail);

  try {
    const res = await resend.emails.send({
      from: 'JP Intelligence <operaciones@quilprocardio.com>',
      to: [targetEmail],
      subject: 'Verificación de Nueva Clave - JP Intelligence',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #00e5ff;">¡Clave de Resend Verificada!</h2>
          <p>Este es un correo de prueba enviado desde <strong>operaciones@quilprocardio.com</strong> usando tu nueva API Key de Resend.</p>
          <p>Si estás leyendo esto, significa que el dominio está correctamente verificado y los envíos de logística están operativos.</p>
          <hr/>
          <p style="font-size: 12px; color: #666;">JP Intelligence Platform · Operations</p>
        </div>
      `
    });
    console.log('Result:', res);
  } catch (err) {
    console.error('Failed:', err);
  }
}

run();
