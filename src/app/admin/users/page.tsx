'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/hooks/useAdmin';
import { User } from '@/types/platform';
import { Loader2, UserCircle, Shield, User as UserIcon, Mail, Phone, Calendar, Plus, X, Trash2, Edit2, Search, LayoutGrid, List, Filter, Building2, MoreHorizontal, Send, Camera, Briefcase, CheckCircle2, Key, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useDialog } from '@/context/DialogContext';
import { Button } from '@/components/Button';
import { motion, AnimatePresence } from 'framer-motion';

type ViewMode = 'grid' | 'compact';

export default function AdminUsersPage() {
  const { getUsers, updateUserRole, getClients } = useAdmin();
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<any[]>([]); // These are actually Hospitals
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'client'>('all');
  const { confirm, alert } = useDialog();

  // Activate with temp password state
  const [activatingUser, setActivatingUser] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activationDone, setActivationDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    surname: '',
    role: 'client',
    client_id: '', // hospital_id
    company_id: '',
    user_type: 'hospital',
    phone: '',
    sendInvite: true
  });
  const [avatarUploadUserId, setAvatarUploadUserId] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

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
        client_id: (editingUser as any).client_id || '',
        company_id: (editingUser as any).company_id || '',
        user_type: (editingUser as any).user_type || 'hospital',
        phone: editingUser.phone || '',
        sendInvite: false
      });
      setAvatarUploadUserId(editingUser.id);
      setIsModalOpen(true);
    }
  }, [editingUser]);

  const handleAvatarUploadForUser = async (e: React.ChangeEvent<HTMLInputElement>, userId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = data.publicUrl + '?t=' + Date.now();
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, avatar_url: url } : u));
      if (editingUser?.id === userId) setEditingUser({ ...editingUser, avatar_url: url });
    } catch (err: any) {
      await alert({ title: 'Error', message: err.message, type: 'danger' });
    } finally {
      setAvatarUploading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, clientsData, { data: companiesData }] = await Promise.all([
        getUsers(), 
        getClients(),
        supabase.from('companies').select('*').order('name')
      ]);
      setUsers(usersData);
      setClients(clientsData);
      setCompanies(companiesData || []);
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
      setFormData({ 
        email: '', 
        name: '', 
        surname: '', 
        role: 'client', 
        client_id: '', 
        company_id: '',
        user_type: 'hospital',
        phone: '', 
        sendInvite: true 
      });
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

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  const openActivateModal = (user: User) => {
    setActivatingUser(user);
    setTempPassword(generatePassword());
    setShowTempPassword(true);
    setActivationDone(false);
    setCopied(false);
  };

  const handleActivateUser = async () => {
    if (!activatingUser || !tempPassword) return;
    setIsActivating(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;

      const response = await fetch('/api/admin/activate-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: activatingUser.id, temporaryPassword: tempPassword })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error al activar usuario');

      setActivationDone(true);
      loadData();
    } catch (err: any) {
      console.error(err);
      await alert({ title: 'Error de Activación', message: err.message, type: 'danger' });
    } finally {
      setIsActivating(false);
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const filteredUsers = users
    .filter(user => {
      const matchesSearch =
        (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.surname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.clients?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.companies?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      const nameA = `${a.name || ''} ${a.surname || ''}`.trim().toLowerCase();
      const nameB = `${b.name || ''} ${b.surname || ''}`.trim().toLowerCase();
      return nameA.localeCompare(nameB, 'es');
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
                   <div className="w-14 h-14 rounded-2xl bg-muted/10 border border-border flex items-center justify-center text-muted group-hover:scale-110 transition-transform overflow-hidden">
                     {(user as any).avatar_url ? (
                       <img src={(user as any).avatar_url} alt={user.name} className="w-full h-full object-cover" />
                     ) : (
                       <UserCircle size={32} />
                     )}
                   </div>
                    <div className="flex gap-2">
                      {user.onboarding_status !== 'active' && (
                        <button onClick={() => openActivateModal(user)} title="Activar con Contraseña Temporal" className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"><Key size={16} /></button>
                      )}
                      <button onClick={() => handleResendInvite(user)} title="Reenviar Invitación" className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent hover:bg-accent hover:text-white transition-all"><Send size={16} /></button>
                      <button onClick={() => setEditingUser(user)} className="p-2.5 rounded-xl bg-background border border-border text-muted hover:text-accent transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteUser(user.id)} className="p-2.5 rounded-xl bg-background border border-border text-muted hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                    </div>
                </div>

                <div className="space-y-1 relative z-10">
                  {/* Full name */}
                  <h3 className="text-base font-black text-foreground leading-tight">
                    {user.name} {user.surname}
                  </h3>
                  {/* Affiliation (Hospital or Company) */}
                  {(user.clients?.name || user.companies?.name) && (
                    <p className="text-[10px] font-bold text-accent uppercase tracking-widest flex items-center gap-1">
                      {user.clients?.name ? <Building2 size={10} /> : <Briefcase size={10} />}
                      {user.clients?.name || user.companies?.name}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${user.role === 'admin' ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-muted/10 border-border text-muted'}`}>
                      {user.role === 'admin' ? <Shield size={10} /> : <UserIcon size={10} />}
                      {user.role}
                    </div>
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
                    <Mail size={14} className="text-accent shrink-0" />
                    <span className="text-[10px] font-bold truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted">
                    <Phone size={14} className="text-accent shrink-0" />
                    <span className="text-[10px] font-bold">{user.phone || '—'}</span>
                  </div>
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
                className="p-4 rounded-2xl bg-surface border border-border hover:border-accent/30 transition-all flex items-center gap-4 group"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-muted/10 border border-border flex items-center justify-center text-muted shrink-0 overflow-hidden">
                  {(user as any).avatar_url ? (
                    <img src={(user as any).avatar_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle size={20} />
                  )}
                </div>

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold truncate">{user.name} {user.surname}</h3>
                  <p className="text-[10px] text-muted truncate">{user.email}</p>
                </div>

                {/* Phone */}
                <div className="hidden md:flex items-center gap-1.5 text-muted/70 w-32 shrink-0">
                  <Phone size={11} className="shrink-0" />
                  <span className="text-[10px] font-medium truncate">{user.phone || '—'}</span>
                </div>

                {/* Affiliation */}
                <div className="hidden lg:flex items-center gap-1.5 text-muted/70 w-36 shrink-0">
                  {user.clients?.name ? <Building2 size={11} className="shrink-0" /> : <Briefcase size={11} className="shrink-0" />}
                  <span className="text-[10px] font-medium truncate">{user.clients?.name || user.companies?.name || '—'}</span>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border ${
                    user.onboarding_status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                    user.onboarding_status === 'invited' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                    'bg-slate-500/10 border-slate-500/20 text-slate-400'
                  }`}>
                    {user.onboarding_status || 'draft'}
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border ${user.role === 'admin' ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-muted/10 border-border text-muted'}`}>
                    {user.role}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {user.onboarding_status !== 'active' && (
                    <button onClick={() => openActivateModal(user)} title="Activar con Contraseña Temporal" className="p-2 rounded-lg bg-background border border-border text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"><Key size={14} /></button>
                  )}
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
                   <button onClick={() => { setIsModalOpen(false); setEditingUser(null); setFormData({ email: '', name: '', surname: '', role: 'client', client_id: '', company_id: '', user_type: 'hospital', phone: '', sendInvite: true }); }} className="p-3 rounded-full bg-background border border-border text-muted hover:text-accent"><X size={24} /></button>
                </div>
               <form onSubmit={handleCreateUser} className="space-y-6">
                  {editingUser && (
                    <div className="flex items-center gap-5 pb-6 border-b border-border">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl bg-muted/10 border border-border overflow-hidden flex items-center justify-center">
                          {(editingUser as any).avatar_url ? (
                            <img src={(editingUser as any).avatar_url} alt={editingUser.name} className="w-full h-full object-cover" />
                          ) : (
                            <UserCircle size={36} className="text-muted" />
                          )}
                        </div>
                        <label className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-lg">
                          {avatarUploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleAvatarUploadForUser(e, editingUser.id)} />
                        </label>
                      </div>
                      <div>
                        <p className="text-sm font-black">{editingUser.name} {editingUser.surname}</p>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Cambiar foto de perfil</p>
                      </div>
                    </div>
                  )}
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
                  <div className="space-y-4 p-6 rounded-[2rem] bg-background border border-border">
                     <label className="text-[10px] font-black uppercase tracking-widest text-muted px-1">Ámbito de Trabajo</label>
                     <div className="grid grid-cols-2 gap-3">
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, user_type: 'hospital'})}
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${formData.user_type === 'hospital' ? 'bg-accent/10 border-accent text-accent shadow-sm' : 'bg-background border-border text-muted opacity-50'}`}
                        >
                          <Building2 size={14} /> Hospital
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, user_type: 'company'})}
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${formData.user_type === 'company' ? 'bg-accent/10 border-accent text-accent shadow-sm' : 'bg-background border-border text-muted opacity-50'}`}
                        >
                          <Briefcase size={14} /> Empresa
                        </button>
                     </div>
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
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted px-1">
                          {formData.user_type === 'hospital' ? 'Hospital Asignado' : 'Empresa Asignada'}
                        </label>
                        <select 
                          className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none" 
                          value={formData.user_type === 'hospital' ? formData.client_id : formData.company_id} 
                          onChange={e => setFormData({
                            ...formData, 
                            [formData.user_type === 'hospital' ? 'client_id' : 'company_id']: e.target.value
                          })}
                        >
                           <option value="">Ninguna</option>
                           {formData.user_type === 'hospital' 
                             ? clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                             : companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                           }
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

      {/* MODAL: ACTIVATE WITH TEMPORARY PASSWORD */}
      <AnimatePresence>
        {activatingUser && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!isActivating) { setActivatingUser(null); } }}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-surface border border-border rounded-[2.5rem] p-10 shadow-2xl"
            >
              <button
                onClick={() => setActivatingUser(null)}
                className="absolute top-6 right-6 p-2.5 rounded-full bg-background border border-border text-muted hover:text-accent transition-all"
              >
                <X size={18} />
              </button>

              {!activationDone ? (
                <div className="space-y-8">
                  {/* Header */}
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-4">
                      <Key size={22} />
                    </div>
                    <h3 className="text-2xl font-black tracking-tighter">Activar Cuenta</h3>
                    <p className="text-xs text-muted font-medium">
                      Establece una contraseña temporal para{' '}
                      <span className="font-bold text-foreground">{activatingUser.name} {activatingUser.surname}</span>.
                      El usuario deberá cambiarla al iniciar sesión.
                    </p>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted px-1">
                      Contraseña Temporal
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showTempPassword ? 'text' : 'password'}
                          value={tempPassword}
                          onChange={e => setTempPassword(e.target.value)}
                          className="w-full bg-background border border-border rounded-2xl px-4 py-4 text-sm font-mono outline-none focus:border-accent/40 pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTempPassword(!showTempPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-colors"
                        >
                          {showTempPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTempPassword(generatePassword())}
                        title="Generar nueva contraseña"
                        className="p-4 rounded-2xl bg-background border border-border text-muted hover:text-accent hover:border-accent/40 transition-all"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>
                    <p className="text-[9px] text-muted font-medium px-1">
                      Mín. 8 caracteres. Comparte esta contraseña con el usuario de forma segura.
                    </p>
                  </div>

                  {/* Info box */}
                  <div className="p-5 rounded-2xl bg-accent/5 border border-accent/10 space-y-1">
                    <p className="text-[10px] font-black text-accent uppercase tracking-widest">¿Qué ocurrirá?</p>
                    <ul className="text-[10px] text-muted space-y-1 font-medium">
                      <li>· El email del usuario se confirmará automáticamente</li>
                      <li>· La cuenta pasará a estado <span className="text-emerald-500 font-bold">Activo</span></li>
                      <li>· Al entrar, verá la misma vista que el cliente final</li>
                      <li>· Puede cambiar la contraseña desde su perfil</li>
                    </ul>
                  </div>

                  <Button
                    onClick={handleActivateUser}
                    disabled={isActivating || tempPassword.length < 8}
                    className="w-full py-5 rounded-2xl shadow-xl shadow-emerald-500/10 bg-emerald-500 hover:bg-emerald-600"
                  >
                    {isActivating ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <><Key size={16} /> Activar y Establecer Contraseña</>
                    )}
                  </Button>
                </div>
              ) : (
                /* SUCCESS STATE */
                <div className="space-y-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tighter">¡Cuenta Activada!</h3>
                    <p className="text-xs text-muted">
                      <span className="font-bold text-foreground">{activatingUser.name}</span> ya puede iniciar sesión con estas credenciales:
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-background border border-border space-y-4 text-left">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-muted uppercase tracking-widest">Email</p>
                      <p className="text-sm font-mono font-bold text-foreground">{activatingUser.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-muted uppercase tracking-widest">Contraseña Temporal</p>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-mono font-bold text-accent flex-1">{tempPassword}</p>
                        <button
                          onClick={handleCopyPassword}
                          className={`p-2 rounded-xl border transition-all ${
                            copied
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                              : 'bg-background border-border text-muted hover:text-accent'
                          }`}
                        >
                          {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-[9px] text-muted font-medium">
                    Comparte estas credenciales de forma segura. El usuario podrá cambiar la contraseña desde su perfil.
                  </p>

                  <Button
                    onClick={() => setActivatingUser(null)}
                    className="w-full py-5 rounded-2xl"
                  >
                    Cerrar
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
