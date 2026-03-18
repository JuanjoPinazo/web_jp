'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { mockCases } from '@/data/mock-db';
import { 
  ArrowLeft, 
  Share2, 
  Printer, 
  MapPin, 
  Calendar, 
  Plane, 
  Hotel, 
  Utensils, 
  Activity, 
  Sparkles,
  Plus,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/Button';
import { cn } from '@/lib/utils';

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;
  const currentCase = mockCases.find(c => c.id === caseId);

  const [generating, setGenerating] = useState(false);
  const [aiOutput, setAiOutput] = useState<string | null>(null);

  const handleGenerateAI = async () => {
    setGenerating(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setAiOutput(
      `Basado en el contexto de "${currentCase?.title}", recomiendo priorizar la logística en ${currentCase?.type === 'travel' ? 'el transporte al centro' : 'las zonas peatonales'}. Dado el perfil, "Gran Azul" sigue siendo la opción técnica de mayor seguridad para la cena del día ${currentCase?.startDate}.`
    );
    setGenerating(false);
  };

  if (!currentCase) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h4 className="text-2xl font-black mb-4 uppercase tracking-widest text-muted">Caso no encontrado</h4>
        <Button onClick={() => router.push('/dashboard')}>Regresar al panel Principal</Button>
      </div>
    );
  }

  const sections = [
    { title: 'Transporte & Viaje', icon: Plane, type: 'flight' },
    { title: 'Alojamiento', icon: Hotel, type: 'hotel' },
    { title: 'Agenda & Eventos', icon: Activity, type: 'event' },
    { title: 'Recomendaciones JP', icon: Utensils, type: 'restaurant' },
  ];

  return (
    <div className="space-y-12 pb-20">
      {/* Navigation Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <button 
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-muted hover:text-foreground font-bold text-[10px] uppercase tracking-[0.3em] transition-all group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Regresar a mis Casos
        </button>
        
        <div className="flex gap-4">
           <button className="p-3 bg-surface border border-border rounded-xl text-muted hover:text-accent hover:border-accent/40 transition-all">
              <Share2 size={18} />
           </button>
           <button className="p-3 bg-surface border border-border rounded-xl text-muted hover:text-accent hover:border-accent/40 transition-all">
              <Printer size={18} />
           </button>
        </div>
      </div>

      {/* Hero Header */}
      <header className="p-10 rounded-[3rem] bg-gradient-to-br from-surface to-background/50 border border-border flex flex-col items-center lg:items-start text-center lg:text-left gap-6 shadow-2xl shadow-accent/5 overflow-hidden relative">
         <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
         
         <div className="flex flex-col gap-4 relative z-10 w-full">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="inline-flex items-center self-center lg:self-start gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest shadow-inner">
                 <Calendar size={12} />
                 {currentCase.startDate} - {currentCase.endDate}
              </div>
              <div className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">{currentCase.type}</div>
            </div>
            <h1 className="text-3xl md:text-5xl font-black font-heading tracking-tighter leading-tight max-w-4xl">
              {currentCase.title}
            </h1>
            <p className="text-base md:text-lg text-muted max-w-2xl leading-relaxed">
              {currentCase.description}
            </p>
         </div>
      </header>

      {/* Case Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-12">
          {sections.map((section) => {
            const items = currentCase.items?.filter(item => item.type === section.type) || [];
            return (
              <section key={section.title} className="space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10 border border-accent/20 text-accent">
                      <section.icon size={18} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest">{section.title}</h3>
                  </div>
                  <button className="p-1.5 rounded-md hover:bg-surface border border-transparent hover:border-border text-muted hover:text-accent transition-all">
                    <Plus size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  {items.length > 0 ? (
                    items.map((item) => (
                      <div key={item.id} className="p-5 bg-surface border border-border rounded-2xl group hover:border-accent/30 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-foreground">{item.title}</h4>
                          <span className="text-[9px] font-bold text-muted uppercase tracking-wider">{item.date}</span>
                        </div>
                        <p className="text-xs text-muted leading-relaxed">{item.description}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center gap-3">
                      <p className="text-xs text-muted italic">No hay registros definidos para esta sección.</p>
                      <Button variant="outline" size="sm" className="text-[9px]">Añadir Item</Button>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {/* Sidebar / AI Context Area */}
        <div className="space-y-8">
          <div className="sticky top-32 space-y-8">
            {/* AI Recommendations Section */}
            <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-accent/10 via-surface to-background border border-accent/20 shadow-xl relative overflow-hidden group">
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/10 blur-[80px] group-hover:bg-accent/20 transition-all" />
               
               <div className="flex items-center gap-3 mb-6">
                  <Sparkles size={20} className={cn("text-accent", generating && "animate-spin")} />
                  <h3 className="text-sm font-black uppercase tracking-widest">Perspectiva IA</h3>
               </div>
               
               {!aiOutput ? (
                 <>
                   <p className="text-xs text-muted mb-8 leading-relaxed">
                     Analiza el contexto de este caso para obtener una perspectiva estratégica personalizada basada en tus preferencias y logística.
                   </p>

                   <Button 
                      onClick={handleGenerateAI}
                      disabled={generating}
                      className="w-full gap-2 py-6 rounded-2xl shadow-lg shadow-accent/20"
                   >
                      {generating ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          Analizando Contexto...
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} />
                          Generar Perspectiva
                        </>
                      )}
                   </Button>
                 </>
               ) : (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-4 rounded-2xl bg-background/50 border border-accent/20 text-xs leading-relaxed text-foreground/90 font-medium">
                       {aiOutput}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setAiOutput(null)}
                      className="text-[9px] uppercase tracking-widest"
                    >
                      Regenerar análisis
                    </Button>
                 </div>
               )}
               
               <div className="mt-8 pt-8 border-t border-border/50">
                  <div className="flex items-center gap-3 text-muted">
                    <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center">
                      <MapPin size={14} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Contexto: Valencia, ES</span>
                  </div>
               </div>
            </div>

            {/* Quick Notes / Settings */}
            <div className="p-6 bg-surface border border-border rounded-3xl">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-4">Notas de Gestión</h4>
               <textarea 
                  className="w-full bg-background/50 border border-border rounded-xl p-4 text-xs min-h-[120px] focus:border-accent/40 outline-none transition-all"
                  placeholder="Añade notas contextuales aquí..."
               />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
