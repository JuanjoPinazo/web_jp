'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, Loader2, ShieldCheck, ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/Button';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, session } = useAuth();
  const router = useRouter();

  // If already logged in as admin, redirect to /admin
  useEffect(() => {
    if (session.status === 'authenticated' && session.user?.role === 'admin') {
      router.push('/admin');
    }
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await login(email, password);
      if (success) {
        // Validation happens in the background via session update
        // We handle the actual role check in the effect above or after this call
      } else {
        setError('Credenciales de administrador no válidas.');
      }
    } catch (err) {
      setError('Error en el sistema de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Matrix-like subtle background for Admin */}
      <div className="absolute inset-0 bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:20px_20px] opacity-20" />
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-accent/5 blur-[120px] rounded-full" />

      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 flex justify-between items-center">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-muted hover:text-accent font-bold text-[10px] uppercase tracking-[0.2em] transition-all group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Portal Público
          </button>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-muted">
             <Shield size={10} className="text-accent" />
             Entorno de Gestión
          </div>
        </div>
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-accent text-background font-black text-4xl mb-6 shadow-2xl shadow-accent/20">
            JP
          </div>
          <h1 className="text-3xl font-black font-heading mb-3 tracking-tight uppercase">Admin Console.</h1>
          <p className="text-muted text-[10px] font-bold uppercase tracking-[0.3em] px-8">
            Control de Inteligencia de Plataforma
          </p>
        </div>

        <div className="bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60 ml-1">Firma Digital (Email)</label>
              <div className="relative group/field">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-accent outline-none transition-all"
                  placeholder="admin@intelligence.jp"
                  required
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within/field:text-accent transition-colors" size={18} />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60 ml-1">Clave de Encriptación</label>
              <div className="relative group/field">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-accent outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within/field:text-accent transition-colors" size={18} />
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full gap-3 rounded-2xl py-7 font-black uppercase tracking-widest text-xs group"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>Acceder al Sistema <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </Button>
          </form>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
           <div className="flex items-center gap-2 text-muted/40 text-[9px] font-black uppercase tracking-[0.4em]">
              <ShieldCheck size={12} />
              Acceso Restringido a Personal Autorizado
           </div>
        </div>
      </div>
    </div>
  );
}
