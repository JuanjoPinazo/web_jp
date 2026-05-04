'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  Loader2, ArrowRight, Building2, RefreshCw, Download
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { parseHotelRows, rowToHotelStayPayload, ImportRow } from '@/lib/hotel-import';
import { Button } from '@/components/Button';

interface HotelImportModalProps {
  planId: string;
  planUserName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'upload' | 'preview' | 'result';

interface ImportResult {
  imported: number;
  updated: number;
  errors: number;
}

export function HotelImportModal({ planId, planUserName, onClose, onSuccess }: HotelImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(async (file: File) => {
    setFileName(file.name);
    const { read, utils } = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const wb = read(buffer, { type: 'array', cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw: Record<string, any>[] = utils.sheet_to_json(ws, { defval: '' });
    const parsed = parseHotelRows(raw);
    setRows(parsed);
    setStep('preview');
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      alert('Solo se aceptan archivos .xlsx, .xls o .csv');
      return;
    }
    await parseFile(file);
  }, [parseFile]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) await handleFile(file);
  }, [handleFile]);

  const downloadTemplate = async () => {
    const { utils, writeFile } = await import('xlsx');

    const headers = [
      'nombre',
      'email',
      'hotel',
      'direccion',
      'telefono',
      'fecha llegada',
      'fecha salida',
      'hora entrada',
      'hora salida',
      'noches',
      'adultos',
      'habitacion',
      'localizador',
      'desayuno',
      'cancelacion',
      'notas',
    ];

    const examples = [
      [
        'Joan Josep Pinazo',
        'jj@ejemplo.com',
        'Hotel Napoléon Paris',
        '40 Avenue de Friedland, París',
        '+33 1 56 68 43 43',
        '20/05/2026',
        '22/05/2026',
        '15:00',
        '12:00',
        '2',
        '1',
        'Superior Room',
        '419593860',
        'Sí',
        'Cancelación gratuita hasta 48h antes',
        'Preferencia habitación alta',
      ],
      [
        'María García López',
        'maria@ejemplo.com',
        'Hotel Arts Barcelona',
        'Carrer de la Marina, 19-21, Barcelona',
        '+34 93 221 10 00',
        '23/05/2026',
        '25/05/2026',
        '14:00',
        '11:00',
        '2',
        '2',
        'Deluxe Double',
        'BCNART2026',
        'No',
        '',
        '',
      ],
      [
        'Carlos Ruiz Martínez',
        '',
        'Meliá Madrid Princesa',
        'Calle de la Princesa, 27, Madrid',
        '+34 91 541 82 00',
        '01/06/2026',
        '03/06/2026',
        '16:00',
        '12:00',
        '2',
        '1',
        'Junior Suite',
        'MAD88712',
        'Sí',
        '',
        'Cuna solicitada',
      ],
    ];

    const wsData = [headers, ...examples];
    const ws = utils.aoa_to_sheet(wsData);

    // Column widths
    ws['!cols'] = [
      { wch: 25 }, // nombre
      { wch: 25 }, // email
      { wch: 28 }, // hotel
      { wch: 35 }, // dirección
      { wch: 18 }, // teléfono
      { wch: 14 }, // fecha llegada
      { wch: 14 }, // fecha salida
      { wch: 12 }, // hora entrada
      { wch: 12 }, // hora salida
      { wch: 8 },  // noches
      { wch: 8 },  // adultos
      { wch: 20 }, // habitación
      { wch: 16 }, // localizador
      { wch: 10 }, // desayuno
      { wch: 30 }, // cancelación
      { wch: 30 }, // notas
    ];

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Alojamientos');
    writeFile(wb, 'Plantilla_Alojamientos_JP.xlsx');
  };

  const validRows = rows.filter(r => r.valid);
  const errorRows = rows.filter(r => !r.valid);

  const handleImport = async () => {
    if (!validRows.length) return;
    setImporting(true);

    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (const row of validRows) {
      try {
        const payload = rowToHotelStayPayload(row, planId);

        // Anti-duplicate: check by booking_reference + guest_name + plan_id
        const { data: existing } = await supabase
          .from('hotel_stays')
          .select('id')
          .eq('plan_id', planId)
          .eq('booking_reference', row.booking_reference!)
          .eq('guest_name', row.guest_name!)
          .is('deleted_at', null)
          .maybeSingle();

        if (existing?.id) {
          // Update existing
          await supabase.from('hotel_stays').update(payload).eq('id', existing.id);
          updated++;
        } else {
          // Insert new
          await supabase.from('hotel_stays').insert(payload);
          imported++;
        }
      } catch {
        errors++;
      }
    }

    setResult({ imported, updated, errors: errors + errorRows.length });
    setStep('result');
    setImporting(false);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-surface border border-border rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-8 pb-6 border-b border-border shrink-0">
          <div>
            <h2 className="text-2xl font-black font-heading tracking-tight">Importar Alojamientos</h2>
            <p className="text-[10px] text-muted font-black uppercase tracking-[0.2em] mt-1">
              {step === 'upload' ? 'Sube un Excel o CSV' :
               step === 'preview' ? `${fileName} · ${rows.length} filas detectadas` :
               'Importación completada'}
            </p>
          </div>
          <button onClick={onClose} className="p-3 rounded-full bg-background border border-border text-muted hover:text-accent transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 px-8 py-4 border-b border-border shrink-0">
          {(['upload', 'preview', 'result'] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                step === s ? 'text-accent' : i < ['upload','preview','result'].indexOf(step) ? 'text-emerald-500' : 'text-muted/40'
              }`}>
                {i < ['upload','preview','result'].indexOf(step) ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-[8px]">{i+1}</span>
                )}
                {s === 'upload' ? 'Subir archivo' : s === 'preview' ? 'Previsualizar' : 'Resultado'}
              </div>
              {i < 2 && <ArrowRight size={12} className="text-muted/30" />}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">

            {/* STEP 1: Upload */}
            {step === 'upload' && (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">

                {/* Download template CTA */}
                <div className="flex items-center justify-between p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                  <div className="space-y-1">
                    <p className="text-sm font-black text-foreground">¿Primera vez? Descarga la plantilla</p>
                    <p className="text-[10px] text-muted font-medium">Incluye columnas correctas y 3 ejemplos reales para guiarte.</p>
                  </div>
                  <button
                    onClick={downloadTemplate}
                    className="shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <Download size={16} />
                    Descargar plantilla
                  </button>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-[2rem] p-14 text-center cursor-pointer transition-all ${
                    dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50 hover:bg-accent/3'
                  }`}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center transition-all ${
                      dragOver ? 'bg-accent text-white' : 'bg-accent/10 text-accent'
                    }`}>
                      <FileSpreadsheet size={40} />
                    </div>
                    <div>
                      <p className="text-base font-black text-foreground">Arrastra tu Excel aquí</p>
                      <p className="text-sm text-muted font-medium mt-1">o haz clic para seleccionar</p>
                      <p className="text-[10px] text-muted/60 font-bold uppercase tracking-widest mt-3">.xlsx · .xls · .csv</p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                </div>

                {/* Expected format */}
                <div className="p-5 rounded-2xl bg-accent/5 border border-accent/10 space-y-3">
                  <p className="text-[10px] font-black text-accent uppercase tracking-widest">Columnas reconocidas (ES / EN)</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      { label: 'nombre / guest_name', req: true },
                      { label: 'hotel / hotel_name', req: true },
                      { label: 'fecha llegada / check_in', req: true },
                      { label: 'fecha salida / check_out', req: true },
                      { label: 'localizador / booking_reference', req: true },
                      { label: 'habitacion / room_type', req: false },
                      { label: 'hora entrada / check_in_time', req: false },
                      { label: 'hora salida / check_out_time', req: false },
                      { label: 'desayuno / breakfast_included', req: false },
                      { label: 'direccion / address', req: false },
                      { label: 'telefono / phone', req: false },
                      { label: 'notas / notes', req: false },
                      { label: 'grupo habitación / room_group_id', req: false },
                    ].map(col => (
                      <div key={col.label} className="flex items-center gap-2">
                        <span className={`text-[8px] font-black uppercase rounded px-1.5 py-0.5 ${col.req ? 'bg-red-500/20 text-red-400' : 'bg-muted/20 text-muted'}`}>
                          {col.req ? 'REQ' : 'OPC'}
                        </span>
                        <span className="text-[10px] font-mono text-muted">{col.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Preview */}
            {step === 'preview' && (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                {/* Summary counters */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-background border border-border text-center">
                    <p className="text-2xl font-black">{rows.length}</p>
                    <p className="text-[9px] font-black text-muted uppercase tracking-widest">Total filas</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <p className="text-2xl font-black text-emerald-500">{validRows.length}</p>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Válidas</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
                    <p className="text-2xl font-black text-red-400">{errorRows.length}</p>
                    <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Con error</p>
                  </div>
                </div>

                {/* Table */}
                <div className="rounded-2xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead className="bg-muted/30 border-b border-border">
                        <tr>
                          <th className="text-left p-3 font-black uppercase tracking-widest text-muted">Fila</th>
                          <th className="text-left p-3 font-black uppercase tracking-widest text-muted">Estado</th>
                          <th className="text-left p-3 font-black uppercase tracking-widest text-muted">Huésped</th>
                          <th className="text-left p-3 font-black uppercase tracking-widest text-muted">Hotel</th>
                          <th className="text-left p-3 font-black uppercase tracking-widest text-muted">Check-in</th>
                          <th className="text-left p-3 font-black uppercase tracking-widest text-muted">Check-out</th>
                          <th className="text-left p-3 font-black uppercase tracking-widest text-muted">Localizador</th>
                          <th className="text-left p-3 font-black uppercase tracking-widest text-muted">Habitación</th>
                          <th className="text-left p-3 font-black uppercase tracking-widest text-muted">Desayuno</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rows.map(row => (
                          <tr key={row.rowIndex} className={row.valid ? 'hover:bg-emerald-500/3' : 'bg-red-500/5 hover:bg-red-500/8'}>
                            <td className="p-3 text-muted font-mono">#{row.rowIndex}</td>
                            <td className="p-3">
                              {row.valid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-black">
                                  <CheckCircle2 size={10} /> OK
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-black" title={row.errors.join(', ')}>
                                  <AlertCircle size={10} /> Error
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-bold text-foreground">{row.guest_name || <span className="text-red-400 italic">—</span>}</td>
                            <td className="p-3 font-medium">
                              <div className="flex items-center gap-1.5">
                                <Building2 size={10} className="text-accent shrink-0" />
                                {row.hotel_name || <span className="text-red-400 italic">—</span>}
                              </div>
                            </td>
                            <td className="p-3 font-mono">{row.check_in || <span className="text-red-400 italic">—</span>}</td>
                            <td className="p-3 font-mono">{row.check_out || <span className="text-red-400 italic">—</span>}</td>
                            <td className="p-3 font-mono text-accent">{row.booking_reference || <span className="text-red-400 italic">—</span>}</td>
                            <td className="p-3 text-muted">{row.room_type || '—'}</td>
                            <td className="p-3">
                              {row.breakfast_included
                                ? <span className="text-emerald-500 font-black">Sí</span>
                                : <span className="text-muted">No</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Error details */}
                {errorRows.length > 0 && (
                  <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/10 space-y-2">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle size={12} /> Errores encontrados (estas filas no se importarán)
                    </p>
                    {errorRows.map(row => (
                      <p key={row.rowIndex} className="text-[10px] text-muted">
                        <span className="font-mono text-red-400">Fila {row.rowIndex}:</span> {row.errors.join(' · ')}
                      </p>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 3: Result */}
            {step === 'result' && result && (
              <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-12 gap-8">
                <div className="w-24 h-24 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 size={48} />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-black font-heading">¡Importación completada!</h3>
                  <p className="text-muted font-medium">Los alojamientos han sido procesados correctamente.</p>
                </div>
                <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <p className="text-2xl font-black text-emerald-500">{result.imported}</p>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Nuevos</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <p className="text-2xl font-black text-blue-400">{result.updated}</p>
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Actualizados</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
                    <p className="text-2xl font-black text-red-400">{result.errors}</p>
                    <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Errores</p>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer actions */}
        <div className="p-8 pt-6 border-t border-border shrink-0 flex gap-4">
          {step === 'upload' && (
            <>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-5 py-4 rounded-2xl bg-background border border-border text-[10px] font-black uppercase tracking-widest text-muted hover:text-accent hover:border-accent/30 transition-all"
              >
                <Download size={16} />
                Plantilla
              </button>
              <Button variant="ghost" onClick={onClose} className="flex-1 rounded-2xl py-4">Cancelar</Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="ghost" onClick={() => { setStep('upload'); setRows([]); }} className="rounded-2xl py-4 gap-2">
                <RefreshCw size={16} /> Cambiar archivo
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || validRows.length === 0}
                className="flex-1 rounded-2xl py-4 font-black gap-2"
              >
                {importing
                  ? <><Loader2 size={18} className="animate-spin" /> Importando...</>
                  : <><Upload size={18} /> Importar {validRows.length} alojamiento{validRows.length !== 1 ? 's' : ''}</>
                }
              </Button>
            </>
          )}
          {step === 'result' && (
            <Button onClick={onClose} className="flex-1 rounded-2xl py-4 font-black">Cerrar</Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
