'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sparkles, User, Shield, LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { label: 'Inicio', href: '/dashboard', icon: Home },
  { label: 'Descubrir', href: '/recommendations', icon: Sparkles },
  { label: 'Perfil', href: '/profile', icon: User },
];

export const BottomNav = () => {
  const pathname = usePathname();
  const { session } = useAuth();
  const isAdmin = session.user?.role === 'admin';

  const items = [...navItems];
  if (isAdmin) {
    items.push({ label: 'Admin', href: '/admin', icon: Shield });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/70 backdrop-blur-2xl border-t border-border/50 flex items-center justify-around px-2 py-4 pb-8 md:hidden shadow-[0_-8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_-8px_30px_rgb(0,0,0,0.2)]">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-col items-center gap-1.5 transition-all duration-300 px-4",
              isActive ? "text-accent" : "text-muted/60"
            )}
          >
            {isActive && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-1 bg-accent rounded-full animate-in fade-in slide-in-from-top-1" />
            )}
            <item.icon 
                size={20} 
                strokeWidth={isActive ? 2.5 : 2} 
                className={cn(
                  "transition-all duration-300",
                  isActive && "drop-shadow-[0_0_12px_rgba(0,174,239,0.5)] scale-110"
                )}
            />
            <span className={cn(
                "text-[9px] font-black uppercase tracking-[0.15em] transition-all",
                isActive ? "opacity-100" : "opacity-40"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};
