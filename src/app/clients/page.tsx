"use client";

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Container } from '@/components/Container';
import { Button } from '@/components/Button';
import { Lock, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ClientsPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const authorizedEmails = [
    'jgcordobas@hotmail.com',
    'juanjo_pinazo@example.com' // Placeholder para el correo de Juanjo
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulación de validación
    setTimeout(() => {
      if (authorizedEmails.includes(email.toLowerCase())) {
        // En una app real usaríamos una cookie o un JWT. Aquí usamos sessionStorage para el mock.
        sessionStorage.setItem('jp_access_token', 'authorized');
        router.push('/restaurants');
      } else {
        setError('Acceso denegado. Este correo no tiene permisos para el Dossier Privado.');
        setLoading(false);
      }
    }, 1000);
  };

  return (
    <main className="min-h-screen pt-32 pb-20 bg-background text-foreground flex flex-col">
      <Navbar />
      
      <Container className="flex-grow flex items-center justify-center">
        <div className="w-full max-w-xl p-1 rounded-3xl bg-gradient-to-b from-border to-transparent">
          <div className="bg-surface rounded-[calc(1.5rem-1px)] p-12 text-center shadow-2xl">
            <div className="w-20 h-20 bg-accent/5 rounded-3xl mx-auto mb-10 flex items-center justify-center text-accent border border-accent/20">
              <Lock size={40} className="opacity-80" />
            </div>
            
            <h1 className="text-3xl font-extrabold font-heading mb-4">Portal de Acceso Privado</h1>
            <p className="text-muted mb-10 text-sm leading-relaxed max-w-sm mx-auto">
              Bienvenido al área restringida de <span className="text-foreground font-bold">JP</span>. Por favor, identifíquese para acceder al Dossier de Recomendaciones.
            </p>
            
            <form onSubmit={handleLogin} className="space-y-4 mb-8 text-left">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-1">Correo Electrónico Autorizado</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com" 
                  required
                  className="w-full px-5 py-4 rounded-xl bg-background border border-border text-foreground placeholder:text-muted/30 focus:outline-none focus:border-accent/50 transition-colors text-sm font-bold tracking-wider"
                />
              </div>
              
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold text-center">
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full h-14 uppercase tracking-[0.2em] text-xs" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : "Verificar Identidad"}
              </Button>
            </form>
            
            <div className="flex items-center justify-center gap-2 mb-10">
              <ShieldCheck size={14} className="text-accent" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Entorno de Decisión Seguro</span>
            </div>
            
            <div className="pt-8 border-t border-border/50">
              <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-accent hover:text-white transition-colors uppercase tracking-widest">
                <ArrowLeft size={14} /> Volver a la Portada Pública
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
