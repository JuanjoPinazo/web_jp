import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Container } from '@/components/Container';
import { Terminal, Cpu, Database, ChevronRight } from 'lucide-react';

export default function AboutPage() {
  return (
    <main className="min-h-screen pt-32 pb-20 bg-background text-foreground">
      <Navbar />
      
      <Container>
        <div className="grid gap-20 md:grid-cols-2 items-start">
          <section className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
              <Cpu size={14} className="text-accent" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase">El Arquitecto</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-extrabold font-heading tracking-tight leading-tight">
              Diseñando <br />
              <span className="text-accent underline decoration-accent/20 underline-offset-8">Sistemas de Decisión</span>
            </h1>
            
            <div className="space-y-6 text-muted leading-relaxed text-lg">
              <p>
                Mi enfoque profesional se centra en la intersección de la <span className="text-foreground">arquitectura de sistemas</span> y la optimización de procesos de decisión. Creo firmemente que la tecnología debe servir para reducir la entropía en las elecciones cotidianas.
              </p>
              <p>
                Este proyecto nace como una extensión de mi mentalidad técnica: una herramienta diseñada para mis clientes y colaboradores donde cada recomendación ha pasado por un filtro de <span className="text-foreground font-semibold">calidad, logística y experiencia real</span>.
              </p>
              <p>
                No se trata de una guía gastronómica, sino de una <span className="text-foreground font-semibold">Herramienta de Decisión Inteligente</span>. Analizamos variables como la idoneidad dominical, la afluencia familiar y la fidelidad al producto para asegurar resultados de alta precisión.
              </p>
            </div>
          </section>
          
          <div className="space-y-6 pt-12 md:pt-24">
            <div className="p-8 rounded-3xl bg-surface border border-border group hover:border-accent/30 transition-all shadow-xl">
               <div className="mb-6 w-12 h-12 rounded-2xl bg-background border border-border flex items-center justify-center text-accent">
                 <Terminal size={24} />
               </div>
               <h3 className="text-xl font-bold font-heading mb-4">Trayectoria Técnica</h3>
               <div className="space-y-4">
                  {[
                    "Arquitectura de Software Progresiva",
                    "Sistemas de Recomendación Basados en Datos",
                    "Optimización de UX para Entornos de Alta Demanda"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-muted">
                       <ChevronRight size={14} className="text-accent" />
                       <span>{item}</span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="p-8 rounded-3xl bg-surface border border-border relative overflow-hidden">
               <div className="absolute top-0 right-0 p-6 opacity-5">
                  <Database size={100} />
               </div>
               <h3 className="text-xl font-bold font-heading mb-4 text-foreground/90 font-serif italic">Filosofía</h3>
               <p className="text-sm text-muted leading-relaxed italic">
                 "La excelencia técnica reside en la capacidad de simplificar lo complejo. Mi objetivo es proporcionar una capa de inteligencia operativa sobre el ruido de la información actual."
               </p>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
