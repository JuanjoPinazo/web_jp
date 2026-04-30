import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileText, UserCircle, LogOut, Settings, Bell, X, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Logo } from './Logo';
import { useDialog } from '@/context/DialogContext';

interface SidebarProps {
  role: 'admin' | 'client';
  userName: string;
}

export const Sidebar = ({ role, userName }: SidebarProps) => {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { confirm } = useDialog();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Perfil', icon: UserCircle, href: '/profile' },
  ];

  const adminItem = { name: 'Panel Admin', icon: Shield, href: '/admin' };

  return (
    <>
      <aside className={cn(
        "w-64 h-screen bg-surface border-r border-border flex flex-col fixed left-0 top-0 z-50 transition-all duration-500",
        "hidden md:flex translate-x-0" // Always hidden on mobile, always flex on desktop
      )}>
        {/* Brand & Close button */}
        <div className="p-8 border-b border-border flex items-center justify-between">
          <button 
            onClick={async () => {
              const isConfirmed = await confirm({
                title: 'Cerrar sesión',
                message: '¿Deseas cerrar la sesión y volver al menú principal?',
                type: 'warning',
                confirmText: 'Cerrar sesión'
              });
              if (isConfirmed) {
                logout();
              }
            }}
            className="flex items-center gap-4 hover:opacity-80 transition-all duration-300 group text-left"
          >
            <Logo className="w-12 h-12" />
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-foreground transition-colors group-hover:text-accent">Juanjo Pinazo</span>
              <span className="text-[10px] text-muted font-bold tracking-[0.3em] uppercase opacity-60">Intelligence</span>
            </div>
          </button>
        </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 mt-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-accent/10 border border-accent/20 text-accent" 
                  : "text-muted hover:text-foreground hover:bg-foreground/5 border border-transparent"
              )}
            >
              <item.icon size={18} className={cn(isActive ? "text-accent" : "text-muted group-hover:text-foreground")} />
              <span className="text-sm font-semibold tracking-tight">{item.name}</span>
            </Link>
          );
        })}

        {role === 'admin' && (
          <div className="pt-4 mt-4 border-t border-border/50">
            <Link 
              href={adminItem.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group bg-accent/5 border border-accent/10 text-accent hover:bg-accent/10",
                pathname.startsWith('/admin') && "bg-accent text-white hover:bg-accent/90"
              )}
            >
              <adminItem.icon size={18} className={pathname.startsWith('/admin') ? "text-white" : "text-accent"} />
              <span className="text-sm font-black uppercase tracking-widest">{adminItem.name}</span>
            </Link>
          </div>
        )}
      </nav>

      {/* User Info & Actions */}
      <div className="p-4 border-t border-border bg-background/50">
        <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/20 flex items-center justify-center text-accent text-[10px] font-black uppercase">
              {userName.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground truncate">{userName}</span>
                {role === 'admin' && (
                  <span className="px-1.5 py-0.5 rounded-md bg-accent/20 text-accent text-[8px] font-black uppercase tracking-tighter border border-accent/20">
                    Admin
                  </span>
                )}
              </div>
              <span className="text-[9px] font-bold text-muted uppercase tracking-widest">{role}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
             <button className="flex-1 p-2 rounded-lg hover:bg-foreground/5 border border-transparent hover:border-border transition-all flex items-center justify-center text-muted hover:text-foreground">
                <Settings size={14} />
             </button>
             <button 
               onClick={async () => {
                 const isConfirmed = await confirm({
                   title: 'Cerrar sesión',
                   message: '¿Deseas cerrar la sesión y volver al menú principal?',
                   type: 'warning',
                   confirmText: 'Cerrar sesión'
                 });
                 if (isConfirmed) {
                   logout();
                 }
               }}
               className="flex-1 p-2 rounded-lg hover:bg-accent/10 border border-transparent hover:border-accent/20 transition-all flex items-center justify-center text-accent group"
             >
                <LogOut size={14} />
             </button>
          </div>
        </div>
      </div>
    </aside>
  </>
  );
};
