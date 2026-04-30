import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { nombre, email, hospital, department, role_title, reason, phone } = data;

    const { data: emailData, error } = await resend.emails.send({
      // Si la key de Resend no tiene un dominio verificado, usa onboarding@resend.dev
      from: 'Sistema JP Intelligence <onboarding@resend.dev>',
      // Cambia esto a tu email personal o donde quieras recibir las alertas
      to: ['juanjopinazo@gmail.com'], 
      subject: `Nueva Solicitud de Acceso: ${nombre}`,
      html: `
        <h2>Nueva Solicitud de Acceso a JP Intelligence Platform</h2>
        <p>Has recibido una nueva solicitud de acceso. Por favor revisa los detalles a continuación o ingresa al panel de administración para gestionarla.</p>
        <hr />
        <ul>
          <li><strong>Nombre:</strong> ${nombre}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Teléfono:</strong> ${phone || 'N/A'}</li>
          <li><strong>Hospital/Centro:</strong> ${hospital}</li>
          <li><strong>Departamento:</strong> ${department || 'N/A'}</li>
          <li><strong>Cargo:</strong> ${role_title || 'N/A'}</li>
        </ul>
        <h3>Motivo de la solicitud:</h3>
        <p><em>${reason || 'No especificado'}</em></p>
        <hr />
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/requests">Ver solicitudes pendientes en el Panel de Administración</a></p>
      `
    });

    if (error) {
      console.error('Error sending email via Resend:', error);
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: emailData });
  } catch (err: any) {
    console.error('API Route Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
