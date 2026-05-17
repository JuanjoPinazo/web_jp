import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);

function fmtDate(dateStr: string | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return '—';
  try {
    const defaultOpts: Intl.DateTimeFormatOptions = {
      day: '2-digit', month: 'long', year: 'numeric',
      timeZone: 'UTC',
      ...opts,
    };
    return new Date(dateStr).toLocaleDateString('es-ES', defaultOpts);
  } catch {
    return dateStr;
  }
}

function fmtTime(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  try {
    const t = dateStr.split('T')[1];
    return t ? t.substring(0, 5) : '—';
  } catch {
    return '—';
  }
}

function fmtDateTime(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return `${fmtDate(dateStr, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })} · ${fmtTime(dateStr)}`;
}

function transferTypeLabel(type: string): string {
  const map: Record<string, string> = {
    airport_to_hotel: 'Aeropuerto → Hotel',
    hotel_to_airport: 'Hotel → Aeropuerto',
    hotel_to_venue: 'Hotel → Sede / Venue',
    venue_to_hotel: 'Sede / Venue → Hotel',
    airport_to_venue: 'Aeropuerto → Sede / Venue',
    venue_to_airport: 'Sede / Venue → Aeropuerto',
  };
  return map[type] || type?.replace(/_/g, ' ') || 'Traslado';
}

function eventTypeLabel(type: string): string {
  const map: Record<string, string> = {
    dinner: 'Cena',
    lunch: 'Almuerzo',
    meeting: 'Reunión',
    experience: 'Experiencia',
  };
  return map[type] || type || 'Evento';
}

function buildHtml(data: {
  nombre: string;
  evento: string;
  flights: any[];
  hotels: any[];
  transfers: any[];
  hospitality: any[];
  restaurants: any[];
  coordinator: any | null;
  siteUrl: string;
  credentials?: { email: string; password: string };
}): string {
  const { nombre, evento, flights, hotels, transfers, hospitality, restaurants, coordinator, siteUrl, credentials } = data;

  const accent = '#00e5ff';
  const bg = '#ffffff';
  const surface = '#f8fafc';
  const border = '#e2e8f0';
  const muted = '#64748b';
  const textPrimary = '#0f172a';

  const sectionHeader = (title: string, imageUrl: string) => `
    <tr>
      <td style="padding: 4px 0 2px 0;">
        <table cellpadding="0" cellspacing="0" width="100%" bgcolor="${textPrimary}" style="background-color: ${textPrimary}; background-image: url('${imageUrl}'); background-size: cover; background-position: center; border-radius: 20px; overflow: hidden;">
          <!--[if gte mso 9]>
          <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:80px;">
            <v:fill type="frame" src="${imageUrl}" color="${textPrimary}" />
            <v:textbox inset="0,0,0,0">
          <![endif]-->
          <tr>
            <td style="padding: 32px 24px 12px 24px; text-align: left; background: linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.7)); height: 80px;">
              <h2 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 2px;">${title}</h2>
            </td>
          </tr>
          <!--[if gte mso 9]>
            </v:textbox>
          </v:rect>
          <![endif]-->
        </table>
      </td>
    </tr>`;

  const infoRow = (label: string, value: string) => `
    <tr>
      <td style="padding: 6px 0; width: 140px; font-size: 11px; color: ${muted}; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; vertical-align: top;">${label}</td>
      <td style="padding: 6px 0; font-size: 14px; color: ${textPrimary}; font-weight: 600; vertical-align: top;">${value}</td>
    </tr>`;

  // ── VUELOS ───────────────────────────────────────────────────────────────────
  const flightsHtml = flights.length === 0 ? '' : `
    ${sectionHeader('Vuelos', 'https://images.unsplash.com/photo-1542296332-2e4473faf563?q=80&w=1200&auto=format&fit=crop')}
    ${flights.map(f => `
    <tr>
      <td style="padding: 0 0 4px 0;">
        <table cellpadding="0" cellspacing="0" width="100%" style="background: ${surface}; border: 1px solid ${border}; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 20px 24px; border-bottom: 1px solid ${border}; background: #ffffff;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 18px; font-weight: 900; color: ${textPrimary}; letter-spacing: -0.5px;">${f.flight_number || 'Vuelo'}</span>
                    ${f.airline ? `<span style="font-size: 11px; color: ${muted}; margin-left: 10px; font-weight: 700; text-transform: uppercase;">${f.airline}</span>` : ''}
                  </td>
                  <td style="text-align: right;">
                    <span style="font-size: 11px; color: ${accent}; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; background: #e0faff; padding: 6px 12px; border-radius: 8px;">
                      ${f.status === 'confirmed' ? 'Confirmado' : f.status === 'cancelled' ? 'Cancelado' : 'Previsto'}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="width: 44%; vertical-align: top;">
                    <p style="margin: 0; font-size: 26px; font-weight: 900; color: ${textPrimary}; letter-spacing: -1px;">${f.departure_location || '—'}</p>
                    <p style="margin: 6px 0 0 0; font-size: 22px; font-weight: 800; color: ${accent};">${fmtTime(f.departure_time)}</p>
                    <p style="margin: 6px 0 0 0; font-size: 12px; color: ${muted}; font-weight: 600;">${fmtDate(f.departure_time, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}</p>
                    ${f.departure_terminal ? `<p style="margin: 6px 0 0 0; font-size: 11px; color: ${muted}; font-weight: 700; text-transform: uppercase;">Terminal ${f.departure_terminal}</p>` : ''}
                  </td>
                  <td style="width: 12%; text-align: center; vertical-align: middle;">
                    <div style="font-size: 24px; color: ${border};">→</div>
                  </td>
                  <td style="width: 44%; vertical-align: top; text-align: right;">
                    <p style="margin: 0; font-size: 26px; font-weight: 900; color: ${textPrimary}; letter-spacing: -1px;">${f.arrival_location || '—'}</p>
                    <p style="margin: 6px 0 0 0; font-size: 22px; font-weight: 800; color: ${accent};">${fmtTime(f.arrival_time)}</p>
                    <p style="margin: 6px 0 0 0; font-size: 12px; color: ${muted}; font-weight: 600;">${fmtDate(f.arrival_time, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}</p>
                    ${f.arrival_terminal ? `<p style="margin: 6px 0 0 0; font-size: 11px; color: ${muted}; font-weight: 700; text-transform: uppercase;">Terminal ${f.arrival_terminal}</p>` : ''}
                  </td>
                </tr>
              </table>
              ${(f.seat || f.booking_reference || f.reservation_code || f.baggage_info || f.checkin_deadline || f.check_in_url) ? `
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px; padding-top: 24px; border-top: 1px solid ${border};">
                ${f.seat ? infoRow('Asiento', f.seat) : ''}
                ${f.booking_reference || f.reservation_code ? infoRow('Localizador', f.booking_reference || f.reservation_code) : ''}
                ${f.baggage_info ? infoRow('Equipaje', f.baggage_info) : ''}
                ${f.checkin_deadline ? infoRow('Check-in antes de', fmtTime(f.checkin_deadline)) : ''}
                ${f.check_in_url ? `<tr><td colspan="2" style="padding-top: 16px;"><a href="${f.check_in_url}" style="display: inline-block; background: ${accent}; color: #ffffff; padding: 12px 24px; border-radius: 12px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; text-decoration: none; box-shadow: 0 4px 10px rgba(0,229,255,0.2);">Hacer Check-in Online →</a></td></tr>` : ''}
              </table>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join('')}`;

  // ── HOTELES ──────────────────────────────────────────────────────────────────
  const hotelsHtml = hotels.length === 0 ? '' : `
    ${sectionHeader('Alojamiento', 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200&auto=format&fit=crop')}
    ${hotels.map(h => `
    <tr>
      <td style="padding: 0 0 16px 0;">
        <table cellpadding="0" cellspacing="0" width="100%" style="background: ${surface}; border: 1px solid ${border}; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 20px 24px; border-bottom: 1px solid ${border}; background: #ffffff;">
              <p style="margin: 0; font-size: 18px; font-weight: 900; color: ${textPrimary};">${h.hotel_name || '—'}</p>
              ${h.address ? `<p style="margin: 6px 0 0 0; font-size: 12px; color: ${muted}; font-weight: 600;">${h.address}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="width: 48%; vertical-align: top;">
                    <p style="margin: 0; font-size: 11px; color: ${muted}; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Check-in</p>
                    <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: 900; color: ${textPrimary};">${fmtDate(h.check_in, { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })}</p>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: ${accent}; font-weight: 800;">A partir de las ${h.check_in_time || '15:00'}</p>
                  </td>
                  <td style="width: 4%; text-align: center; color: ${border}; font-size: 24px; vertical-align: middle;">→</td>
                  <td style="width: 48%; vertical-align: top; text-align: right;">
                    <p style="margin: 0; font-size: 11px; color: ${muted}; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Check-out</p>
                    <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: 900; color: ${textPrimary};">${fmtDate(h.check_out, { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })}</p>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: ${accent}; font-weight: 800;">Antes de las ${h.check_out_time || '12:00'}</p>
                  </td>
                </tr>
                ${(h.booking_reference || h.room_type || h.breakfast_included !== undefined || h.phone) ? `
                <tr><td colspan="3"><table cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px; padding-top: 24px; border-top: 1px solid ${border};">
                  ${h.booking_reference ? infoRow('Reserva', h.booking_reference) : ''}
                  ${h.room_type ? infoRow('Habitación', h.room_type) : ''}
                  ${h.breakfast_included !== undefined ? infoRow('Desayuno', h.breakfast_included ? 'Incluido ✓' : 'No incluido') : ''}
                  ${h.phone ? infoRow('Tel. Hotel', h.phone) : ''}
                  ${h.nights ? infoRow('Noches', `${h.nights}`) : ''}
                </table></td></tr>` : ''}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join('')}`;

  // ── TRANSFERS ────────────────────────────────────────────────────────────────
  const transfersHtml = `
    ${sectionHeader('Traslados', 'https://images.unsplash.com/photo-1554310603-d39d43033735?q=80&w=1200&auto=format&fit=crop')}
    ${transfers.length === 0 ? `
    <tr>
      <td style="padding: 0 0 16px 0;">
        <table cellpadding="0" cellspacing="0" width="100%" style="background: #fff8e6; border: 1px solid #ffeeba; border-radius: 24px;">
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0; font-size: 12px; color: #856404; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">⏳ Pendiente de confirmar</p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #856404; line-height: 1.6; font-weight: 500;">
                Los detalles de tus traslados están siendo gestionados. Te informaremos en cuanto estén confirmados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>` : transfers.map(t => `
    <tr>
      <td style="padding: 0 0 16px 0;">
        <table cellpadding="0" cellspacing="0" width="100%" style="background: ${surface}; border: 1px solid ${border}; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 16px 24px; border-bottom: 1px solid ${border}; background: #ffffff;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 14px; font-weight: 900; color: ${textPrimary}; text-transform: uppercase; letter-spacing: 0.5px;">${transferTypeLabel(t.type)}</span>
                  </td>
                  <td style="text-align: right;">
                    <span style="font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; padding: 5px 10px; border-radius: 6px; ${t.status === 'confirmed' ? `color: #059669; background: #ecfdf5;` : `color: #d97706; background: #fffbeb;`}">
                      ${t.status === 'confirmed' ? 'Confirmado' : 'Previsto'}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="width: 44%; vertical-align: top;">
                    <p style="margin: 0; font-size: 11px; color: ${muted}; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Recogida</p>
                    <p style="margin: 8px 0 0 0; font-size: 15px; font-weight: 800; color: ${textPrimary};">${t.pickup_location || '—'}</p>
                    <p style="margin: 6px 0 0 0; font-size: 20px; font-weight: 900; color: ${accent};">${fmtTime(t.pickup_datetime)}</p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: ${muted}; font-weight: 600;">${fmtDate(t.pickup_datetime, { day: '2-digit', month: 'short', timeZone: 'UTC' })}</p>
                  </td>
                  <td style="width: 12%; text-align: center; vertical-align: middle; color: ${border}; font-size: 20px;">→</td>
                  <td style="width: 44%; vertical-align: top; text-align: right;">
                    <p style="margin: 0; font-size: 11px; color: ${muted}; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Destino</p>
                    <p style="margin: 8px 0 0 0; font-size: 15px; font-weight: 800; color: ${textPrimary};">${t.dropoff_location || '—'}</p>
                  </td>
                </tr>
                ${(t.driver_name || t.vehicle_type || t.company_name || t.booking_reference) ? `
                <tr><td colspan="3"><table cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px; padding-top: 24px; border-top: 1px solid ${border};">
                  ${t.driver_name ? infoRow('Chófer', `${t.driver_name}${t.driver_phone ? ` · ${t.driver_phone}` : ''}`) : ''}
                  ${t.vehicle_type ? infoRow('Vehículo', t.vehicle_type) : ''}
                  ${t.company_name ? infoRow('Empresa', t.company_name) : ''}
                  ${t.booking_reference ? infoRow('Ref.', t.booking_reference) : ''}
                  ${t.notes ? infoRow('Notas', t.notes) : ''}
                </table></td></tr>` : ''}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join('')}`;

  // ── HOSPITALITY / EVENTOS ────────────────────────────────────────────────────
  const hospitalityHtml = hospitality.length === 0 ? '' : `
    ${sectionHeader('Hospitality', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop')}
    ${hospitality.map(ev => `
    <tr>
      <td style="padding: 0 0 24px 0;">
        <table cellpadding="0" cellspacing="0" width="100%" style="background: ${surface}; border: 1px solid ${border}; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 0; background: #000000; border-radius: 24px 24px 0 0; overflow: hidden;">
              <img src="${ev.image_url || (ev.title?.toLowerCase().includes('kong') 
                ? 'https://images.unsplash.com/photo-1550966842-2862ba996d44?q=80&w=1200&auto=format&fit=crop' 
                : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop')}" 
                width="600" alt="${ev.title}" style="width: 100%; display: block;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 32px; border-bottom: 1px solid ${border}; background: #ffffff;">
              <p style="margin: 0 0 10px 0; font-size: 10px; color: ${accent}; font-weight: 900; text-transform: uppercase; letter-spacing: 3px;">${eventTypeLabel(ev.type)} VIP</p>
              <h3 style="margin: 0; font-size: 24px; font-weight: 900; color: ${textPrimary}; letter-spacing: -0.5px;">${ev.title || '—'}</h3>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <table cellpadding="0" cellspacing="0" width="100%">
                ${infoRow('Fecha', fmtDateTime(ev.start_datetime))}
                ${ev.end_datetime ? infoRow('Fin', fmtTime(ev.end_datetime)) : ''}
                ${ev.venue_name ? infoRow('Lugar', ev.venue_name) : ''}
                ${ev.venue_address ? infoRow('Dirección', ev.venue_address) : ''}
                ${ev.dress_code ? infoRow('Dress code', ev.dress_code) : ''}
                ${ev.reservation_name ? infoRow('Reserva a nombre de', ev.reservation_name) : ''}
                ${ev.reservation_code ? infoRow('Código / Ref.', ev.reservation_code) : ''}
                ${ev.contact_name ? infoRow('Contacto', `${ev.contact_name}${ev.contact_phone ? ` · ${ev.contact_phone}` : ''}`) : ''}
                ${ev.menu_type ? infoRow('Menú', ev.menu_type) : ''}
                ${ev.private_room ? infoRow('Sala Privada', 'Sí ✓') : ''}
                ${ev.website_url ? infoRow('Sitio Web', `<a href="${ev.website_url}" style="color: ${accent}; text-decoration: none; font-weight: 800; border-bottom: 2px solid ${accent};">Visitar Web →</a>`) : ''}
                ${ev.description ? `<tr><td colspan="2" style="padding-top: 20px; font-size: 14px; color: ${muted}; line-height: 1.6; font-style: italic; border-top: 1px solid ${border}; margin-top: 10px;">${ev.description}</td></tr>` : ''}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join('')}`;

  // ── RESTAURANTES ─────────────────────────────────────────────────────────────
  const restaurantsHtml = restaurants.length === 0 ? '' : `
    ${sectionHeader('Restaurantes', 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=1200&auto=format&fit=crop')}
    ${restaurants.map(r => `
    <tr>
      <td style="padding: 0 0 24px 0;">
        <table cellpadding="0" cellspacing="0" width="100%" style="background: ${surface}; border: 1px solid ${border}; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 0; background: #000000;">
              <img src="${r.image_url || (r.restaurant_name?.toLowerCase().includes('kong') 
                ? 'https://images.unsplash.com/photo-1550966842-2862ba996d44?q=80&w=1200&auto=format&fit=crop' 
                : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop')}" 
                width="600" alt="${r.restaurant_name}" style="width: 100%; display: block;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 24px; border-bottom: 1px solid ${border}; background: #ffffff;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 10px; color: ${accent}; font-weight: 900; text-transform: uppercase; letter-spacing: 3px;">Reserva Gastronómica</p>
                    <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: 900; color: ${textPrimary};">${r.restaurant_name || '—'}</p>
                  </td>
                  <td style="text-align: right;">
                    <span style="font-size: 20px; font-weight: 900; color: ${accent};">${fmtTime(r.reservation_time)}</span>
                    <br/>
                    <span style="font-size: 11px; color: ${muted}; font-weight: 600;">${fmtDate(r.reservation_time, { day: '2-digit', month: 'short', timeZone: 'UTC' })}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${(r.address || r.reservation_name || r.notes || r.website_url) ? `
          <tr>
            <td style="padding: 24px;">
              <table cellpadding="0" cellspacing="0" width="100%">
                ${r.address ? infoRow('Dirección', r.address) : ''}
                ${r.reservation_name ? infoRow('A nombre de', r.reservation_name) : ''}
                ${r.notes ? infoRow('Notas', r.notes) : ''}
                ${r.website_url ? infoRow('Sitio Web', `<a href="${r.website_url}" style="color: ${accent}; text-decoration: none; font-weight: 800;">Visitar Web →</a>`) : ''}
              </table>
            </td>
          </tr>` : ''}
        </table>
      </td>
    </tr>`).join('')}`;

  // ── COORDINADOR ──────────────────────────────────────────────────────────────
  const coordinatorHtml = coordinator ? `
    <tr>
      <td style="padding: 32px 40px 40px 40px;">
        <table cellpadding="0" cellspacing="0" width="100%" style="background: #08080a; border: 1px solid ${border}; border-radius: 20px; overflow: hidden;">
          <tr>
            <td style="padding: 24px; text-align: center;">
              ${coordinator.avatar_url ? `<img src="${coordinator.avatar_url}" alt="${coordinator.name}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid ${accent}; display: inline-block; margin-bottom: 12px;" />` : `<div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(0,229,255,0.1); border: 2px solid ${accent}; display: inline-block; margin-bottom: 12px; line-height: 64px; font-size: 24px; text-align: center;">👤</div>`}
              <p style="margin: 0 0 4px 0; font-size: 10px; color: ${accent}; font-weight: 900; letter-spacing: 3px; text-transform: uppercase;">Tu Coordinador Logístico</p>
              <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 900; color: #ffffff;">${coordinator.name}</p>
              ${coordinator.role ? `<p style="margin: 0 0 12px 0; font-size: 11px; color: ${muted};">${coordinator.role}</p>` : ''}
              <table cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                <tr>
                  ${coordinator.phone ? `
                  <td style="padding: 0 8px; text-align: center;">
                    <a href="tel:${coordinator.phone}" title="Llamar" style="display: inline-block; background: rgba(0,229,255,0.08); border: 1px solid rgba(0,229,255,0.2); color: ${accent}; width: 44px; height: 44px; line-height: 44px; border-radius: 50%; font-size: 18px; text-decoration: none; text-align: center;">
                      📞
                    </a>
                  </td>` : ''}
                  ${coordinator.whatsapp ? `
                  <td style="padding: 0 8px; text-align: center;">
                    <a href="https://wa.me/${coordinator.whatsapp.replace(/\D/g,'')}" title="WhatsApp" style="display: inline-block; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); color: #10b981; width: 44px; height: 44px; line-height: 44px; border-radius: 50%; font-size: 18px; text-decoration: none; text-align: center;">
                      💬
                    </a>
                  </td>` : ''}
                  ${coordinator.email ? `
                  <td style="padding: 0 8px; text-align: center;">
                    <a href="mailto:${coordinator.email}" title="Enviar Email" style="display: inline-block; background: rgba(255,255,255,0.05); border: 1px solid ${border}; color: ${muted}; width: 44px; height: 44px; line-height: 44px; border-radius: 50%; font-size: 18px; text-decoration: none; text-align: center;">
                      ✉
                    </a>
                  </td>` : ''}
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tu Itinerario Logístico | JP Intelligence</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; background: ${bg}; border: 1px solid ${border}; border-radius: 24px; overflow: hidden;">

          <!-- HEADER -->
          <tr>
            <td style="padding: 36px 40px; border-bottom: 1px solid ${border}; text-align: center; background: #ffffff;">
              <p style="margin: 0 0 6px 0; font-size: 24px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; color: ${textPrimary};">JP Intelligence</p>
              <p style="margin: 0; font-size: 9px; color: ${accent}; font-weight: 900; letter-spacing: 5px; text-transform: uppercase;">Logística de Eventos</p>
            </td>
          </tr>

          <!-- HERO -->
          <tr>
            <td style="padding: 0; background: #ffffff;">
              <img src="${siteUrl}/EuroPCR2026.png" width="600" alt="EuroPCR 2026" style="width: 100%; display: block; border: 0;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 16px 40px; text-align: center; border-bottom: 1px solid ${border}; background: #ffffff;">
              <p style="margin: 0 0 8px 0; font-size: 9px; color: ${accent}; font-weight: 900; letter-spacing: 4px; text-transform: uppercase;">Dossier Logístico Personalizado</p>
              <h1 style="margin: 0 0 12px 0; font-size: 36px; font-weight: 900; color: ${textPrimary}; line-height: 1.1; letter-spacing: -1.5px;">
                Hola, ${nombre}.
              </h1>
              <p style="margin: 0; font-size: 16px; color: ${muted}; line-height: 1.6; font-weight: 500;">
                Te presentamos los detalles exclusivos de tu logística para <strong style="color: ${accent};">${evento}</strong>.
              </p>
            </td>
          </tr>

          ${credentials ? `
          <!-- CREDENCIALES DE ACCESO -->
          <tr>
            <td style="padding: 0 40px 40px 40px; background: #ffffff;">
              <table cellpadding="0" cellspacing="0" width="100%" style="background: ${surface}; border: 2px dashed ${accent}; border-radius: 24px; overflow: hidden;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 16px 0; font-size: 11px; font-weight: 900; color: ${accent}; text-transform: uppercase; letter-spacing: 2px;">Acceso a la Plataforma</p>
                    <p style="margin: 0 0 20px 0; font-size: 14px; color: ${textPrimary}; font-weight: 500; line-height: 1.5;">
                      Para acceder a tu documentación en tiempo real y gestionar tu asistencia, utiliza las siguientes credenciales temporales:
                    </p>
                    <table cellpadding="0" cellspacing="0" width="100%" style="background: #ffffff; border-radius: 16px; border: 1px solid ${border};">
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid ${border};">
                          <p style="margin: 0; font-size: 10px; color: ${muted}; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Email</p>
                          <p style="margin: 4px 0 0 0; font-size: 14px; font-family: monospace; font-weight: 700; color: ${textPrimary};">${credentials.email}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 20px;">
                          <p style="margin: 0; font-size: 10px; color: ${muted}; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Contraseña Temporal</p>
                          <p style="margin: 4px 0 0 0; font-size: 16px; font-family: monospace; font-weight: 900; color: ${accent}; letter-spacing: 1px;">${credentials.password}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 16px 0 0 0; font-size: 11px; color: ${muted}; font-style: italic; font-weight: 500;">
                      * El sistema te pedirá cambiar esta contraseña automáticamente al acceder.
                    </p>
                    <div style="margin-top: 24px;">
                      <a href="${siteUrl}/login?email=${encodeURIComponent(credentials.email)}&pass=${encodeURIComponent(credentials.password)}" 
                         style="display: block; background: ${accent}; color: #ffffff; padding: 20px; border-radius: 18px; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-decoration: none; text-align: center; box-shadow: 0 10px 20px -10px ${accent};">
                        Acceder y Cambiar Contraseña →
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ''}

          ${flightsHtml}
          ${hotelsHtml}
          ${transfersHtml}
          ${hospitalityHtml}
          ${restaurantsHtml}
          ${coordinatorHtml}

          <!-- FOOTER -->
          <tr>
            <td style="padding: 40px; border-top: 1px solid ${border}; background: #ffffff; text-align: center;">
              <p style="margin: 0 0 12px 0; font-size: 14px; color: ${muted}; line-height: 1.6;">
                Puedes acceder a tu dossier interactivo completo en<br />
                <a href="${siteUrl}" style="color: ${accent}; text-decoration: none; font-weight: 800;">${siteUrl}</a>
              </p>
              <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid ${border};">
                <p style="margin: 0; font-size: 11px; color: ${muted}; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">
                  © 2026 JP Intelligence Platform
                </p>
                <p style="margin: 4px 0 0 0; font-size: 9px; color: ${muted}; text-transform: uppercase; letter-spacing: 1px;">
                  Private & Confidential · Operational Intelligence
                </p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const { planId } = await request.json();

    if (!planId) {
      return NextResponse.json({ error: 'planId es obligatorio' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Fetch plan + profile + context
    const { data: plan, error: planError } = await supabaseAdmin
      .from('contact_travel_plans')
      .select(`
        *,
        profiles:user_id (id, nombre, apellidos, email, avatar_url),
        contexts:context_id (name),
        logistic_contact:logistic_contact_id (*)
      `)
      .eq('id', planId)
      .is('deleted_at', null)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    }

    const toEmail = plan.profiles?.email;
    if (!toEmail) {
      return NextResponse.json({ error: 'El plan no tiene email de destinatario' }, { status: 400 });
    }

    // Fetch all logistics data in parallel
    const [flightsRes, hotelStaysRes, transfersRes, restaurantsRes, hospitalityRes] = await Promise.all([
      supabaseAdmin.from('travel_flights').select('*').eq('plan_id', planId).is('deleted_at', null).order('departure_time'),
      supabaseAdmin.from('hotel_stays').select('*').eq('plan_id', planId).is('deleted_at', null).order('check_in'),
      supabaseAdmin.from('travel_transfers').select('*').eq('plan_id', planId).is('deleted_at', null).order('pickup_time'),
      supabaseAdmin.from('travel_restaurants').select('*').eq('plan_id', planId).is('deleted_at', null).order('reservation_time'),
      supabaseAdmin.from('hospitality_events').select('*').eq('plan_id', planId).eq('visible_to_client', true).is('deleted_at', null).order('start_datetime'),
    ]);

    // Normalize transfers (pickup_datetime vs pickup_time column discrepancy)
    const transfers = (transfersRes.data || []).map((t: any) => ({
      ...t,
      type: t.type || t.transfer_type,
      pickup_datetime: t.pickup_datetime || t.pickup_time,
    }));

    const nombre = `${plan.profiles?.nombre || ''}`.trim() || 'Asistente';
    const evento = plan.contexts?.name || 'el evento';

    // Coordinator fallback: if not linked on plan, fetch default
    let coordinator = plan.logistic_contact || null;
    if (!coordinator) {
      const { data: defaultCoord } = await supabaseAdmin
        .from('logistic_contacts')
        .select('*')
        .eq('is_default', true)
        .limit(1)
        .maybeSingle();
      coordinator = defaultCoord;
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jpintelligence.vercel.app';

    const html = buildHtml({
      nombre,
      evento,
      flights: flightsRes.data || [],
      hotels: hotelStaysRes.data || [],
      transfers,
      hospitality: hospitalityRes.data || [],
      restaurants: restaurantsRes.data || [],
      coordinator,
      siteUrl,
      credentials: plan.profiles?.temp_password ? {
        email: plan.profiles.email,
        password: plan.profiles.temp_password
      } : undefined
    });

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'JP Intelligence <operaciones@quilprocardio.com>',
      to: [toEmail],
      subject: `Tu itinerario logístico — ${evento}`,
      html,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      return NextResponse.json({ error: emailError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, emailId: emailData?.id, sentTo: toEmail });
  } catch (err: any) {
    console.error('send-logistics-email error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
