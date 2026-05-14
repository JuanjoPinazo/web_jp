require('dotenv').config({ path: '.env.local' });

async function sendTest() {
  const { resend } = require('../src/lib/resend');
  const adminEmail = 'juanjo.pinazo@quilprocardio.com';
  const userEmail = 'test-client@example.com';
  const userName = 'Cliente de Prueba';

  console.log(`Sending test notification email to admin ${adminEmail}...`);

  try {
    const { data, error } = await resend.emails.send({
      from: 'JP Intelligence System <operaciones@quilprocardio.com>',
      to: [adminEmail],
      subject: `Notificación: Cambio de Contraseña - ${userName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #f9f9f9;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #eee; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <h2 style="color: #00e5ff; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; margin-top: 0;">Aviso de Seguridad</h2>
            <p style="font-size: 14px; color: #333; line-height: 1.5;">
              Le informamos que el usuario <strong>${userName}</strong> (${userEmail}) ha actualizado su contraseña de acceso a la plataforma JP Intelligence.
            </p>
            <p style="font-size: 14px; color: #333; line-height: 1.5;">
              Este cambio se ha registrado correctamente y el usuario ya dispone de su clave definitiva para acceder a su dossier operativo.
            </p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
            <p style="font-size: 11px; color: #999; font-style: italic; margin-bottom: 0;">
              Este es un mensaje automático generado por el sistema de control de accesos de JP Intelligence.
            </p>
          </div>
        </div>
      `
    });

    if (error) throw error;
    console.log('Notification email sent successfully:', data);
  } catch (err) {
    console.error('Error sending notification email:', err);
  }
}

sendTest();
