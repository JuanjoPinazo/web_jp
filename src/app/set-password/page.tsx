'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { Shield, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Debug logs as requested
    console.log("Current URL:", window.location.href);
    
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log("Supabase Session:", session);
      if (error) console.error("Session Error:", error);

      if (!session) {
        // We can also check if there is an access_token in the hash
        if (!window.location.hash.includes('access_token=')) {
          setError('El enlace ha caducado o no es válido. Solicita un nuevo enlace.');
        }
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess(true);
      // Wait a bit and redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al establecer la contraseña');
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
            <h1 className="text-2xl font-black font-heading tracking-tight text-white uppercase italic">Configura tu Acceso</h1>
            <p className="text-muted text-xs font-bold tracking-widest uppercase opacity-60">JP Intelligence Platform</p>
          </div>
        </div>

        {success ? (
          <div className="p-10 rounded-[2.5rem] bg-surface border border-emerald-500/20 text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto border border-emerald-500/20">
              <CheckCircle2 size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">¡Todo listo!</h2>
              <p className="text-sm text-muted">Tu contraseña ha sido establecida correctamente. Accediendo a tu panel...</p>
            </div>
            <Loader2 className="animate-spin text-emerald-500 mx-auto" size={24} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 md:p-10 rounded-[3rem] bg-surface border border-border shadow-2xl space-y-6">
            <div className="space-y-2 text-center pb-4 border-b border-border/50">
              <p className="text-xs text-muted leading-relaxed italic">
                "Bienvenido a la excelencia. Por favor, define una contraseña segura para proteger tu dossier operativo."
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted tracking-widest flex items-center gap-2 px-1">
                  <Lock size={12} />
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-black/40 border border-border rounded-2xl p-4 text-xs focus:border-accent/40 outline-none transition-all pr-12 text-white"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Confirmar Contraseña</label>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-black/40 border border-border rounded-2xl p-4 text-xs focus:border-accent/40 outline-none transition-all text-white"
                  placeholder="••••••••"
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
              Finalizar Configuración
            </Button>
          </form>
        )}

        <p className="text-[10px] text-center text-muted font-bold tracking-widest uppercase opacity-40">
          Private & Confidential Access
        </p>
      </div>
    </div>
  );
}
