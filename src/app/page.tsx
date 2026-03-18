'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Container } from '@/components/Container';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (session.status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [session.status, router]);

  return (
    <main className="min-h-screen pt-32 pb-20">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 -translate-x-1/2 left-1/2 w-[800px] h-[500px] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />
        
        <Container className="relative text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 border rounded-full bg-surface/50 border-border">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-accent"></span>
              <span className="relative inline-flex w-2 h-2 rounded-full bg-accent"></span>
            </span>
            <span className="text-xs font-medium tracking-wide text-muted uppercase">Sistemas de Decisión Inteligente</span>
          </div>
          
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight md:text-5xl font-heading text-foreground">
            Recomendaciones Inteligentes & <br />
            <span className="text-accent">Perspectivas Personales</span>
          </h1>
          
          <p className="max-w-2xl mx-auto mb-10 text-lg leading-relaxed md:text-xl text-muted">
            Decisiones prácticas, curadas y guiadas por la tecnología para profesionales que valoran la precisión y el tiempo.
          </p>
          
          <div className="flex flex-col items-center justify-center gap-4 w-full sm:flex-row">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full">
                Acceder al Dossier
              </Button>
            </Link>
            <Link href="/about" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full">
                La Filosofía
              </Button>
            </Link>
          </div>
        </Container>
      </section>

      {/* Philosophy Preview / Stats */}
      <section className="mt-32">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="p-8 border rounded-2xl bg-surface/30 border-border hover:border-accent/20 transition-colors">
              <div className="w-12 h-12 mb-6 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3 className="mb-3 text-xl font-bold font-heading">Precisión de Datos</h3>
              <p className="text-muted leading-relaxed">Enfoque centrado en el sistema para analizar variables antes de realizar recomendaciones accionables.</p>
            </div>
            
            <div className="p-8 border rounded-2xl bg-surface/30 border-border hover:border-accent/20 transition-colors">
              <div className="w-12 h-12 mb-6 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              </div>
              <h3 className="mb-3 text-xl font-bold font-heading">Lógica Curada</h3>
              <p className="text-muted leading-relaxed">Sin listas genéricas. Cada recomendación pasa por un filtro personal de inteligencia y calidad.</p>
            </div>

            <div className="p-8 border rounded-2xl bg-surface/30 border-border hover:border-accent/20 transition-colors">
              <div className="w-12 h-12 mb-6 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M12 2v20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <h3 className="mb-3 text-xl font-bold font-heading">Perspectiva Global</h3>
              <p className="text-muted leading-relaxed">Conocimiento local potenciado por estándares tecnológicos globales y trayectoria profesional.</p>
            </div>
          </div>
        </Container>
      </section>
      
      {/* Client Area Teaser */}
      <section className="mt-40 text-center">
        <Container>
          <div className="max-w-3xl mx-auto p-12 rounded-3xl border border-border bg-gradient-to-b from-surface to-background">
            <h2 className="mb-6 text-3xl font-bold font-heading">Portal de Clientes Privado</h2>
            <p className="mb-8 text-muted">Un área restringida para perspectivas técnicas profundas y consultas privadas.</p>
            <Link href="/login">
              <Button variant="outline">
                Acceder al Portal
              </Button>
            </Link>
          </div>
        </Container>
      </section>
      
      <footer className="mt-40 py-10 border-t border-border">
        <Container className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-sm text-muted">
            © 2026 JP. Todos los derechos reservados.
          </div>
          <div className="flex gap-8 text-sm text-muted">
            <Link href="/about" className="hover:text-accent transition-colors">Sobre mí</Link>
            <Link href="/login" className="hover:text-accent transition-colors">Portal Privado</Link>
          </div>
        </Container>
      </footer>
    </main>
  );
}
