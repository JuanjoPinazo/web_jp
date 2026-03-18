'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await login(email, password);
      if (success) {
        // Redirect based on role (mock logic, context will know user by then)
        // For simplicity, just dashboard for now
        router.push('/dashboard');
      } else {
        setError('Credenciales incorrectas. Pruebe con jgcordobas@hotmail.com / doctor');
      }
    } catch (err) {
      setError('Ocurrió un error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="mb-8">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-muted hover:text-accent font-bold text-[10px] uppercase tracking-[0.2em] transition-all group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Volver al Inicio
          </button>
        </div>
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent text-background font-black text-3xl mb-6 shadow-2xl shadow-accent/20">
            JP
          </div>
          <h1 className="text-3xl font-bold font-heading mb-3">Acceso Privado</h1>
          <p className="text-muted text-sm px-8">
            Bienvenido a su plataforma personalizada de recomendaciones inteligentes.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-8 shadow-2xl backdrop-blur-sm relative group overflow-hidden">
          {/* Subtle glow on top */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted/70 ml-1">Email Empresarial</label>
              <div className="relative group/field">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl py-3 pl-11 pr-4 text-sm focus:border-accent/40 focus:ring-4 focus:ring-accent/5 outline-none transition-all"
                  placeholder="ejemplo@correo.com"
                  required
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within/field:text-accent transition-colors" size={16} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted/70 ml-1">Contraseña</label>
              <div className="relative group/field">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl py-3 pl-11 pr-4 text-sm focus:border-accent/40 focus:ring-4 focus:ring-accent/5 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within/field:text-accent transition-colors" size={16} />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold animate-pulse text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full gap-2 rounded-xl group"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>Verificar Identidad <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </Button>
          </form>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-muted/50 text-[10px] font-bold uppercase tracking-widest">
           <ShieldCheck size={12} />
           Sujeto a encriptación de grado médico
        </div>
      </div>
    </div>
  );
}
