'use client';

import React, { useState } from 'react';
import { Wallet, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddPassButtonProps {
  type: 'flight' | 'hospitality' | 'transfer';
  id: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

export const AddPassButton = ({ type, id, className, variant = 'outline' }: AddPassButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [os, setOs] = useState<'ios' | 'android' | 'other'>('other');

  React.useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) setOs('ios');
    else if (/android/.test(userAgent)) setOs('android');
  }, []);

  const handleAddToWallet = async () => {
    setLoading(true);
    try {
      // For Apple Wallet, we return the .pkpass file
      // For Google Wallet, the API will redirect to the save link
      window.location.href = `/api/wallet/${type}/${id}?platform=${os === 'android' ? 'google' : 'apple'}`;
    } catch (error) {
      console.error('Error adding to wallet:', error);
    } finally {
      setTimeout(() => setLoading(false), 2000);
    }
  };

  const variants = {
    primary: "bg-accent text-white border-transparent",
    secondary: "bg-foreground text-background border-transparent",
    outline: "bg-background border-border text-foreground hover:border-accent/40"
  };

  const label = os === 'android' ? 'Add to Google Wallet' : 'Add to Apple Wallet';

  return (
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
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Wallet size={16} />
      )}
      {label}
    </button>
  );
};
