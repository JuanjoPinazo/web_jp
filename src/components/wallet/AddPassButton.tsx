'use client';

import React, { useState } from 'react';
import { Wallet, Loader2, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

// Feature flags loaded from environment variables
const APPLE_WALLET_ENABLED = process.env.NEXT_PUBLIC_APPLE_WALLET_ENABLED === 'true';
const GOOGLE_WALLET_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_WALLET_ENABLED === 'true';

interface AddPassButtonProps {
  type: 'flight' | 'hospitality' | 'transfer';
  id: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  platform?: 'apple' | 'google' | 'both';
}

export const WalletBadge = ({ className, compact = false }: { className?: string; compact?: boolean }) => {
  const isEnabled = APPLE_WALLET_ENABLED || GOOGLE_WALLET_ENABLED;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border backdrop-blur-md transition-all duration-300",
      isEnabled 
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
        : "bg-white/5 text-white/40 border-white/5",
      className
    )}>
      <Wallet size={10} className={cn(isEnabled ? "text-emerald-400 animate-pulse" : "text-white/30")} />
      <span>{isEnabled ? "Disponible en Wallet" : compact ? "Próximamente" : "Disponible próximamente"}</span>
    </span>
  );
};

export const AddPassButton = ({ type, id, className, variant = 'outline', platform = 'both' }: AddPassButtonProps) => {
  const [loadingPlatform, setLoadingPlatform] = useState<'apple' | 'google' | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [attemptedPlatform, setAttemptedPlatform] = useState<'Apple' | 'Google'>('Apple');

  const handleAddToWallet = async (selectedPlatform: 'apple' | 'google') => {
    setLoadingPlatform(selectedPlatform);
    
    // Check if the specific platform feature flag is enabled
    const isEnabled = selectedPlatform === 'apple' ? APPLE_WALLET_ENABLED : GOOGLE_WALLET_ENABLED;

    setTimeout(() => {
      setLoadingPlatform(null);
      if (isEnabled) {
        // Redirect to real pass generator endpoint
        window.open(`/api/wallet/${type}/${id}?platform=${selectedPlatform}`, '_blank');
      } else {
        setAttemptedPlatform(selectedPlatform === 'apple' ? 'Apple' : 'Google');
        setShowNotification(true);
      }
    }, 600);
  };

  const buttonStyle = cn(
    "flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl border font-black uppercase tracking-widest text-[9px] transition-all duration-300 active:scale-95 disabled:opacity-50 flex-1 min-w-[140px]"
  );

  const appleStyle = cn(
    buttonStyle,
    "bg-black border-white/10 text-white hover:bg-neutral-900"
  );

  const googleStyle = cn(
    buttonStyle,
    "bg-black border-white/10 text-white hover:bg-neutral-900"
  );

  // SVGs for Logos
  const AppleLogo = () => (
    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 170 170" xmlns="http://www.w3.org/2000/svg">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.37.13-9.13-1.92-14.3-6.15-2.88-2.38-6.68-6.9-11.41-13.56-5.46-7.75-9.74-16.73-12.86-26.96C2.2 108.92.5 98.48.5 89c0-13.25 3.73-24.16 11.18-32.73C19.13 47.7 28.53 43.38 39.87 43.38c4.37 0 9.17 1.06 14.4 3.18 5.23 2.12 8.79 2.87 10.68 2.24 1.77-.63 5.4-1.8 10.9-3.5 5.5-1.7 10-2.54 13.5-2.54 10.87 0 20.01 3.93 27.42 11.78 5.23 5.5 8.76 11.55 10.6 18.17-8.88 5.37-13.2 12.42-12.95 21.13.25 6.9 2.86 12.63 7.82 17.2 4.96 4.56 10.84 7.06 17.65 7.5 1.5 4.25 3.5 9.25 6 15zM119.22 8.5c0 7.88-2.82 15.19-8.47 20.94-5.65 5.75-12.59 9.13-20.81 10.13-.25-8.25 2.75-15.63 9-22.13 6.25-6.5 13.38-9.88 20.28-10.13.25.38.25.75.25 1.19z" />
    </svg>
  );

  const GoogleWalletLogo = () => (
    <svg className="w-4 h-4" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M38 12H10C7.79 12 6 13.79 6 16V32C6 34.21 7.79 36 10 36H38C40.21 36 42 34.21 42 32V16C42 13.79 40.21 12 38 12Z" fill="#34A853" />
      <path d="M38 12H10C7.79 12 6 13.79 6 16V22H42V16C42 13.79 40.21 12 38 12Z" fill="#4285F4" />
      <path d="M22 20H26V28H22V20Z" fill="#FBBC05" />
      <path d="M28 24H32V28H28V24Z" fill="#EA4335" />
    </svg>
  );

  return (
    <div className={cn("w-full flex flex-col gap-2", className)}>
      <div className="flex flex-wrap gap-2.5 w-full">
        {(platform === 'apple' || platform === 'both') && (
          <button
            onClick={() => handleAddToWallet('apple')}
            disabled={loadingPlatform !== null}
            className={appleStyle}
          >
            {loadingPlatform === 'apple' ? (
              <Loader2 size={14} className="animate-spin text-accent" />
            ) : (
              <AppleLogo />
            )}
            <span>Add to Apple Wallet</span>
          </button>
        )}

        {(platform === 'google' || platform === 'both') && (
          <button
            onClick={() => handleAddToWallet('google')}
            disabled={loadingPlatform !== null}
            className={googleStyle}
          >
            {loadingPlatform === 'google' ? (
              <Loader2 size={14} className="animate-spin text-accent" />
            ) : (
              <GoogleWalletLogo />
            )}
            <span>Save to Google Wallet</span>
          </button>
        )}
      </div>

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
              className="w-full max-w-sm bg-neutral-950 text-white p-8 rounded-[2.5rem] shadow-2xl border border-white/10 relative overflow-hidden flex flex-col gap-6"
            >
              <div className="absolute -right-6 -top-6 p-6 opacity-[0.03] pointer-events-none">
                <Wallet size={160} strokeWidth={1} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/30 text-accent text-[9px] font-black uppercase tracking-widest">
                  <Sparkles size={10} /> Integración Wallet
                </div>
                <button 
                  onClick={() => setShowNotification(false)} 
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-black tracking-tight leading-tight">
                  Disponible próximamente
                </h3>
                <p className="text-xs font-medium text-white/70 leading-relaxed">
                  La integración oficial de pases para {attemptedPlatform} Wallet estará activa en tu cuenta próximamente. Mientras tanto, puedes acceder a tus códigos de barras y localizadores desde esta aplicación de manera inmediata.
                </p>
              </div>

              <button
                onClick={() => setShowNotification(false)}
                className="w-full py-4 rounded-xl bg-accent text-white font-black uppercase tracking-widest text-[10px] active:scale-95 hover:opacity-90 transition-all text-center border border-accent/20"
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
