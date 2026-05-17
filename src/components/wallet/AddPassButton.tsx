'use client';

import React, { useState } from 'react';
import { Wallet, Loader2, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

interface AddPassButtonProps {
  type: 'flight' | 'hospitality' | 'transfer';
  id: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

export const AddPassButton = ({ type, id, className, variant = 'outline' }: AddPassButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [os, setOs] = useState<'ios' | 'android' | 'other'>('other');
  const [showNotification, setShowNotification] = useState(false);

  React.useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) setOs('ios');
    else if (/android/.test(userAgent)) setOs('android');
  }, []);

  const handleAddToWallet = async () => {
    setLoading(true);
    // En lugar de redirigir y fallar por falta de certificados en backend, mostramos un aviso premium elegante
    setTimeout(() => {
      setLoading(false);
      setShowNotification(true);
    }, 600);
  };

  const variants = {
    primary: "bg-accent text-white border-transparent hover:opacity-90",
    secondary: "bg-foreground text-background border-transparent hover:opacity-90",
    outline: "bg-background/20 border-accent/20 text-foreground backdrop-blur-md hover:border-accent/40 hover:bg-accent/5"
  };

  const label = os === 'android' ? 'Añadir a Google Wallet' : 'Añadir a Apple Wallet';

  return (
    <>
      <button
        onClick={handleAddToWallet}
        disabled={loading}
        className={cn(
          "flex items-center justify-center gap-3 py-4 px-6 rounded-2xl border font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 disabled:opacity-50",
          variants[variant],
          className
        )}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin text-accent" />
        ) : (
          <Wallet size={16} className="text-accent" />
        )}
        {label}
      </button>

      <AnimatePresence>
        {showNotification && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[500] bg-background/80 backdrop-blur-lg flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 15 }} 
              className="w-full max-w-sm bg-foreground text-background p-8 rounded-[2.5rem] shadow-2xl border border-background/10 relative overflow-hidden flex flex-col gap-6"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <Wallet size={120} strokeWidth={1} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-white text-[9px] font-black uppercase tracking-widest">
                  <Sparkles size={10} /> Integración Wallet
                </div>
                <button 
                  onClick={() => setShowNotification(false)} 
                  className="p-2 hover:bg-background/10 rounded-full transition-colors text-background"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-black tracking-tight leading-tight">
                  Próximamente disponible
                </h3>
                <p className="text-xs font-medium opacity-70 leading-relaxed">
                  Estamos ultimando la emisión oficial de pases de Apple y Google. Mientras tanto, puedes visualizar y escanear tu código QR directamente desde esta aplicación sin problemas.
                </p>
              </div>

              <button
                onClick={() => setShowNotification(false)}
                className="w-full py-4 rounded-xl bg-accent text-white font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all text-center"
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
