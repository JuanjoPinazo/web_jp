'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { PremiumVideoHero, SubHeroFeatures } from '@/components/marketing/PremiumVideoHero';
import Link from 'next/link';

export default function Home() {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (session.status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [session.status, router]);

  return (
    <main className="min-h-screen bg-black">
      {/* Premium Video Hero */}
      <PremiumVideoHero />

      {/* Experience Section */}
      <SubHeroFeatures />
      
      {/* Footer */}
      <footer className="py-20 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <img src="/logo_jp_blanco.png" alt="JP Intelligence" className="h-6 w-auto opacity-40" />
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">
              © 2026 JP Intelligence Platform. Todos los derechos reservados.
            </p>
          </div>
          <div className="flex gap-12 text-[10px] font-black uppercase tracking-widest text-white/40">
            <Link href="/login" className="hover:text-accent transition-colors">Portal Privado</Link>
            <Link href="/about" className="hover:text-accent transition-colors">Logística Quilpro</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
