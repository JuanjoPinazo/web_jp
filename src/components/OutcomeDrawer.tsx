'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, MapPin, CheckCircle2, Info, Phone, Download, User, Ticket, Briefcase, Coffee, ShieldCheck, QrCode } from 'lucide-react';
import { Button } from './Button';
import { FlightCard } from './FlightCard';

interface OutcomeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  card?: any;
  onOpenQR?: (data: any) => void;
}

export function OutcomeDrawer({ isOpen, onClose, card, onOpenQR }: OutcomeDrawerProps) {
  if (!card) return null;
  const { title, status, details, actionType, payload } = card;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Drawer / Sheet */}
          <motion.div
            initial={{ y: '100%' }} // Mobile bottom sheet
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[101] bg-surface border-t border-border rounded-t-[2.5rem] p-8 md:p-10 md:max-w-md md:left-auto md:top-0 md:h-full md:rounded-l-[2.5rem] md:rounded-tr-none md:border-l md:border-t-0 shadow-2xl"
          >
            <div className="space-y-8 flex flex-col h-full">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-foreground">{title}</h3>
                  <div className="flex items-center gap-2 text-accent">
                    <CheckCircle2 size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
                  </div>
                </div>
                  <button 
                    onClick={onClose}
                    className="p-2 rounded-full bg-surface-subtle border border-border text-foreground/60 hover:text-foreground transition-colors"
                  >
                    <X size={20} />
                  </button>
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
                {details.hora && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted shrink-0">
                      <Clock size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-1">Hora Programada</p>
                      <p className="text-foreground font-bold">{details.hora}</p>
                    </div>
                  </div>
                )}

                {details.ubicacion && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted shrink-0">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-1">Ubicación</p>
                      <p className="text-foreground font-bold">{details.ubicacion}</p>
                      {(actionType === 'hotel' || actionType === 'restaurant') && (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.ubicacion)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 text-[10px] font-bold text-accent uppercase tracking-widest hover:underline"
                        >
                          Abrir Mapa
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {details.observaciones && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted shrink-0">
                      <Info size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-1">Notas del Concierge</p>
                      <p className="text-foreground/80 text-sm leading-relaxed">{details.observaciones}</p>
                    </div>
                  </div>
                )}

                {/* Structured Hotel Details */}
                {actionType === 'hotel' && (
                  <div className="pt-4 space-y-4 border-t border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Detalles del Alojamiento</p>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {payload.traveler_name && (
                        <div className="flex items-center gap-3">
                          <User size={14} className="text-muted" />
                          <p className="text-xs text-foreground"><span className="text-muted">Titular:</span> {payload.traveler_name}</p>
                        </div>
                      )}
                      {payload.confirmation_number && (
                        <div className="flex items-center gap-3">
                          <Ticket size={14} className="text-muted" />
                          <p className="text-xs text-foreground"><span className="text-muted">Confirmación:</span> <span className="font-mono">{payload.confirmation_number}</span></p>
                        </div>
                      )}
                      {payload.pin_code && (
                        <div className="flex items-center gap-3">
                          <ShieldCheck size={14} className="text-muted" />
                          <p className="text-xs text-foreground"><span className="text-muted">Código Acceso:</span> <span className="font-mono bg-surface-subtle px-1.5 py-0.5 rounded border border-border">{payload.pin_code}</span></p>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Coffee size={14} className={payload.breakfast_included ? "text-emerald-500" : "text-muted"} />
                        <p className="text-xs text-foreground">{payload.breakfast_included ? "Desayuno Incluido" : "Solo Alojamiento"}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Structured Flight Details */}
                {actionType === 'flight' && (
                  <div className="pt-4 border-t border-border">
                    <FlightCard flight={payload} role="client" />
                  </div>
                )}

                {actionType === 'round_trip' && (
                  <div className="pt-4 border-t border-border space-y-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-4 ml-2">Vuelo de Ida</p>
                      <FlightCard flight={payload.outbound} role="client" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-4 ml-2">Vuelo de Vuelta</p>
                      <FlightCard flight={payload.returnFlight} role="client" />
                    </div>
                  </div>
                )}

                {actionType === 'flight_confirmation' && (
                  <div className="pt-4 border-t border-border">
                     <a 
                       href={payload.file_url} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="flex items-center justify-center gap-3 w-full p-5 rounded-2xl bg-accent text-white font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl"
                     >
                       <Download size={18} /> Ver Reserva de Vuelo
                     </a>
                  </div>
                )}
                
                  {actionType === 'boarding_pass' && (
                    <div className="pt-4 space-y-4 border-t border-border">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Detalles del Vuelo</p>
                      <div className="bg-muted/30 p-4 rounded-2xl border border-border">
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-bold text-foreground">
                            {payload.flight?.airline} {payload.flight?.flight_number}
                          </p>
                          <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] font-black">
                            {payload.seat_assignment ? `Asiento ${payload.seat_assignment}` : 'S/A'}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted font-medium mt-1">
                          Pasajero: {payload.passenger_name || 'Titular'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Actions */}
                  <div className="pt-6 space-y-3">
                    {actionType === 'boarding_pass' && payload.qr_code && onOpenQR && (
                      <button 
                        onClick={() => {
                          onOpenQR({
                            qr_code: payload.qr_code,
                            passenger_name: payload.passenger_name,
                            display_title: payload.display_title || 'Tarjeta de Embarque'
                          });
                          onClose();
                        }}
                        className="flex items-center justify-center gap-3 w-full p-5 rounded-2xl bg-foreground text-background font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl"
                      >
                        <QrCode size={18} /> Mostrar Código QR
                      </button>
                    )}
                    
                    {(actionType === 'hotel' || actionType === 'flight' || actionType === 'boarding_pass') && (payload.voucher_url || payload.file_url) && (
                      <a 
                        href={payload.voucher_url || payload.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={`flex items-center justify-center gap-3 w-full p-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl ${actionType === 'boarding_pass' ? 'bg-surface border border-border text-foreground' : 'bg-accent text-white shadow-accent/20'}`}
                      >
                        <Download size={18} /> 
                        {actionType === 'boarding_pass' ? 'Descargar PDF' : (actionType === 'hotel' ? 'Descargar Reserva' : 'Descargar Billete')}
                      </a>
                    )}
                    {actionType === 'transfer' && payload?.driver_phone && (
                      <a href={`tel:${payload.driver_phone}`} className="flex items-center justify-center gap-2 w-full p-4 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold hover:bg-emerald-500 hover:text-white transition-colors">
                        <Phone size={18} /> Llamar Chófer
                      </a>
                    )}
                    {actionType === 'document' && payload?.file_url && (
                      <a href={payload.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full p-4 rounded-xl bg-accent/10 text-accent font-bold hover:bg-accent hover:text-white transition-colors">
                        <Download size={18} /> Descargar Documento
                      </a>
                    )}
                  </div>
              </div>

              <div className="pt-8 border-t border-white/5 mt-auto">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest text-center">
                  Logística validada por JP Intelligence
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
