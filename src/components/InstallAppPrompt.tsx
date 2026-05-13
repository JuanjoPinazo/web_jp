'use client';

import React, { useEffect, useState } from 'react';
import { Smartphone, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const InstallAppPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Solo mostrar si no estamos ya en standalone
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleTrigger = () => {
      if (deferredPrompt) {
        handleInstallClick();
      } else if (!window.matchMedia('(display-mode: standalone)').matches) {
        alert("Para instalar JP Intelligence en iPhone: pulsa el botón 'Compartir' y luego 'Añadir a la pantalla de inicio'. En Android: usa el menú de opciones del navegador.");
      }
    };
    window.addEventListener('trigger-pwa-install', handleTrigger);

    // Si el usuario ya instaló la app recientemente, no mostrar
    const isDismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (isDismissed) {
      const dismissDate = new Date(isDismissed);
      const now = new Date();
      const diffDays = (now.getTime() - dismissDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < 7) { // No mostrar de nuevo por 7 días
        setShowPrompt(false);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', new Date().toISOString());
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-28 left-4 right-4 z-[100] flex items-center justify-between p-4 bg-surface/90 backdrop-blur-md border border-accent/20 rounded-[2rem] shadow-2xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <Smartphone size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-foreground uppercase tracking-widest">Instalar App</p>
              <p className="text-[10px] text-muted leading-tight">Acceso rápido desde tu inicio.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleInstallClick}
              className="px-5 py-2.5 rounded-xl bg-accent text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/20 active:scale-95 transition-all"
            >
              Instalar
            </button>
            <button 
              onClick={handleDismiss}
              className="w-10 h-10 rounded-full bg-surface-subtle flex items-center justify-center text-muted"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
