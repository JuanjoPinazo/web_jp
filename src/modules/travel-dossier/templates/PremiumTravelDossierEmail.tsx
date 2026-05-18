import React from 'react';
import { DossierData } from '../dossier-builder';

interface PremiumTravelDossierEmailProps {
  data: DossierData;
  siteUrl: string;
}

export const PremiumTravelDossierEmail: React.FC<PremiumTravelDossierEmailProps> = ({ data, siteUrl }) => {
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
    coordinator,
    attachments = []
  } = data;

  const bgDark = '#0A0E1A'; // Deepest space luxury dark blue/black
  const bgCard = '#151D30'; // Slate card background
  const textWhite = '#FFFFFF';
  const textLight = '#D1D5DB';
  const textMuted = '#9CA3AF';
  const accentCyan = '#00D1FF'; // JP Intelligence Accent
  const borderSubtle = '#24324F'; // Deep border slate

  return (
    <div style={{
      margin: 0,
      padding: 0,
      width: '100%',
      backgroundColor: bgDark,
      color: textLight,
      fontFamily: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      WebkitFontSmoothing: 'antialiased',
      lineHeight: '1.6'
    }}>
      <table cellPadding={0} cellSpacing={0} width="100%" style={{ background: bgDark, padding: '40px 16px' }}>
        <tr>
          <td align="center">
            <table cellPadding={0} cellSpacing={0} width="600" style={{
              maxWidth: '600px',
              width: '100%',
              background: '#0B0F19',
              borderRadius: '28px',
              overflow: 'hidden',
              border: `1px solid ${borderSubtle}`,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
              
              {/* BRANDING HEADER */}
              <tr>
                <td style={{ padding: '36px 40px 24px 40px', textAlign: 'center', background: '#070A10' }}>
                  <table cellPadding={0} cellSpacing={0} align="center" style={{ margin: '0 auto' }}>
                    <tr>
                      <td style={{ verticalAlign: 'middle' }}>
                        <span style={{
                          fontSize: '22px',
                          fontWeight: 900,
                          letterSpacing: '6px',
                          textTransform: 'uppercase',
                          color: textWhite,
                          display: 'inline-block'
                        }}>
                          JP INTELLIGENCE
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <span style={{
                          fontSize: '8px',
                          color: accentCyan,
                          fontWeight: 800,
                          letterSpacing: '8px',
                          textTransform: 'uppercase',
                          display: 'block',
                          marginTop: '4px',
                          paddingLeft: '6px'
                        }}>
                          OPERATIONAL LOGISTICS
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              {/* HERO VISUAL ESTILO EUROPCR */}
              <tr>
                <td style={{
                  padding: 0,
                  position: 'relative',
                  backgroundColor: '#05070B',
                  height: '300px',
                  backgroundImage: "url('https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop')",
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  textAlign: 'center'
                }}>
                  <div dangerouslySetInnerHTML={{ __html: `
                    <!--[if gte mso 9]>
                    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:300px;">
                      <v:fill type="frame" src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop" color="#05070B" />
                      <v:textbox inset="0,0,0,0">
                    <![endif]-->
                  ` }} />
                  <div style={{
                    height: '100%',
                    background: 'linear-gradient(to bottom, rgba(11,15,25,0.1) 0%, rgba(11,15,25,0.98) 100%)',
                    padding: '90px 40px 24px 40px',
                    boxSizing: 'border-box'
                  }}>
                    <span style={{
                      display: 'inline-block',
                      backgroundColor: 'rgba(0, 209, 255, 0.1)',
                      border: `1px solid rgba(0, 209, 255, 0.3)`,
                      borderRadius: '30px',
                      padding: '6px 14px',
                      fontSize: '9px',
                      color: accentCyan,
                      fontWeight: 900,
                      letterSpacing: '3px',
                      textTransform: 'uppercase',
                      marginBottom: '16px'
                    }}>
                      DOSSIER OPERATIVO PREMIUM
                    </span>
                    <h1 style={{
                      margin: '0 0 10px 0',
                      fontSize: '34px',
                      fontWeight: 900,
                      color: textWhite,
                      lineHeight: '1.2',
                      letterSpacing: '-1px'
                    }}>
                      {eventName}
                    </h1>
                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      color: textMuted,
                      fontWeight: 600,
                      letterSpacing: '2px',
                      textTransform: 'uppercase'
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
                <td style={{ padding: '8px 40px 28px 40px', textAlign: 'center', background: '#0B0F19' }}>
                  <p style={{
                    margin: '0 0 12px 0',
                    fontSize: '20px',
                    color: textWhite,
                    fontWeight: 800,
                    lineHeight: '1.4'
                  }}>
                    “Tu experiencia inteligente de viaje ya está preparada.”
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: textLight,
                    lineHeight: '1.6'
                  }}>
                    Estimado/a <strong>{userName}</strong>, hemos coordinado tu logística y documentación para que tengas todo lo necesario antes, durante y después del evento. A continuación, dispones de tu briefing personalizado.
                  </p>
                </td>
              </tr>

              {/* BRIEFING CARD - RESUMEN OPERATIVO */}
              <tr>
                <td style={{ padding: '0 40px 32px 40px', background: '#0B0F19' }}>
                  <table cellPadding={0} cellSpacing={0} width="100%" style={{
                    background: bgCard,
                    border: `1px solid ${borderSubtle}`,
                    borderRadius: '24px',
                    padding: '28px',
                    borderLeft: `4px solid ${accentCyan}`
                  }}>
                    <tr>
                      <td colSpan={2} style={{ paddingBottom: '18px' }}>
                        <span style={{
                          fontSize: '11px',
                          color: accentCyan,
                          fontWeight: 900,
                          letterSpacing: '3px',
                          textTransform: 'uppercase',
                          display: 'block'
                        }}>
                          Resumen Operativo
                        </span>
                      </td>
                    </tr>
                    
                    <tr>
                      <td style={{ padding: '8px 0', fontSize: '11px', color: textMuted, fontWeight: 700, textTransform: 'uppercase', width: '140px', borderBottom: '1px solid #1C273D' }}>Evento</td>
                      <td style={{ padding: '8px 0', fontSize: '14px', color: textWhite, fontWeight: 800, borderBottom: '1px solid #1C273D' }}>{eventName}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', fontSize: '11px', color: textMuted, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #1C273D' }}>Ciudad y Fechas</td>
                      <td style={{ padding: '8px 0', fontSize: '14px', color: textWhite, fontWeight: 700, borderBottom: '1px solid #1C273D' }}>{eventCity} · {eventDates}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', fontSize: '11px', color: textMuted, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #1C273D' }}>Alojamiento Principal</td>
                      <td style={{ padding: '8px 0', fontSize: '14px', color: accentCyan, fontWeight: 700, borderBottom: '1px solid #1C273D' }}>{mainHotelName}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', fontSize: '11px', color: textMuted, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #1C273D' }}>Logística Asignada</td>
                      <td style={{ padding: '8px 0', fontSize: '13px', color: textLight, borderBottom: '1px solid #1C273D' }}>
                        {hasFlights ? '✈️ Vuelos ' : ''}
                        {hasTransfers ? '🚘 Traslados ' : ''}
                        {hasHospitality ? '🥂 Eventos/Cenas ' : ''}
                        {!hasFlights && !hasTransfers && !hasHospitality ? 'Acceso General' : ''}
                      </td>
                    </tr>
                    {coordinator && (
                      <tr>
                        <td style={{ padding: '8px 0', fontSize: '11px', color: textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Coordinador Asignado</td>
                        <td style={{ padding: '8px 0', fontSize: '13px', color: textWhite, fontWeight: 700 }}>
                          {coordinator.name}
                        </td>
                      </tr>
                    )}
                  </table>
                </td>
              </tr>

              {/* TIMELINE COMPACTA */}
              <tr>
                <td style={{ padding: '0 40px 32px 40px', background: '#0B0F19' }}>
                  <h3 style={{
                    margin: '0 0 20px 0',
                    fontSize: '15px',
                    color: textWhite,
                    fontWeight: 900,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    textAlign: 'left'
                  }}>
                    Itinerario de Viaje
                  </h3>

                  {timelineDays.map((day, dIdx) => (
                    <div key={dIdx} style={{ marginBottom: '24px' }}>
                      
                      {/* Day Header */}
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 900,
                        color: accentCyan,
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                        paddingBottom: '8px',
                        borderBottom: '1px solid #1C273D',
                        marginBottom: '16px'
                      }}>
                        {day.dateLabel}
                      </div>

                      {/* Day Events */}
                      <table cellPadding={0} cellSpacing={0} width="100%">
                        {day.events.map((ev, eIdx) => (
                          <tr key={eIdx}>
                            <td style={{ verticalAlign: 'top', paddingBottom: '16px' }}>
                              <table cellPadding={0} cellSpacing={0} width="100%">
                                <tr>
                                  <td style={{ width: '32px', verticalAlign: 'top', fontSize: '16px', paddingTop: '2px' }}>
                                    {ev.icon}
                                  </td>
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

              {/* DOCUMENTACIÓN INCLUIDA */}
              {attachments.length > 0 && (
                <tr>
                  <td style={{ padding: '0 40px 32px 40px', background: '#0B0F19' }}>
                    <h3 style={{
                      margin: '0 0 16px 0',
                      fontSize: '15px',
                      color: textWhite,
                      fontWeight: 900,
                      letterSpacing: '2px',
                      textTransform: 'uppercase'
                    }}>
                      Documentación Adjunta
                    </h3>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: `1px solid ${borderSubtle}`, borderRadius: '20px', padding: '20px' }}>
                      <table cellPadding={0} cellSpacing={0} width="100%">
                        {attachments.map((att, idx) => {
                          const icon = att.type === 'boarding_pass' ? '✈️' :
                                       att.type === 'transfer_voucher' ? '🚘' :
                                       att.type === 'hotel_booking' || att.type === 'hotel_voucher' ? '🏨' :
                                       '📄';
                          return (
                            <tr key={att.id}>
                              <td style={{ padding: '8px 0', borderBottom: idx < attachments.length - 1 ? '1px solid #1C273D' : 'none', verticalAlign: 'middle' }}>
                                <table cellPadding={0} cellSpacing={0} width="100%">
                                  <tr>
                                    <td style={{ width: '28px', fontSize: '14px' }}>{icon}</td>
                                    <td>
                                      <span style={{ fontSize: '13px', fontWeight: 800, color: textWhite, display: 'block' }}>
                                        {att.filename}
                                      </span>
                                      <span style={{ fontSize: '11px', color: textMuted }}>
                                        {att.title}
                                      </span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          );
                        })}
                      </table>
                    </div>
                  </td>
                </tr>
              )}

              {/* CTA PRINCIPAL */}
              <tr>
                <td style={{ padding: '12px 40px 36px 40px', textAlign: 'center', background: '#0B0F19' }}>
                  <table cellPadding={0} cellSpacing={0} align="center" style={{ margin: '0 auto' }}>
                    <tr>
                      <td align="center" style={{
                        background: accentCyan,
                        borderRadius: '16px',
                        boxShadow: '0 8px 24px rgba(0, 209, 255, 0.25)'
                      }}>
                        <a href={`${siteUrl}/dashboard`} target="_blank" rel="noopener noreferrer" style={{
                          display: 'inline-block',
                          padding: '16px 36px',
                          color: '#0A0E1A',
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
                    fontSize: '12px',
                    color: textMuted,
                    lineHeight: '1.5'
                  }}>
                    Consulta mapas, alertas, cambios en tiempo real y asistencia contextual desde tu móvil.
                  </p>
                </td>
              </tr>

              {/* COORDINADOR LOGÍSTICO COMPONENT */}
              {coordinator && (
                <tr>
                  <td style={{ padding: '0 40px 36px 40px', background: '#0B0F19' }}>
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
                              border: `2px solid ${accentCyan}`,
                              marginBottom: '12px',
                              display: 'block'
                            }} />
                          ) : (
                            <div style={{
                              width: '64px',
                              height: '64px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(0, 209, 255, 0.1)',
                              border: `2px solid ${accentCyan}`,
                              marginBottom: '12px',
                              fontSize: '24px',
                              lineHeight: '64px',
                              color: accentCyan,
                              fontWeight: 'bold'
                            }}>
                              👤
                            </div>
                          )}
                          <span style={{
                            fontSize: '9px',
                            color: accentCyan,
                            fontWeight: 900,
                            letterSpacing: '3px',
                            textTransform: 'uppercase',
                            display: 'block'
                          }}>
                            Tu Coordinador Logístico
                          </span>
                          <span style={{
                            margin: '4px 0 2px 0',
                            fontSize: '16px',
                            fontWeight: 900,
                            color: textWhite,
                            display: 'block'
                          }}>
                            {coordinator.name}
                          </span>
                          {coordinator.role && (
                            <span style={{
                              margin: '0 0 16px 0',
                              fontSize: '11px',
                              color: textMuted,
                              display: 'block'
                            }}>
                              {coordinator.role}
                            </span>
                          )}
                          
                          <table cellPadding={0} cellSpacing={0} align="center" style={{ margin: '0 auto' }}>
                            <tr>
                              {coordinator.phone && (
                                <td style={{ padding: '0 8px' }}>
                                  <a href={`tel:${coordinator.phone}`} style={{
                                    display: 'inline-block',
                                    background: 'rgba(0, 209, 255, 0.06)',
                                    border: '1px solid rgba(0, 209, 255, 0.15)',
                                    borderRadius: '50%',
                                    width: '40px',
                                    height: '40px',
                                    lineHeight: '40px',
                                    fontSize: '16px',
                                    color: accentCyan,
                                    textDecoration: 'none'
                                  }}>
                                    📞
                                  </a>
                                </td>
                              )}
                              {coordinator.whatsapp && (
                                <td style={{ padding: '0 8px' }}>
                                  <a href={`https://wa.me/${coordinator.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{
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
                                  <a href={`mailto:${coordinator.email}`} style={{
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
                  background: '#070A10',
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
                  <p style={{
                    margin: '12px 0 0 0',
                    fontSize: '11px',
                    color: textMuted
                  }}>
                    Para cualquier ajuste o incidencia, contacta con tu coordinador asignado.
                  </p>
                  
                  <div style={{
                    marginTop: '20px',
                    paddingTop: '20px',
                    borderTop: '1px solid #1C273D',
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
