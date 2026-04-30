'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, MapPin, CheckCircle2, Info, Phone, Download } from 'lucide-react';
import { Button } from './Button';

interface OutcomeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  card?: any;
}

export function OutcomeDrawer({ isOpen, onClose, card }: OutcomeDrawerProps) {
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
            className="fixed bottom-0 left-0 right-0 z-[101] bg-surface border-t border-white/10 rounded-t-[2.5rem] p-8 md:p-10 md:max-w-md md:left-auto md:top-0 md:h-full md:rounded-l-[2.5rem] md:rounded-tr-none md:border-l md:border-t-0 shadow-2xl"
          >
            <div className="space-y-8 flex flex-col h-full">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-white">{title}</h3>
                  <div className="flex items-center gap-2 text-accent">
                    <CheckCircle2 size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
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
                      <p className="text-white font-bold">{details.hora}</p>
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
                      <p className="text-white font-bold">{details.ubicacion}</p>
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
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-1">Detalles Operativos</p>
                      <p className="text-white/80 text-sm leading-relaxed">{details.observaciones}</p>
                    </div>
                  </div>
                )}
                
                {/* Dynamic Actions */}
                <div className="pt-6 space-y-3">
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
