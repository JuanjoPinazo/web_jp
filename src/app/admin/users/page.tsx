'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/hooks/useAdmin';
import { User } from '@/types/platform';
import { Loader2, UserCircle, Shield, User as UserIcon, Mail, Phone, Calendar, Plus, X, Trash2, Edit2, Search, LayoutGrid, List, Filter, Building2, MoreHorizontal, Send } from 'lucide-react';
import { useDialog } from '@/context/DialogContext';
import { Button } from '@/components/Button';
import { motion, AnimatePresence } from 'framer-motion';

type ViewMode = 'grid' | 'compact';

export default function AdminUsersPage() {
  const { getUsers, updateUserRole, getClients } = useAdmin();
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'client'>('all');
  const { confirm, alert } = useDialog();

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    surname: '',
    role: 'client',
    client_id: '',
    phone: '',
    sendInvite: true
  });

  useEffect(() => {
    loadData();
  }, [getUsers, getClients]);

  useEffect(() => {
    if (editingUser) {
      setFormData({
        email: editingUser.email || '',
        name: editingUser.name || '',
        surname: editingUser.surname || '',
        role: editingUser.role || 'client',
        client_id: editingUser.client_id || '',
        phone: editingUser.phone || '',
        sendInvite: false
      });
      setIsModalOpen(true);
    }
  }, [editingUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, clientsData] = await Promise.all([getUsers(), getClients()]);
      setUsers(usersData);
      setClients(clientsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;

      const endpoint = editingUser ? '/api/admin/update-user' : '/api/admin/create-user';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingUser ? { ...formData, userId: editingUser.id } : formData)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error en la operación');

      await alert({ 
        title: 'Éxito', 
        message: editingUser 
          ? 'Usuario actualizado correctamente.' 
          : formData.sendInvite 
            ? 'Usuario invitado correctamente.' 
            : 'Usuario creado en borrador (sin invitación).', 
        type: 'success' 
      });
      
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ email: '', name: '', surname: '', role: 'client', client_id: '', phone: '', sendInvite: true });
      loadData();
    } catch (err: any) {
      console.error(err);
      await alert({ title: 'Error', message: err.message, type: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendInvite = async (user: User) => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;

      const response = await fetch('/api/admin/resend-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Error al reenviar invitación');
      }

      const result = await response.json();
      
      if (result.success === false && result.message === 'ESTADO_ACTIVO') {
        await alert({ 
          title: 'Usuario ya Activo', 
          message: 'Este usuario ya ha activado su cuenta anteriormente. No necesita una nueva invitación.', 
          type: 'warning' 
        });
        return;
      }

      await alert({ 
        title: 'Invitación Enviada', 
        message: `Se ha enviado un nuevo email de acceso a ${user.email} con el formato premium.`, 
        type: 'success' 
      });
    } catch (err: any) {
      console.error(err);
      await alert({ title: 'Error', message: err.message, type: 'danger' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const ok = await confirm({ 
      title: 'Eliminar Usuario', 
      message: '¿Estás seguro de que deseas eliminar permanentemente a este usuario? Esta acción borrará su perfil y su acceso al sistema.', 
      type: 'danger' 
    });
    
    if (!ok) return;

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;

      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Error al eliminar usuario');
      }

      await alert({ title: 'Usuario Eliminado', message: 'El usuario ha sido borrado correctamente.', type: 'success' });
      await loadData(); // Refresh list
    } catch (err: any) {
      console.error(err);
      await alert({ title: 'Error', message: err.message, type: 'danger' });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.surname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-5xl font-black font-heading tracking-tight text-foreground">Gestión de Contactos.</h1>
          <p className="text-muted text-sm font-medium uppercase tracking-widest">Administración de perfiles, roles y accesos exclusivos.</p>
        </div>
        <div className="flex items-center gap-4 w-full lg:w-auto">
           <div className="flex bg-surface border border-border p-1.5 rounded-2xl">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:text-foreground'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('compact')}
                className={`p-2.5 rounded-xl transition-all ${viewMode === 'compact' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:text-foreground'}`}
              >
                <List size={18} />
              </button>
           </div>
           <Button className="flex-1 lg:flex-none gap-2 rounded-2xl px-6 py-6 shadow-xl shadow-accent/10" onClick={() => setIsModalOpen(true)}>
             <Plus size={20} />
             Nuevo Contacto
           </Button>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-surface/50 border border-border p-4 rounded-3xl backdrop-blur-xl">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input 
              type="text"
              placeholder="Buscar por nombre, apellidos o email..."
              className="w-full bg-background border border-border rounded-2xl py-3.5 pl-12 pr-4 text-xs outline-none focus:border-accent/40 transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
         </div>
         <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative group">
               <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={14} />
               <select 
                 className="bg-background border border-border rounded-2xl py-3.5 pl-10 pr-8 text-[10px] font-black uppercase tracking-widest outline-none focus:border-accent/40 appearance-none cursor-pointer"
                 value={filterRole}
                 onChange={e => setFilterRole(e.target.value as any)}
               >
                  <option value="all">Todos los Roles</option>
                  <option value="admin">Administradores</option>
                  <option value="client">Clientes / Usuarios</option>
               </select>
            </div>
            <div className="px-4 py-3.5 bg-accent/5 border border-accent/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-accent">
               {filteredUsers.length} Resultados
            </div>
         </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-3"}>
          {filteredUsers.map((user) => (
            viewMode === 'grid' ? (
              <motion.div 
                layout
                key={user.id} 
                className="p-8 rounded-[2.5rem] bg-surface border border-border shadow-sm flex flex-col gap-6 group hover:border-accent/30 transition-all relative overflow-hidden"
              >
                <div className="flex justify-between items-start relative z-10">
                   <div className="w-14 h-14 rounded-2xl bg-muted/10 border border-border flex items-center justify-center text-muted group-hover:scale-110 transition-transform">
                     <UserCircle size={32} />
                   </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleResendInvite(user)} title="Reenviar Invitación" className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent hover:bg-accent hover:text-white transition-all"><Send size={16} /></button>
                      <button onClick={() => setEditingUser(user)} className="p-2.5 rounded-xl bg-background border border-border text-muted hover:text-accent transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteUser(user.id)} className="p-2.5 rounded-xl bg-background border border-border text-muted hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                    </div>
                </div>

                <div className="space-y-1 relative z-10">
                   <div className="flex flex-wrap gap-2 pt-1">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${user.role === 'admin' ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-muted/10 border-border text-muted'}`}>
                        {user.role === 'admin' ? <Shield size={10} /> : <UserIcon size={10} />}
                        {user.role}
                      </div>
                      
                      {/* Onboarding Status Badge */}
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        user.onboarding_status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 
                        user.onboarding_status === 'invited' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 
                        'bg-slate-500/10 border-slate-500/20 text-slate-400'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          user.onboarding_status === 'active' ? 'bg-emerald-500' : 
                          user.onboarding_status === 'invited' ? 'bg-blue-500' : 
                          'bg-slate-500'
                        }`} />
                        {user.onboarding_status || 'draft'}
                      </div>
                   </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border/50 relative z-10">
                   <div className="flex items-center gap-3 text-muted">
                      <Mail size={14} className="text-accent" />
                      <span className="text-[10px] font-bold">{user.email}</span>
                   </div>
                   {user.phone && (
                     <div className="flex items-center gap-3 text-muted">
                        <Phone size={14} className="text-accent" />
                        <span className="text-[10px] font-bold">{user.phone}</span>
                     </div>
                   )}
                   {user.invitation_sent_at && user.onboarding_status !== 'active' && (
                      <div className="flex items-center gap-3 text-muted/60">
                         <Calendar size={12} />
                         <span className="text-[9px] font-medium italic">Invitado el {new Date(user.invitation_sent_at).toLocaleDateString()}</span>
                      </div>
                   )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                layout
                key={user.id} 
                className="p-4 rounded-2xl bg-surface border border-border hover:border-accent/30 transition-all flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-muted/10 border border-border flex items-center justify-center text-muted group-hover:scale-110 transition-transform">
                    <UserCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{user.name} {user.surname}</h3>
                    <p className="text-[10px] text-muted">{user.email}</p>
                  </div>
                </div>
                       <div className="flex items-center gap-3">
                    <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border ${
                      user.onboarding_status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 
                      user.onboarding_status === 'invited' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 
                      'bg-slate-500/10 border-slate-500/20 text-slate-400'
                    }`}>
                      {user.onboarding_status || 'draft'}
                    </div>

                    <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${user.role === 'admin' ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-muted/10 border-border text-muted'}`}>
                      {user.role}
                    </div>
                  </div>
                  
                  <div className="text-[10px] text-muted font-mono w-24 truncate">
                    {user.clients?.name || '—'}
                  </div>

                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleResendInvite(user)} title="Reenviar Invitación" className="p-2 rounded-lg bg-background border border-border text-muted hover:text-accent transition-all"><Send size={14} /></button>
                    <button onClick={() => setEditingUser(user)} className="p-2 rounded-lg bg-background border border-border text-muted hover:text-accent transition-all"><Edit2 size={14} /></button>
                    <button onClick={() => handleDeleteUser(user.id)} className="p-2 rounded-lg bg-background border border-border text-muted hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                  </div>
              </motion.div>
            )
          ))}
        </div>
      )}

      {/* RE-USING MODAL LOGIC FROM PREVIOUS VIEW BUT WITH UPDATED DESIGN */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-surface border border-border rounded-[3rem] p-10 shadow-2xl overflow-hidden">
               {/* Modal Content */}
                <div className="flex justify-between items-center mb-10">
                   <h3 className="text-3xl font-black font-heading tracking-tighter uppercase">{editingUser ? 'Actualizar' : 'Invitar'}</h3>
                   <button onClick={() => { setIsModalOpen(false); setEditingUser(null); setFormData({ email: '', name: '', surname: '', role: 'client', client_id: '', phone: '', sendInvite: true }); }} className="p-3 rounded-full bg-background border border-border text-muted hover:text-accent"><X size={24} /></button>
                </div>
               <form onSubmit={handleCreateUser} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted px-1">Nombre</label>
                        <input className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none focus:border-accent/40" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted px-1">Apellidos</label>
                        <input className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none focus:border-accent/40" value={formData.surname} onChange={e => setFormData({...formData, surname: e.target.value})} required />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-muted px-1">Email</label>
                     <input type="email" className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none focus:border-accent/40" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-muted px-1">Teléfono</label>
                     <input type="tel" className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none focus:border-accent/40" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+34 ..." />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted px-1">Rol</label>
                        <select className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})}>
                           <option value="client">Cliente</option>
                           <option value="admin">Administrador</option>
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted px-1">Cuenta</label>
                        <select className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}>
                           <option value="">Ninguna</option>
                           {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                     </div>
                  </div>

                  {!editingUser && (
                      <div className="p-6 rounded-[2rem] bg-accent/5 border border-accent/10 flex items-center justify-between group cursor-pointer" onClick={() => setFormData({...formData, sendInvite: !formData.sendInvite})}>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-white">Enviar invitación ahora</p>
                          <p className="text-[9px] text-muted uppercase font-black tracking-widest">El usuario recibirá el email de acceso de inmediato</p>
                        </div>
                        <div className={`w-12 h-6 rounded-full p-1 transition-all ${formData.sendInvite ? 'bg-accent' : 'bg-white/10'}`}>
                           <div className={`w-4 h-4 rounded-full bg-white transition-all ${formData.sendInvite ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                      </div>
                   )}

                   <Button type="submit" className="w-full py-6 rounded-2xl shadow-xl shadow-accent/20" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (editingUser ? 'Guardar Cambios' : formData.sendInvite ? 'Enviar Invitación' : 'Crear en Borrador')}
                   </Button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
