'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { Mail, ArrowLeft, Loader2, CheckCircle2, Shield } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/set-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al solicitar el restablecimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-8">
        <div className="flex flex-col items-center text-center gap-4">
          <Logo className="w-20 h-20 shadow-2xl shadow-accent/20" />
          <div className="space-y-1">
            <h1 className="text-2xl font-black font-heading tracking-tight text-white uppercase italic">Recuperar Acceso</h1>
            <p className="text-muted text-xs font-bold tracking-widest uppercase opacity-60">JP Intelligence Platform</p>
          </div>
        </div>

        {success ? (
          <div className="p-10 rounded-[2.5rem] bg-surface border border-emerald-500/20 text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto border border-emerald-500/20">
              <CheckCircle2 size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Email Enviado</h2>
              <p className="text-sm text-muted leading-relaxed">
                Hemos enviado un enlace de recuperación a <strong>{email}</strong>. Por favor, revisa tu bandeja de entrada y sigue las instrucciones.
              </p>
            </div>
            <Link href="/login" className="inline-flex items-center gap-2 text-accent text-xs font-black uppercase tracking-widest hover:underline pt-4">
              <ArrowLeft size={14} />
              Volver al Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 md:p-10 rounded-[3rem] bg-surface border border-border shadow-2xl space-y-6">
            <div className="space-y-2 text-center pb-4 border-b border-border/50">
              <p className="text-xs text-muted leading-relaxed italic">
                "Introduce tu email corporativo para recibir un enlace seguro de restablecimiento de contraseña."
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted tracking-widest flex items-center gap-2 px-1">
                  <Mail size={12} />
                  Email de Usuario
                </label>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-black/40 border border-border rounded-2xl p-4 text-xs focus:border-accent/40 outline-none transition-all text-white"
                  placeholder="ejemplo@quilpro.com"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold text-center">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full py-6 rounded-2xl gap-3">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Shield size={18} />}
              Solicitar Enlace
            </Button>

            <Link href="/login" className="flex items-center justify-center gap-2 text-muted hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">
              <ArrowLeft size={14} />
              Cancelar y volver
            </Link>
          </form>
        )}

        <p className="text-[10px] text-center text-muted font-bold tracking-widest uppercase opacity-40">
          Private & Confidential Access
        </p>
      </div>
    </div>
  );
}
