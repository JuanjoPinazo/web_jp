'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, Loader2, ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
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
        setShowSuccess(true);
      } else {
        setError('Credenciales incorrectas o usuario no registrado.');
      }
    } catch (err) {
      setError('Ocurrió un error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <AnimatePresence mode="wait">
        {!showSuccess ? (
          <motion.div 
            key="login-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md relative z-10"
          >
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
              <h1 className="text-3xl font-bold font-heading mb-3 tracking-tighter">Acceso Privado</h1>
              <p className="text-muted text-sm px-8">
                Bienvenido a su plataforma personalizada de inteligencia operativa.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-sm relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted/70 ml-1">Email Profesional</label>
                  <div className="relative group/field">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl py-4 pl-12 pr-4 text-sm focus:border-accent/40 focus:ring-4 focus:ring-accent/5 outline-none transition-all"
                      placeholder="ejemplo@correo.com"
                      required
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within/field:text-accent transition-colors" size={18} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted/70 ml-1">Contraseña</label>
                  <div className="relative group/field">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl py-4 pl-12 pr-4 text-sm focus:border-accent/40 focus:ring-4 focus:ring-accent/5 outline-none transition-all"
                      placeholder="••••••••"
                      required
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within/field:text-accent transition-colors" size={18} />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold animate-pulse text-center uppercase tracking-widest">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-14 gap-2 rounded-2xl group text-base font-black uppercase tracking-widest shadow-xl shadow-accent/10"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>Verificar Identidad <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
                  )}
                </Button>
                
                <div className="pt-4 text-center">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
                    ¿No tiene acceso?{' '}
                    <button 
                      type="button"
                      onClick={() => router.push('/register')}
                      className="text-accent hover:underline decoration-accent/30 underline-offset-4"
                    >
                      Solicitar Acceso Profesional
                    </button>
                  </p>
                </div>
              </form>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-muted/50 text-[10px] font-black uppercase tracking-widest">
               <ShieldCheck size={14} />
               Sujeto a encriptación de grado médico
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="success-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md relative z-10"
          >
            <div className="bg-surface border border-accent/30 rounded-[3rem] p-12 shadow-2xl text-center space-y-8 relative overflow-hidden">
               {/* Success Glow */}
               <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 blur-[80px] rounded-full" />
               <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-accent/10 blur-[80px] rounded-full" />

               <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-emerald-500/10 text-emerald-500 mb-4 border border-emerald-500/20 shadow-inner">
                  <CheckCircle2 size={48} className="animate-in zoom-in-50 duration-500" />
               </div>

               <div className="space-y-3">
                  <h2 className="text-3xl font-black font-heading tracking-tight">Identidad Verificada</h2>
                  <p className="text-muted text-sm px-4">
                     Su acceso ha sido validado correctamente. Ya puede entrar en su plataforma personalizada.
                  </p>
               </div>

               <div className="pt-4">
                  <Button 
                    onClick={handleProceed}
                    className="w-full h-16 rounded-2xl gap-3 text-lg font-black uppercase tracking-widest shadow-2xl shadow-accent/20 transition-all hover:scale-105 active:scale-95 group"
                  >
                     Entrar en la plataforma
                     <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                  </Button>
               </div>

               <p className="text-[10px] text-muted/60 font-bold uppercase tracking-widest">
                  Redireccionando de forma segura...
               </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
