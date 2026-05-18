import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DossierData, DossierEvent } from './dossier-builder';

// Premium Visual Cinematográfico Dark Luxury Email Template
export const TravelDossierEmail: React.FC<{ data: DossierData; siteUrl: string }> = ({ data, siteUrl }) => {
  const {
    userName,
    eventName,
    eventDates,
    eventCity,
    hasFlights,
    hasTransfers,
    hasHospitality,
    mainHotelName,
    timelineDays,
    coordinator
  } = data;

  const bgDark = '#08080a'; // Deepest luxury black
  const bgCard = '#111217'; // Surface card background
  const textWhite = '#ffffff'; // Dominant titles
  const textLight = '#e2e8f0'; // Highly readable body text
  const textMuted = '#94a3b8'; // Timestamps & labels
  const accentNeon = '#00e5ff'; // Cyan/neon bright accent
  const borderSubtle = '#1f242e'; // Dark borders

  return (
    <div style={{
      margin: 0,
      padding: 0,
      width: '100%',
      backgroundColor: bgDark,
      color: textLight,
      fontFamily: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      WebkitFontSmoothing: 'antialiased',
      lineHeight: '1.5'
    }}>
      <table cellPadding={0} cellSpacing={0} width="100%" style={{ background: bgDark, padding: '40px 16px' }}>
        <tr>
          <td align="center">
            <table cellPadding={0} cellSpacing={0} width="600" style={{
              maxWidth: '600px',
              width: '100%',
              background: '#0c0d12',
              borderRadius: '24px',
              overflow: 'hidden',
              border: `1px solid ${borderSubtle}`,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
            }}>
              
              {/* BRANDING HEADER */}
              <tr>
                <td style={{ padding: '36px 40px 24px 40px', textAlign: 'center', background: '#090a0d' }}>
                  <p style={{
                    margin: 0,
                    fontSize: '20px',
                    fontWeight: 900,
                    letterSpacing: '5px',
                    textTransform: 'uppercase',
                    color: textWhite
                  }}>
                    JP INTELLIGENCE
                  </p>
                  <p style={{
                    margin: '4px 0 0 0',
                    fontSize: '9px',
                    color: accentNeon,
                    fontWeight: 800,
                    letterSpacing: '7px',
                    textTransform: 'uppercase'
                  }}>
                    OPERATIONAL INTELLIGENCE
                  </p>
                </td>
              </tr>

              {/* HERO CINEMATOGRÁFICO - ESTILO EUROPCR */}
              <tr>
                <td style={{
                  padding: 0,
                  position: 'relative',
                  backgroundColor: '#000000',
                  height: '280px',
                  backgroundImage: "url('https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop')",
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  textAlign: 'center'
                }}>
                  <div dangerouslySetInnerHTML={{ __html: `
                    <!--[if gte mso 9]>
                    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:280px;">
                      <v:fill type="frame" src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop" color="#000000" />
                      <v:textbox inset="0,0,0,0">
                    <![endif]-->
                  ` }} />
                  <div style={{
                    height: '100%',
                    background: 'linear-gradient(to bottom, rgba(12,13,18,0.2) 0%, rgba(12,13,18,0.95) 100%)',
                    padding: '80px 40px 24px 40px',
                    boxSizing: 'border-box'
                  }}>
                    <p style={{
                      margin: '0 0 8px 0',
                      fontSize: '10px',
                      color: accentNeon,
                      fontWeight: 900,
                      letterSpacing: '4px',
                      textTransform: 'uppercase'
                    }}>
                      BRIEFING EJECUTIVO DE VIAJE
                    </p>
                    <h1 style={{
                      margin: '0 0 10px 0',
                      fontSize: '32px',
                      fontWeight: 900,
                      color: textWhite,
                      lineHeight: '1.2',
                      letterSpacing: '-1px'
                    }}>
                      {eventName}
                    </h1>
                    <p style={{
                      margin: 0,
                      fontSize: '14px',
                      color: textMuted,
                      fontWeight: 600,
                      letterSpacing: '1px'
                    }}>
                      {eventCity.toUpperCase()} · {eventDates}
                    </p>
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: `
                    <!--[if gte mso 9]>
                      </v:textbox>
                    </v:rect>
                    <![endif]-->
                  ` }} />
                </td>
              </tr>

              {/* INTRO CLAIM */}
              <tr>
                <td style={{ padding: '0 40px 24px 40px', textAlign: 'center', background: '#0c0d12' }}>
                  <p style={{
                    margin: '0 0 8px 0',
                    fontSize: '18px',
                    color: textWhite,
                    fontWeight: 700,
                    lineHeight: '1.4'
                  }}>
                    "Tu experiencia inteligente de viaje ya está preparada."
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: textMuted,
                    lineHeight: '1.6'
                  }}>
                    Estimado/a {userName}, hemos coordinado toda la logística y documentación necesaria para su asistencia. A continuación encontrará su dossier digital operativo.
                  </p>
                </td>
              </tr>

              {/* RESUMEN OPERATIVO - BRIEFING COMPACT CARD */}
              <tr>
                <td style={{ padding: '0 40px 32px 40px', background: '#0c0d12' }}>
                  <table cellPadding={0} cellSpacing={0} width="100%" style={{
                    background: bgCard,
                    border: `1px solid ${borderSubtle}`,
                    borderRadius: '20px',
                    padding: '24px',
                    borderLeft: `3px solid ${accentNeon}`
                  }}>
                    <tr>
                      <td colSpan={2} style={{ paddingBottom: '16px' }}>
                        <h3 style={{
                          margin: 0,
                          fontSize: '12px',
                          color: accentNeon,
                          fontWeight: 900,
                          letterSpacing: '2px',
                          textTransform: 'uppercase'
                        }}>
                          Resumen Operativo
                        </h3>
                      </td>
                    </tr>
                    
                    {/* Event Row */}
                    <tr>
                      <td style={{ padding: '8px 0', fontSize: '11px', color: textMuted, fontWeight: 700, textTransform: 'uppercase', width: '130px' }}>Evento Principal</td>
                      <td style={{ padding: '8px 0', fontSize: '14px', color: textWhite, fontWeight: 700 }}>{eventName}</td>
                    </tr>
                    {/* Destination Row */}
                    <tr>
                      <td style={{ padding: '8px 0', fontSize: '11px', color: textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Ciudad y Fechas</td>
                      <td style={{ padding: '8px 0', fontSize: '14px', color: textWhite, fontWeight: 600 }}>{eventCity} · {eventDates}</td>
                    </tr>
                    {/* Hotel Row */}
                    <tr>
                      <td style={{ padding: '8px 0', fontSize: '11px', color: textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Alojamiento principal</td>
                      <td style={{ padding: '8px 0', fontSize: '14px', color: textLight, fontWeight: 600 }}>{mainHotelName}</td>
                    </tr>
                    {/* Logística Row */}
                    <tr>
                      <td style={{ padding: '8px 0', fontSize: '11px', color: textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Servicios incluidos</td>
                      <td style={{ padding: '8px 0', fontSize: '13px', color: textLight }}>
                        {hasFlights ? '✈️ Vuelos ' : ''}
                        {hasTransfers ? '🚘 Traslados ' : ''}
                        {hasHospitality ? '🥂 Hospitality ' : ''}
                        {!hasFlights && !hasTransfers && !hasHospitality ? 'Logística estándar' : ''}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              {/* TIMELINE COMPACTA PREMIUM */}
              <tr>
                <td style={{ padding: '0 40px 32px 40px', background: '#0c0d12' }}>
                  <h3 style={{
                    margin: '0 0 20px 0',
                    fontSize: '14px',
                    color: textWhite,
                    fontWeight: 900,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    textAlign: 'left'
                  }}>
                    Itinerario y Logística
                  </h3>

                  {timelineDays.map((day, dIdx) => (
                    <div key={dIdx} style={{ marginBottom: '28px' }}>
                      {/* Date Label Header */}
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 900,
                        color: accentNeon,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        paddingBottom: '10px',
                        borderBottom: `1px solid ${borderSubtle}`,
                        marginBottom: '16px'
                      }}>
                        {day.dateLabel}
                      </div>

                      {/* Events of the day */}
                      <table cellPadding={0} cellSpacing={0} width="100%">
                        {day.events.map((ev, eIdx) => (
                          <tr key={eIdx}>
                            <td style={{ verticalAlign: 'top', padding: '0 0 16px 0' }}>
                              <table cellPadding={0} cellSpacing={0} width="100%">
                                <tr>
                                  {/* Event Icon/Marker */}
                                  <td style={{ width: '36px', verticalAlign: 'top', fontSize: '16px', paddingTop: '2px' }}>
                                    {ev.icon}
                                  </td>
                                  
                                  {/* Event Time */}
                                  <td style={{ width: '60px', verticalAlign: 'top', paddingTop: '4px' }}>
                                    <span style={{
                                      fontSize: '13px',
                                      fontWeight: 800,
                                      color: textWhite,
                                      fontFamily: 'monospace'
                                    }}>
                                      {ev.formattedTime}
                                    </span>
                                  </td>
                                  
                                  {/* Event Details */}
                                  <td style={{ verticalAlign: 'top', paddingLeft: '8px', paddingTop: '2px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: textWhite }}>
                                      {ev.title}
                                    </div>
                                    {ev.subtitle && (
                                      <div style={{ fontSize: '12px', color: textMuted, marginTop: '2px' }}>
                                        {ev.subtitle}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        ))}
                      </table>
                    </div>
                  ))}
                </td>
              </tr>

              {/* BOTÓN DE ACCESO APP - CTA PRINCIPAL */}
              <tr>
                <td style={{ padding: '0 40px 36px 40px', textAlign: 'center', background: '#0c0d12' }}>
                  <table cellPadding={0} cellSpacing={0} align="center" style={{ margin: '0 auto' }}>
                    <tr>
                      <td align="center" style={{
                        background: accentNeon,
                        borderRadius: '16px',
                        boxShadow: `0 8px 24px rgba(0, 229, 255, 0.25)`
                      }}>
                        <a href={`${siteUrl}/dashboard`} target="_blank" rel="noopener noreferrer" style={{
                          display: 'inline-block',
                          padding: '16px 36px',
                          color: bgDark,
                          fontSize: '13px',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          letterSpacing: '2px',
                          textDecoration: 'none'
                        }}>
                          Acceder a JP Intelligence Platform →
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style={{
                    margin: '16px 0 0 0',
                    fontSize: '11px',
                    color: textMuted
                  }}>
                    Acceda a su itinerario interactivo: mapas en tiempo real, alertas de vuelo, IA contextual y modo aeropuerto.
                  </p>
                </td>
              </tr>

              {/* COORDINADOR LOGÍSTICO COMPONENT */}
              {coordinator && (
                <tr>
                  <td style={{ padding: '0 40px 36px 40px', background: '#0c0d12' }}>
                    <table cellPadding={0} cellSpacing={0} width="100%" style={{
                      background: bgCard,
                      border: `1px solid ${borderSubtle}`,
                      borderRadius: '24px',
                      padding: '24px',
                      textAlign: 'center'
                    }}>
                      <tr>
                        <td align="center">
                          {coordinator.avatarUrl ? (
                            <img src={coordinator.avatarUrl} alt={coordinator.name} style={{
                              width: '64px',
                              height: '64px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: `2px solid ${accentNeon}`,
                              marginBottom: '12px',
                              display: 'block'
                            }} />
                          ) : (
                            <div style={{
                              width: '64px',
                              height: '64px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(0, 229, 255, 0.1)',
                              border: `2px solid ${accentNeon}`,
                              marginBottom: '12px',
                              fontSize: '24px',
                              lineHeight: '64px',
                              color: accentNeon,
                              fontWeight: 'bold'
                            }}>
                              👤
                            </div>
                          )}
                          <p style={{
                            margin: 0,
                            fontSize: '9px',
                            color: accentNeon,
                            fontWeight: 900,
                            letterSpacing: '3px',
                            textTransform: 'uppercase'
                          }}>
                            Tu Coordinador Logístico
                          </p>
                          <p style={{
                            margin: '4px 0 2px 0',
                            fontSize: '16px',
                            fontWeight: 900,
                            color: textWhite
                          }}>
                            {coordinator.name}
                          </p>
                          {coordinator.role && (
                            <p style={{
                              margin: '0 0 16px 0',
                              fontSize: '11px',
                              color: textMuted
                            }}>
                              {coordinator.role}
                            </p>
                          )}
                          
                          {/* Direct Action Contacts */}
                          <table cellPadding={0} cellSpacing={0} align="center" style={{ margin: '0 auto' }}>
                            <tr>
                              {coordinator.phone && (
                                <td style={{ padding: '0 8px' }}>
                                  <a href={`tel:${coordinator.phone}`} title="Llamar" style={{
                                    display: 'inline-block',
                                    background: 'rgba(0, 229, 255, 0.06)',
                                    border: '1px solid rgba(0, 229, 255, 0.15)',
                                    borderRadius: '50%',
                                    width: '40px',
                                    height: '40px',
                                    lineHeight: '40px',
                                    fontSize: '16px',
                                    color: accentNeon,
                                    textDecoration: 'none'
                                  }}>
                                    📞
                                  </a>
                                </td>
                              )}
                              {coordinator.whatsapp && (
                                <td style={{ padding: '0 8px' }}>
                                  <a href={`https://wa.me/${coordinator.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" style={{
                                    display: 'inline-block',
                                    background: 'rgba(16, 185, 129, 0.06)',
                                    border: '1px solid rgba(16, 185, 129, 0.15)',
                                    borderRadius: '50%',
                                    width: '40px',
                                    height: '40px',
                                    lineHeight: '40px',
                                    fontSize: '16px',
                                    color: '#10b981',
                                    textDecoration: 'none'
                                  }}>
                                    💬
                                  </a>
                                </td>
                              )}
                              {coordinator.email && (
                                <td style={{ padding: '0 8px' }}>
                                  <a href={`mailto:${coordinator.email}`} title="Email" style={{
                                    display: 'inline-block',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '50%',
                                    width: '40px',
                                    height: '40px',
                                    lineHeight: '40px',
                                    fontSize: '14px',
                                    color: textLight,
                                    textDecoration: 'none'
                                  }}>
                                    ✉
                                  </a>
                                </td>
                              )}
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              )}

              {/* FOOTER & BRANDS */}
              <tr>
                <td style={{
                  padding: '32px 40px',
                  background: '#090a0d',
                  borderTop: `1px solid ${borderSubtle}`,
                  textAlign: 'center'
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: '11px',
                    color: textMuted,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    fontWeight: 700
                  }}>
                    JP INTELLIGENCE PLATFORM
                  </p>
                  <p style={{
                    margin: '4px 0 0 0',
                    fontSize: '9px',
                    color: textMuted,
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                  }}>
                    PRIVATE & CONFIDENTIAL · OPERATIONAL BRIEFING
                  </p>
                  
                  {/* Subtle Quilpro Branding */}
                  <div style={{
                    marginTop: '20px',
                    paddingTop: '20px',
                    borderTop: `1px solid ${borderSubtle}`,
                    fontSize: '10px',
                    color: textMuted
                  }}>
                    Desarrollado en colaboración con <span style={{ color: textWhite, fontWeight: 700 }}>QUILPRO CARDIO</span>
                  </div>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </div>
  );
};

// Main function to render TSX template to static HTML
export function renderTravelDossierEmailHtml(data: DossierData, siteUrl: string): string {
  const element = React.createElement(TravelDossierEmail, { data, siteUrl });
  const markup = renderToStaticMarkup(element);
  
  // Return completed HTML structure with standard doctype
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dossier Logístico Exclusivo</title>
</head>
<body style="margin: 0; padding: 0; background-color: #08080a;">
  ${markup}
</body>
</html>`;
}
