'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Plane, MapPin, Navigation, Smartphone, 
  Clock, Shield, ArrowRight, ExternalLink,
  MessageSquare, Car, FileText, QrCode,
  Phone, Luggage, Check, Plus, ChevronRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';

interface AirportModeViewProps {
  data: {
    flight: any;
    statusText: string;
    statusColor: string;
    diffMin: number;
    boardingPass?: any;
    associatedTransfer?: any;
    associatedHotel?: any;
    transferVoucher?: any;
    isLanded: boolean;
  };
  smartDeparture?: any;
  isAdmin?: boolean;
  onClose?: () => void;
  onAction?: (action: string, payload?: any) => void;
}

export const AirportModeView = ({ data, smartDeparture, isAdmin, onClose, onAction }: AirportModeViewProps) => {
  const { flight, statusText, diffMin, boardingPass, associatedTransfer, associatedHotel, transferVoucher, isLanded } = data;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed inset-0 z-[100] bg-black text-white flex flex-col p-6 overflow-y-auto no-scrollbar"
    >
      {/* Operational Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent text-[9px] font-black uppercase tracking-widest border border-accent/30">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Operational Mode
          </div>
          <h1 className="text-3xl font-black tracking-tighter leading-none">MODO AEROPUERTO</h1>
        </div>
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
        >
          <ExternalLink size={18} />
        </button>
      </div>

      <div className="space-y-8 flex-1">
        {isLanded ? (
          /* ========================================================================
             POST-FLIGHT / LLEGADA & TRASLADO PHASE
             ======================================================================== */
          <div className="space-y-8">
            {/* Status Card */}
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 left-0 w-full h-1 bg-green-500" />
              <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400">
                  <Check size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-400">Llegada</p>
                  <h2 className="text-2xl font-black tracking-tighter leading-none">
                    {associatedTransfer ? 'Tu traslado está preparado' : 'Llegada a destino'}
                  </h2>
                </div>
              </div>

              {associatedTransfer ? (
                <div className="space-y-6">
                  {/* Detailed Operational Data Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Proveedor</p>
                      <p className="text-sm font-bold text-white">{associatedTransfer.company_name || associatedTransfer.provider || 'Privado'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Vehículo</p>
                      <p className="text-sm font-bold text-white">🚗 {associatedTransfer.vehicle_type || 'Premium Sedan'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Referencia</p>
                      <p className="text-sm font-bold text-accent">{associatedTransfer.booking_reference || 'Confirmado'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Detalles</p>
                      <p className="text-sm font-bold text-white">
                        👥 {associatedTransfer.passengers || 1} Pax • 🧳 {associatedTransfer.luggage || 1} Bultos
                      </p>
                    </div>
                  </div>

                  {associatedTransfer.meeting_point && (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-accent">📍 Punto de Encuentro</p>
                      <p className="text-xs text-white/80 leading-relaxed">{associatedTransfer.meeting_point}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center space-y-4">
                  <p className="text-sm text-white/60">No hay traslado registrado para este vuelo.</p>
                  {isAdmin && (
                    <button
                      onClick={() => onAction?.('associate')}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-accent text-white font-black uppercase tracking-widest text-[10px] hover:opacity-90 transition-all shadow-md"
                    >
                      <Plus size={14} />
                      Asociar traslado
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions Grid */}
            {associatedTransfer && (
              <div className="grid grid-cols-2 gap-3">
                {associatedTransfer.meeting_point && (
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(associatedTransfer.meeting_point || '');
                      alert(`📍 Punto de encuentro copiado:\n"${associatedTransfer.meeting_point}"`);
                    }}
                    className="p-5 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col items-start gap-4 hover:bg-white/10 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                      <MapPin size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">VER PUNTO ENCUENTRO</span>
                  </button>
                )}

                {transferVoucher?.file_url && (
                  <button 
                    onClick={() => onAction?.('docs', transferVoucher)}
                    className="p-5 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col items-start gap-4 hover:bg-white/10 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                      <FileText size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">VER VOUCHER OFICIAL</span>
                  </button>
                )}

                {associatedTransfer.support_phone && (
                  <a 
                    href={`tel:${associatedTransfer.support_phone}`}
                    className="p-5 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col items-start gap-4 hover:bg-white/10 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                      <Phone size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">LLAMAR ASISTENCIA</span>
                  </a>
                )}

                {(associatedTransfer.support_phone || associatedTransfer.support_whatsapp) && (
                  <a 
                    href={`https://wa.me/${(associatedTransfer.support_whatsapp || associatedTransfer.support_phone).replace(/\+/g, '').replace(/\s+/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-5 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col items-start gap-4 hover:bg-white/10 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400">
                      <MessageSquare size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">WHATSAPP ASISTENCIA</span>
                  </a>
                )}

                <button 
                  onClick={() => onAction?.('maps', { destination: associatedTransfer.dropoff_location, origin: associatedTransfer.pickup_location })}
                  className="p-5 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col items-start gap-4 hover:bg-white/10 transition-all text-left col-span-2"
                >
                  <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                    <Navigation size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">CÓMO LLEGAR AL DESTINO</span>
                </button>
              </div>
            )}

            {/* Sequence of Arrival Timeline */}
            <div className="space-y-6 pt-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Secuencia de Llegada</h3>
              
              <div className="relative pl-8 space-y-8 border-l border-white/10 ml-4">
                {/* 1. Llegada Vuelo */}
                <div className="relative">
                  <div className="absolute -left-[41px] top-0.5 w-6 h-6 rounded-full bg-accent flex items-center justify-center text-white border border-black">
                    <Plane size={12} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <p className="text-xs font-black uppercase tracking-widest text-white/90">Llegada Vuelo {flight.flight_number}</p>
                      <span className="text-[10px] text-white/40 font-mono">
                        {flight.arrival_time ? new Date(flight.arrival_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : 'Completado'}
                      </span>
                    </div>
                    <p className="text-xs text-white/60">Arribo en {flight.arrival_location} • Terminal {flight.arrival_terminal || 'TBA'}</p>
                  </div>
                </div>

                {/* 2. Recogida Equipaje */}
                <div className="relative">
                  <div className="absolute -left-[41px] top-0.5 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/80 border border-black">
                    <Luggage size={12} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-widest text-white/90">Recogida de Equipaje</p>
                    <p className="text-xs text-white/60">Dirígete a la cinta de equipajes indicada en las pantallas del aeropuerto.</p>
                  </div>
                </div>

                {/* 3. Traslado */}
                {associatedTransfer && (
                  <div className="relative">
                    <div className="absolute -left-[41px] top-0.5 w-6 h-6 rounded-full bg-accent flex items-center justify-center text-white border border-black animate-pulse">
                      <Car size={12} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-baseline">
                        <p className="text-xs font-black uppercase tracking-widest text-accent">Traslado Privado</p>
                        <span className="text-[10px] text-accent font-mono">
                          {new Date(associatedTransfer.pickup_datetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                        </span>
                      </div>
                      <p className="text-xs text-white/60">Punto de encuentro: {associatedTransfer.meeting_point || 'Hall de llegadas'}</p>
                    </div>
                  </div>
                )}

                {/* 4. Hotel Check-in */}
                {associatedHotel && (
                  <div className="relative">
                    <div className="absolute -left-[41px] top-0.5 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/80 border border-black">
                      <MapPin size={12} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-baseline">
                        <p className="text-xs font-black uppercase tracking-widest text-white/90">Check-in Hotel</p>
                        <span className="text-[10px] text-white/40 font-mono">Arribo</span>
                      </div>
                      <p className="text-xs text-accent font-black tracking-tight">{associatedHotel.hotel_name}</p>
                      <p className="text-xs text-white/60">{associatedHotel.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================
             PRE-FLIGHT / EMBARQUE PHASE (EXISTING QR LAYOUT)
             ======================================================================== */
          <div className="space-y-6">
            {/* Main Boarding Pass Card */}
            <div className="bg-white text-black rounded-[3rem] p-8 space-y-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-accent" />
              
              {/* Airline & Flight */}
              <div className="flex justify-between items-center border-b border-black/5 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center">
                    <Plane size={24} className="text-black" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{flight.airline || 'Airline'}</p>
                    <h2 className="text-2xl font-black tracking-tighter leading-none">{flight.flight_number}</h2>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Status</p>
                  <p className="text-sm font-black text-accent uppercase tracking-widest">{statusText}</p>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="p-4 bg-white rounded-3xl border-2 border-black/5">
                  {boardingPass?.qr_raw_payload ? (
                    <QRCodeSVG value={boardingPass.qr_raw_payload} size={200} level="H" />
                  ) : (
                    <div className="w-[200px] h-[200px] flex flex-col items-center justify-center text-black/20 gap-3">
                      <QrCode size={64} strokeWidth={1} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-center">QR NO DISPONIBLE</p>
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Escanea para embarcar</p>
              </div>

              {/* Seat & Gate Info */}
              <div className="grid grid-cols-3 gap-4 border-t border-black/5 pt-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Asiento</p>
                  <p className="text-xl font-black tracking-tighter">{flight.seat || 'TBA'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Puerta</p>
                  <p className="text-xl font-black tracking-tighter text-accent">{flight.gate || 'TBA'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Grupo</p>
                  <p className="text-xl font-black tracking-tighter">{flight.boarding_group || '1'}</p>
                </div>
              </div>
            </div>

            {/* Operational Status Banner */}
            <div className="grid grid-cols-1 gap-4">
              <div className="p-6 rounded-[2.5rem] bg-accent text-white shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Navigation size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Tiempo al Aeropuerto</p>
                    <h3 className="text-lg font-black tracking-tight">Tráfico Fluido • {smartDeparture?.travelDurationMinutes || 35} min</h3>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black tracking-tighter">-{diffMin} min</p>
                  <p className="text-[10px] font-bold uppercase opacity-60">Despegue</p>
                </div>
              </div>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => onAction?.('maps')}
                  className="p-5 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col items-start gap-4 hover:bg-white/10 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                    <MapPin size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">CÓMO LLEGAR</span>
                </button>
                <button 
                  onClick={() => onAction?.('contact')}
                  className="p-5 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col items-start gap-4 hover:bg-white/10 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                    <MessageSquare size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">COORDINADOR</span>
                </button>
                <button 
                  onClick={() => onAction?.('docs')}
                  className="p-5 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col items-start gap-4 hover:bg-white/10 transition-all text-left col-span-2"
                >
                  <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                    <FileText size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">VER TARJETA EMBARQUE</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center border-t border-white/5 pt-6">
        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">
          JP Intelligence Operational System
        </p>
      </div>
    </motion.div>
  );
};

