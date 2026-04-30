'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Container } from '@/components/Container';
import { ShieldCheck, ChevronRight, Activity, Stethoscope, Award, Briefcase } from 'lucide-react';

export default function AboutPage() {
  return (
    <main className="min-h-screen pt-32 pb-20 bg-background text-foreground">
      <Navbar />
      
      <Container>
        <div className="grid gap-20 lg:grid-cols-12 items-start">
          <section className="lg:col-span-7 space-y-12">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                <ShieldCheck size={14} className="text-accent" />
                <span className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase tracking-widest">Autoridad & Origen</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black font-heading tracking-tight leading-[0.95]">
                Más de 27 años <br />
                <span className="text-accent">al servicio clínico.</span>
              </h1>
            </div>
            
            <div className="space-y-8 text-muted leading-relaxed text-lg font-medium">
              <p>
                Más de <span className="text-foreground font-bold">27 años de experiencia</span> en el sector de tecnología médica cardiovascular, acompañando de forma directa a equipos clínicos en su práctica diaria.
              </p>
              <p>
                Mi trayectoria comienza en <span className="text-foreground">St. Jude Medical España</span> y continúa en <span className="text-foreground">Quilpro Cardio</span>, como partner estratégico en la distribución y soporte de soluciones de alto impacto clínico (posteriormente Abbott).
              </p>
              <p>
                He trabajado junto a cardiólogos intervencionistas, cirujanos cardíacos, intensivistas y especialistas, no solo desde el producto, sino desde la operativa real en quirófano y entorno hospitalario.
              </p>
              <div className="p-8 rounded-[2.5rem] bg-surface border border-border italic text-foreground/80 leading-relaxed">
                "Esta experiencia nos ha llevado a entender que el verdadero valor no está solo en la tecnología, sino en facilitar el día a día del profesional sanitario."
              </div>
              <p>
                Asumimos de forma integral la gestión de todo lo que rodea su actividad fuera del hospital: inscripciones a congresos, organización de viajes, coordinación de alojamientos y soporte continuo.
              </p>
              <p className="text-xl font-bold text-foreground">
                JP Intelligence nace para transformar esta experiencia operativa en un sistema capaz de anticipar, coordinar y resolver automáticamente cada detalle.
              </p>
            </div>
          </section>
          
          <div className="lg:col-span-5 space-y-6 lg:pt-24">
            <div className="p-10 rounded-[3rem] bg-surface border border-border shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                  <Activity size={120} />
               </div>
               <h3 className="text-2xl font-black font-heading mb-8 uppercase tracking-tighter">Áreas de Impacto</h3>
               <div className="space-y-6">
                  {[
                    { title: "Equipos Clínicos", desc: "Cardiología y Cirugía Cardiovascular", icon: Stethoscope },
                    { title: "Entorno Hospitalario", desc: "Soporte en quirófano y UCI", icon: Award },
                    { title: "Logística Especializada", desc: "Gestión de Congresos y Eventos", icon: Briefcase }
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                       <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
                          <item.icon size={20} />
                       </div>
                       <div>
                          <h4 className="font-bold text-foreground text-sm">{item.title}</h4>
                          <p className="text-xs text-muted mt-1">{item.desc}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-accent text-white shadow-xl shadow-accent/20">
               <h3 className="text-lg font-black font-heading mb-4 uppercase">El Objetivo</h3>
               <p className="text-sm font-medium leading-relaxed opacity-90">
                 Eliminar la fricción operativa para que el profesional pueda centrarse exclusivamente en su trabajo clínico.
               </p>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
