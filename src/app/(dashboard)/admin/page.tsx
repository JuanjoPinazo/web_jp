'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { mockUsers, mockDossiers } from '@/data/mock-db';
import { Users, FileText, Plus, Search, MoreHorizontal, UserPlus, Filter, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/Button';

export default function AdminPage() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'dossiers'>('users');

  if (session.user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
        <h4 className="text-2xl font-black mb-4 uppercase tracking-widest text-muted">Acceso Restringido</h4>
        <p className="text-muted/50 mb-8 max-w-sm">Esta sección está reservada para el administrador de la plataforma JP Precision.</p>
        <Button onClick={() => window.location.href = '/dashboard'}>Regresar al Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-black font-heading tracking-tight">Panel Administrativo</h1>
          <p className="text-muted text-sm font-medium">Gestión de usuarios y dossieres de recomendación inteligente.</p>
        </div>
        <div className="flex gap-4">
           {activeTab === 'users' ? (
             <Button className="gap-2 rounded-xl">
               <UserPlus size={18} /> Nuevo Usuario
             </Button>
           ) : (
             <Button className="gap-2 rounded-xl">
               <Plus size={18} /> Generar Dossier
             </Button>
           )}
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row justify-between gap-6 pt-4 border-t border-border/50">
        <div className="flex bg-surface p-1 rounded-2xl border border-border shadow-inner">
           <button 
             onClick={() => setActiveTab('users')}
             className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-background text-accent border border-border/50 shadow-sm' : 'text-muted hover:text-foreground'}`}
           >
             <Users size={14} /> Usuarios
           </button>
           <button 
             onClick={() => setActiveTab('dossiers')}
             className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'dossiers' ? 'bg-background text-accent border border-border/50 shadow-sm' : 'text-muted hover:text-foreground'}`}
           >
             <FileText size={14} /> Dossieres
           </button>
        </div>

        <div className="flex gap-4">
           <div className="relative group/search max-w-xs">
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="w-full bg-surface border border-border rounded-xl py-2 pl-10 pr-4 text-xs focus:border-accent/40 focus:ring-4 focus:ring-accent/5 outline-none transition-all placeholder:text-muted/50"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/50 group-focus-within/search:text-accent transition-colors" size={14} />
           </div>
           <button className="p-2.5 bg-surface border border-border rounded-xl text-muted hover:text-accent hover:border-accent/40 transition-all flex items-center justify-center">
              <Filter size={16} />
           </button>
        </div>
      </div>

      {/* Tables Area */}
      <div className="bg-surface border border-border rounded-[2.5rem] overflow-hidden shadow-2xl shadow-accent/5">
        {activeTab === 'users' ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-background/30">
                <th className="px-8 py-5 text-[10px] font-black uppercase text-muted tracking-widest">Identidad</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-muted tracking-widest">Email / Teléfono</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-muted tracking-widest text-center">Dossieres</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-muted tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {mockUsers.map((user) => (
                <tr key={user.id} className="border-b border-border/50 hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-xs font-black uppercase">
                          {user.name[0]}{user.surname[0]}
                       </div>
                       <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground tracking-tight">{user.name} {user.surname}</span>
                          <span className="text-[10px] font-medium text-muted uppercase tracking-widest">{user.role}</span>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-0.5">
                       <span className="text-xs font-semibold text-foreground/80">{user.email}</span>
                       <span className="text-[10px] font-medium text-muted">{user.phone}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="inline-flex px-3 py-1 rounded-full bg-background border border-border text-[10px] font-black text-accent">
                       {mockDossiers.filter(d => d.userId === user.id).length}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                     <div className="flex items-center justify-end gap-2">
                        <button className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-foreground transition-all">
                           <MoreHorizontal size={18} />
                        </button>
                        <button className="p-2 rounded-lg bg-accent/5 border border-accent/20 text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                           <ArrowUpRight size={18} />
                        </button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-background/30">
                <th className="px-8 py-5 text-[10px] font-black uppercase text-muted tracking-widest">Dossier</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-muted tracking-widest">Asignado a</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-muted tracking-widest text-center">Fecha</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-muted tracking-widest text-right">Manejo</th>
              </tr>
            </thead>
            <tbody>
              {mockDossiers.map((dossier) => {
                const user = mockUsers.find(u => u.id === dossier.userId);
                return (
                  <tr key={dossier.id} className="border-b border-border/50 hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500">
                             <FileText size={18} />
                          </div>
                          <div className="flex flex-col max-w-xs overflow-hidden">
                             <span className="text-sm font-bold text-foreground tracking-tight truncate">{dossier.title}</span>
                             <span className="text-[9px] font-medium text-muted uppercase tracking-widest">Rercomendaciones: {dossier.recommendations.length}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center text-[8px] font-black text-muted">
                             {user?.name[0]}{user?.surname[0]}
                          </div>
                          <span className="text-xs font-semibold">{user?.name} {user?.surname}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <span className="px-3 py-1 rounded-lg bg-background border border-border text-[10px] font-black text-muted/70">{dossier.date}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex items-center justify-end gap-4">
                          <button className="text-[10px] font-black uppercase tracking-widest text-accent hover:underline">Editar</button>
                          <button className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:underline">Eliminar</button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Platform Health/Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
         <div className="p-8 rounded-[2.5rem] bg-accent/5 border border-accent/20 flex items-center gap-6 group hover:bg-accent/10 transition-all">
            <div className="w-16 h-16 rounded-3xl bg-accent flex items-center justify-center text-background text-2xl font-black shadow-2xl shadow-accent/20 group-hover:scale-105 transition-transform">
               JP
            </div>
            <div className="flex flex-col">
               <span className="text-lg font-black tracking-tight">Estado de la Plataforma Inteligente</span>
               <span className="text-xs font-medium text-muted">Todos los sistemas operativos. Encriptación activa. Versión 2.0.0</span>
            </div>
         </div>
      </div>
    </div>
  );
}
