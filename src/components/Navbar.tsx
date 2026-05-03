'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from './Logo';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Moon, Sun, Menu, Shield } from 'lucide-react';

export const Navbar = () => {
  const { session } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isAuthenticated = session.status === 'authenticated';
  const isAdmin = session.user?.role === 'admin';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 md:p-6 bg-transparent">
      <div className="flex items-center justify-between w-full max-w-5xl px-4 md:px-6 py-3 border rounded-2xl bg-surface/80 backdrop-blur-xl border-border shadow-lg shadow-accent/5">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <Logo className="w-8 h-8" />
          <span className="text-lg md:text-xl font-bold tracking-tight font-heading">JP Intelligence Platform</span>
        </Link>
        
        <div className="flex items-center gap-3 md:gap-6">
          <div className="items-center hidden gap-6 md:flex">
            <Link href="/about" className="text-sm font-medium transition-colors text-muted hover:text-foreground">
              Filosofía
            </Link>
            <Link 
              href={isAuthenticated ? "/dashboard" : "/login"} 
              className="px-6 py-2 text-xs font-black tracking-widest uppercase transition-all border rounded-xl bg-accent text-white border-accent hover:bg-transparent hover:text-accent shadow-lg shadow-accent/10"
            >
              {isAuthenticated ? "Panel de Control" : "Acceso Clientes"}
            </Link>

          </div>
          
          <button 
            onClick={toggleTheme} 
            className="flex items-center justify-center w-10 h-10 transition-colors border rounded-xl bg-background/50 border-border text-muted hover:text-foreground hover:border-accent/50"
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <button className="flex items-center justify-center w-10 h-10 border md:hidden rounded-xl bg-background/50 border-border text-muted hover:text-foreground">
            <Menu size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
};
