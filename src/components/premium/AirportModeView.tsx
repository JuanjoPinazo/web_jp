'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Plane, MapPin, Navigation, Smartphone, 
  Clock, Shield, ArrowRight, ExternalLink,
  MessageSquare, Car, FileText, QrCode
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
  };
  smartDeparture?: any;
  onClose?: () => void;
  onAction?: (action: string, payload?: any) => void;
}

export const AirportModeView = ({ data, smartDeparture, onClose, onAction }: AirportModeViewProps) => {
  const { flight, statusText, diffMin, boardingPass } = data;

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

      {/* Main Boarding Pass Card */}
      <div className="space-y-6 flex-1">
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
              className="p-5 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col items-start gap-4 hover:bg-white/10 transition-all"
            >
              <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                <MapPin size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">CÓMO LLEGAR</span>
            </button>
            <button 
              onClick={() => onAction?.('uber')}
              className="p-5 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col items-start gap-4 hover:bg-white/10 transition-all"
            >
              <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                <Car size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">PEDIR UBER</span>
            </button>
            <button 
              onClick={() => onAction?.('contact')}
              className="p-5 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col items-start gap-4 hover:bg-white/10 transition-all"
            >
              <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                <MessageSquare size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">COORDINADOR</span>
            </button>
            <button 
              onClick={() => onAction?.('docs')}
              className="p-5 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col items-start gap-4 hover:bg-white/10 transition-all"
            >
              <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                <FileText size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">DOCUMENTOS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center">
        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">
          JP Intelligence Operational System
        </p>
      </div>
    </motion.div>
  );
};
