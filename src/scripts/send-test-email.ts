import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    });
  }
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTest() {
  const email = 'juanjo.pinazo@quilprocardio.com';
  
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('id, email, nombre')
    .eq('email', email)
    .single();

  if (userError || !user) {
    console.error('User not found:', userError);
    return;
  }

  const { data: { user: authUser } } = await supabase.auth.admin.getUserById(user.id);
  const isConfirmed = !!authUser?.email_confirmed_at;

  const linkType = isConfirmed ? 'magiclink' : 'invite';
  const { data: inviteData, error: linkError } = await supabase.auth.admin.generateLink({
    type: linkType,
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://jpintelligence.vercel.app'}/set-password`
    }
  });

  if (linkError || !inviteData || !inviteData.properties) {
    console.error('Link generation error:', linkError);
    return;
  }

  const invitationLink = inviteData.properties.action_link;

  const response = await resend.emails.send({
    from: 'JP Intelligence <operaciones@quilprocardio.com>',
    to: [email],
    subject: 'TEST: Bienvenido a JP Intelligence | Tu Dossier Operativo está listo',
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #000000; color: #ffffff; padding: 0; margin: 0; width: 100%;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #050505; border: 1px solid #1a1a1a;">
          <div style="padding: 40px 20px; text-align: center; border-bottom: 1px solid #1a1a1a;">
            <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -1px; margin: 0; text-transform: uppercase; color: #ffffff;">JP Intelligence</h1>
            <p style="font-size: 10px; color: #00e5ff; letter-spacing: 4px; text-transform: uppercase; margin: 10px 0 0 0; font-weight: 700;">Operational Platform</p>
          </div>
          <div style="padding: 50px 40px; text-align: center;">
            <h2 style="font-size: 32px; font-weight: 800; margin-bottom: 20px; line-height: 1.1;">Bienvenido a la Excelencia Operativa.</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #888; margin-bottom: 30px;">
              Hola, ${user.nombre || 'Juanjo'}. Has sido seleccionado para acceder a la plataforma de gestión logística integral de **JP Intelligence**.
            </p>
            <div style="text-align: center; margin: 40px 0;">
              <a href="${invitationLink}" style="display: inline-block; background-color: #00e5ff; color: #000000; padding: 20px 45px; border-radius: 12px; text-decoration: none; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 10px 20px rgba(0, 229, 255, 0.2);">
                Activar mi Cuenta Premium
              </a>
            </div>
          </div>
          <div style="padding: 0 40px 50px 40px;">
            <div style="background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 24px; padding: 30px; text-align: center;">
              <div style="width: 80px; height: 80px; margin: 0 auto 20px auto; border-radius: 50%; overflow: hidden; border: 2px solid #00e5ff;">
                <img src="${process.env.NEXT_PUBLIC_SITE_URL || 'https://jpintelligence.vercel.app'}/img_juanjo2.jpg" alt="Juanjo Pinazo" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
              </div>
              <p style="font-size: 10px; color: #00e5ff; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 5px 0; font-weight: 900;">Tu Coordinador Personal</p>
              <p style="font-size: 16px; color: #ffffff; font-weight: 800; margin: 0 0 10px 0;">Juanjo Pinazo</p>
              <p style="font-size: 12px; color: #666; margin: 0; line-height: 1.5;">
                "Estoy a tu disposición para asegurar que tu experiencia logística sea impecable. No dudes en contactarme para cualquier necesidad."
              </p>
            </div>
          </div>
          <div style="padding: 40px; text-align: center; background-color: #020202; border-top: 1px solid #1a1a1a;">
            <p style="font-size: 11px; color: #444; line-height: 1.6; margin: 0;">
              Este es un mensaje automático del sistema de operaciones de JP Intelligence.<br>
              Si tienes problemas para acceder, contacta con <a href="mailto:juanjo.pinazo@quilprocardio.com" style="color: #00e5ff; text-decoration: none;">juanjo.pinazo@quilprocardio.com</a>
            </p>
            <p style="font-size: 10px; color: #333; margin-top: 20px; text-transform: uppercase; letter-spacing: 1px;">
              © 2026 JP Intelligence Platform | Private & Confidential
            </p>
          </div>
        </div>
      </div>
    `
  });

  console.log('Email sent status:', !!response.data);
}

sendTest();
