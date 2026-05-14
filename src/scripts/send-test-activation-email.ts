require('dotenv').config({ path: '.env.local' });

async function sendTest() {
  const { resend } = require('../lib/resend');
  const email = 'juanjo.pinazo@quilprocardio.com';
  const name = 'Juanjo';
  const temporaryPassword = 'TEST-PWD-2026';

  console.log(`Sending test activation email to ${email}...`);

  try {
    const { data, error } = await resend.emails.send({
      from: 'JP Intelligence <operaciones@quilprocardio.com>',
      to: [email],
      subject: 'PRUEBA: Acceso a JP Intelligence | Tus credenciales están listas',
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #000000; color: #ffffff; padding: 0; margin: 0; width: 100%;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #050505; border: 1px solid #1a1a1a;">
            <div style="padding: 40px 20px; text-align: center; border-bottom: 1px solid #1a1a1a;">
              <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -1px; margin: 0; text-transform: uppercase; color: #ffffff;">JP Intelligence</h1>
              <p style="font-size: 10px; color: #00e5ff; letter-spacing: 4px; text-transform: uppercase; margin: 10px 0 0 0; font-weight: 700;">Operational Access</p>
            </div>
            <div style="padding: 50px 40px; text-align: center;">
              <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 20px; line-height: 1.1;">Tu Dossier está Activado.</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #888; margin-bottom: 30px;">
                Hola, ${name}. Tu cuenta ha sido activada por la dirección de operaciones. Ya puedes acceder a tu plataforma logística con las siguientes credenciales temporales:
              </p>
              <div style="background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 16px; padding: 25px; margin: 30px 0; text-align: left;">
                <p style="margin: 0 0 15px 0; font-size: 12px; color: #444; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Credenciales de Acceso:</p>
                <div style="margin-bottom: 10px;">
                  <span style="color: #666; font-size: 11px; text-transform: uppercase;">Usuario:</span>
                  <p style="margin: 5px 0 0 0; font-family: monospace; color: #ffffff; font-weight: 700; font-size: 14px;">${email}</p>
                </div>
                <div>
                  <span style="color: #666; font-size: 11px; text-transform: uppercase;">Contraseña Temporal:</span>
                  <p style="margin: 5px 0 0 0; font-family: monospace; color: #00e5ff; font-weight: 900; font-size: 16px; letter-spacing: 1px;">${temporaryPassword}</p>
                </div>
              </div>
              <div style="text-align: center; margin: 40px 0;">
                <a href="https://jpintelligence.vercel.app/login" style="display: inline-block; background-color: #00e5ff; color: #000000; padding: 18px 40px; border-radius: 12px; text-decoration: none; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">
                  Entrar en la Plataforma
                </a>
              </div>
            </div>
            <div style="padding: 40px; text-align: center; background-color: #020202; border-top: 1px solid #1a1a1a;">
              <p style="font-size: 10px; color: #333; text-transform: uppercase; letter-spacing: 1px; margin: 0;">
                © 2026 JP Intelligence Platform | Private & Confidential
              </p>
            </div>
          </div>
        </div>
      `
    });

    if (error) throw error;
    console.log('Email sent successfully:', data);
  } catch (err) {
    console.error('Error sending email:', err);
  }
}

sendTest();
