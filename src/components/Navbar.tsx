'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from './Logo';
import { useAuth } from '@/context/AuthContext';

export const Navbar = () => {
  const { session } = useAuth();
  const isAuthenticated = session.status === 'authenticated';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center p-6 bg-transparent">
      <div className="flex items-center justify-between w-full max-w-5xl px-6 py-3 border rounded-2xl bg-background/60 backdrop-blur-xl border-border shadow-2xl shadow-accent/5">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <Logo className="w-8 h-8" />
          <span className="text-xl font-bold tracking-tight font-heading">JP</span>
        </Link>
        
        <div className="items-center hidden gap-8 md:flex">
          <Link href="/about" className="text-sm font-medium transition-colors text-muted hover:text-foreground">
            Filosofía
          </Link>
          <Link 
            href={isAuthenticated ? "/dashboard" : "/login"} 
            className="px-6 py-2 text-xs font-black tracking-widest uppercase transition-all border rounded-xl bg-accent text-background border-accent hover:bg-background hover:text-accent shadow-lg shadow-accent/10"
          >
            {isAuthenticated ? "Panel de Control" : "Acceso Clientes"}
          </Link>
        </div>
        
        <button className="flex items-center justify-center w-10 h-10 border md:hidden rounded-lg bg-surface border-border">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </nav>
  );
};
