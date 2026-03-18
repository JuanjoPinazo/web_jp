import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileText, UserCircle, LogOut, Settings, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Logo } from './Logo';

interface SidebarProps {
  role: 'admin' | 'client';
  userName: string;
}

export const Sidebar = ({ role, userName }: SidebarProps) => {
  const pathname = usePathname();
  const { logout } = useAuth();

  const menuItems = role === 'admin' 
    ? [
        { name: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
        { name: 'Usuarios', icon: Users, href: '/admin/users' },
        { name: 'Dossiers', icon: FileText, href: '/admin/dossiers' },
      ]
    : [
        { name: 'Mis Dossiers', icon: LayoutDashboard, href: '/dashboard' },
        { name: 'Perfil', icon: UserCircle, href: '/profile' },
      ];

  return (
    <aside className="w-64 h-screen bg-surface border-r border-border flex flex-col fixed left-0 top-0 z-50">
      {/* Brand */}
      <div className="p-8 border-b border-border">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Logo className="w-10 h-10" />
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-foreground uppercase">Precision</span>
            <span className="text-[10px] text-muted font-bold tracking-[0.2em] uppercase opacity-50">Platform</span>
          </div>
        </Link>
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
      </nav>

      {/* User Info & Actions */}
      <div className="p-4 border-t border-border bg-background/50">
        <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/20 flex items-center justify-center text-accent text-[10px] font-black uppercase">
              {userName.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-foreground truncate">{userName}</span>
              <span className="text-[9px] font-bold text-muted uppercase tracking-widest">{role}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
             <button className="flex-1 p-2 rounded-lg hover:bg-foreground/5 border border-transparent hover:border-border transition-all flex items-center justify-center text-muted hover:text-foreground">
                <Settings size={14} />
             </button>
             <button 
               onClick={logout}
               className="flex-1 p-2 rounded-lg hover:bg-accent/10 border border-transparent hover:border-accent/20 transition-all flex items-center justify-center text-accent group"
             >
                <LogOut size={14} />
             </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
