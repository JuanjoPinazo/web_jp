'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Save, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/Button';

interface ContentBlock {
  key: string;
  value: string;
}

export default function AdminContentPage() {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('content_blocks')
        .select('key, value')
        .order('key');
      
      if (error) throw error;
      setBlocks(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (key: string, value: string) => {
    try {
      setSaving(key);
      setMessage(null);
      const { error } = await supabase
        .from('content_blocks')
        .upsert({ key, value, updated_at: new Date().toISOString() });
      
      if (error) throw error;
      setMessage({ type: 'success', text: `Bloque "${key}" actualizado.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-5xl font-black font-heading tracking-tight text-foreground">Gestión de Contenido.</h1>
        <p className="text-muted text-sm font-medium uppercase tracking-widest">Editor de bloques estáticos y landing page en tiempo real.</p>
      </header>

      {message && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
           {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
           <span className="text-xs font-bold">{message.text}</span>
        </div>
      )}

      <div className="grid gap-6">
        {blocks.length === 0 && (
          <div className="p-12 text-center bg-surface border border-dashed border-border rounded-3xl opacity-50 space-y-3">
             <FileText className="mx-auto" size={40} />
             <p className="text-sm font-medium">No hay bloques registrados. Añada uno desde SQL o la consola.</p>
          </div>
        )}
        
        {blocks.map((block) => (
          <div key={block.key} className="p-8 rounded-[2.5rem] bg-surface border border-border shadow-sm flex flex-col gap-6">
            <div className="flex justify-between items-center">
               <h3 className="text-[10px] font-black uppercase text-accent tracking-[0.2em]">{block.key}</h3>
               <span className="text-[8px] font-bold text-muted bg-muted/10 px-2 py-1 rounded-full">Key Estática</span>
            </div>
            
            <textarea 
              className="w-full h-32 bg-background/50 border border-border rounded-2xl p-6 text-sm focus:border-accent/40 outline-none transition-all resize-none"
              defaultValue={block.value}
              onBlur={(e) => {
                if (e.target.value !== block.value) {
                  handleUpdate(block.key, e.target.value);
                }
              }}
            />
            
            <div className="flex justify-end gap-3 text-[10px] font-bold text-muted items-center">
               {saving === block.key && (
                 <>
                   <Loader2 size={14} className="animate-spin text-accent" />
                   Guardando...
                 </>
               )}
               {!saving && <p>Los cambios se guardan al perder el foco.</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
