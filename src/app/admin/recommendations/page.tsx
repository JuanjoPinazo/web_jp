'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/hooks/useAdmin';
import { Recommendation, User } from '@/types/platform';
import { 
  Plus, Search, Filter, MoreVertical, Edit2, Trash2, 
  CheckCircle, XCircle, Loader2, Sparkles, Building, 
  Calendar, User as UserIcon, Globe, X, Save
} from 'lucide-react';
import { Button } from '@/components/Button';

export default function AdminRecommendationsPage() {
  const { getClients, getContexts, getUsers } = useAdmin();
  const [recos, setRecos] = useState<Recommendation[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [contexts, setContexts] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReco, setEditingReco] = useState<Partial<Recommendation> | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [
        { data: recoData },
        clientsData,
        contextsData,
        usersData
      ] = await Promise.all([
        supabase.from('recommendations').select('*').order('created_at', { ascending: false }),
        getClients(),
        getContexts(),
        getUsers()
      ]);
      
      setRecos(recoData || []);
      setClients(clientsData || []);
      setContexts(contextsData || []);
      setAllUsers(usersData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingReco?.title) return;
    
    try {
      if (editingReco.id) {
        const { error } = await supabase
          .from('recommendations')
          .update(editingReco)
          .eq('id', editingReco.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('recommendations')
          .insert([editingReco]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await supabase.from('recommendations').update({ activo: !currentStatus }).eq('id', id);
      setRecos(recos.map(r => r.id === id ? { ...r, activo: !currentStatus } : r));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
     return (
       <div className="flex items-center justify-center p-20 text-accent">
         <Loader2 className="animate-spin" size={40} />
       </div>
     );
  }

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-5xl font-black font-heading tracking-tight">Motor de Recomendaciones.</h1>
          <p className="text-muted text-sm font-medium uppercase tracking-widest">Contenido dinámico segmentado por usuario, evento o cliente.</p>
        </div>
        <Button className="gap-2 rounded-2xl px-6 py-6" onClick={() => {
           setEditingReco({ activo: true, categoria: 'restaurant', tags: [] });
           setIsModalOpen(true);
        }}>
          <Plus size={20} />
          Nueva Recomendación
        </Button>
      </header>

      {/* Stats / Quick Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
         {[
           { label: 'Totales', val: recos.length, icon: Sparkles, color: 'text-accent' },
           { label: 'Globales', val: recos.filter(r => !r.client_id && !r.context_id && !r.user_id).length, icon: Globe, color: 'text-blue-500' },
           { label: 'Clientes', val: recos.filter(r => r.client_id).length, icon: Building, color: 'text-emerald-500' },
           { label: 'Específicas', val: recos.filter(r => r.user_id || r.context_id).length, icon: UserIcon, color: 'text-purple-500' },
         ].map((stat, i) => (
           <div key={i} className="p-6 rounded-3xl bg-surface border border-border flex flex-col gap-1">
              <stat.icon className={`${stat.color} mb-2`} size={18} />
              <span className="text-2xl font-black">{stat.val}</span>
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{stat.label}</span>
           </div>
         ))}
      </div>

      {/* Recos Table */}
      <div className="bg-surface border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
         <table className="w-full text-left border-collapse">
            <thead>
               <tr className="border-b border-border bg-background/30">
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-muted tracking-widest">Contenido</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-muted tracking-widest">Nivel de Targeting</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-muted tracking-widest text-center">Estado</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-muted tracking-widest text-right">Acciones</th>
               </tr>
            </thead>
            <tbody>
               {recos.map((reco) => (
                  <tr key={reco.id} className="border-b border-border/50 hover:bg-white/5 transition-colors group">
                     <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-xl bg-background border border-border overflow-hidden">
                              {reco.imagen_url && <img src={reco.imagen_url} alt="" className="w-full h-full object-cover" />}
                           </div>
                           <div className="flex flex-col">
                              <span className="text-sm font-bold">{reco.title}</span>
                              <span className="text-[10px] font-medium text-muted uppercase tracking-widest">{reco.categoria}</span>
                           </div>
                        </div>
                     </td>
                     <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                           {reco.user_id ? (
                             <div className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[9px] font-black text-purple-500 flex items-center gap-1.5 uppercase tracking-widest">
                               <UserIcon size={10} /> Usuario
                             </div>
                           ) : reco.context_id ? (
                             <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-500 flex items-center gap-1.5 uppercase tracking-widest">
                               <Calendar size={10} /> Evento
                             </div>
                           ) : reco.client_id ? (
                             <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] font-black text-blue-500 flex items-center gap-1.5 uppercase tracking-widest">
                               <Building size={10} /> Cliente
                             </div>
                           ) : (
                             <div className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[9px] font-black text-accent flex items-center gap-1.5 uppercase tracking-widest">
                               <Globe size={10} /> Global
                             </div>
                           )}
                           {reco.client_id && <span className="text-[10px] font-bold text-muted truncate max-w-[100px]">{clients.find(c => c.id === reco.client_id)?.name}</span>}
                        </div>
                     </td>
                     <td className="px-8 py-6 text-center">
                        <button onClick={() => toggleStatus(reco.id, !!reco.activo)} className={`p-2 rounded-xl transition-all ${reco.activo ? 'text-emerald-500 bg-emerald-500/10' : 'text-muted bg-background border border-border'}`}>
                           {reco.activo ? <CheckCircle size={18} /> : <XCircle size={18} />}
                        </button>
                     </td>
                     <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={() => { setEditingReco(reco); setIsModalOpen(true); }}
                             className="p-2.5 rounded-xl bg-background border border-border text-muted hover:text-accent hover:border-accent/40 transition-all"
                           >
                              <Edit2 size={16} />
                           </button>
                        </div>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>

      {/* Full Layered Recommendation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 text-foreground overflow-y-auto">
           <div className="bg-surface border border-border w-full max-w-4xl rounded-[3rem] shadow-2xl p-12 relative animate-in slide-in-from-bottom-5 duration-300 my-auto">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 text-muted hover:text-accent"><X size={28} /></button>
              
              <div className="flex items-center gap-4 mb-10">
                 <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-background">
                    <Sparkles size={24} />
                 </div>
                 <div>
                    <h2 className="text-3xl font-black font-heading tracking-tight">{editingReco?.id ? 'Editar' : 'Nueva'} Recomendación</h2>
                    <p className="text-xs font-bold text-muted uppercase tracking-widest">Configuración inteligente de contenido</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                 {/* Left Column: Basic Info */}
                 <div className="lg:col-span-7 space-y-8">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Título de la Recomendación</label>
                       <input 
                         className="w-full bg-background border border-border rounded-[1.5rem] p-5 text-sm font-bold outline-none focus:border-accent" 
                         placeholder="Ej: Nobu Marbella"
                         value={editingReco?.title || ''}
                         onChange={e => setEditingReco({...editingReco!, title: e.target.value})}
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Categoría</label>
                          <select 
                            className="w-full bg-background border border-border rounded-xl p-4 text-xs font-bold outline-none appearance-none"
                            value={editingReco?.categoria}
                            onChange={e => setEditingReco({...editingReco!, categoria: e.target.value})}
                          >
                            <option value="restaurant">Restaurante</option>
                            <option value="hotel">Hotel / Alojamiento</option>
                            <option value="transfer">Traslado / VIP</option>
                            <option value="experience">Experiencia / Ocio</option>
                          </select>
                       </div>
                       <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Rating (0-10)</label>
                          <input 
                            type="number" step="0.1" max="10"
                            className="w-full bg-background border border-border rounded-xl p-4 text-xs font-bold outline-none" 
                            placeholder="9.5"
                            value={editingReco?.rating || ''}
                            onChange={e => setEditingReco({...editingReco!, rating: parseFloat(e.target.value)})}
                          />
                       </div>
                    </div>

                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Descripción / Notas</label>
                       <textarea 
                          rows={4}
                          className="w-full bg-background border border-border rounded-[1.5rem] p-5 text-sm font-medium outline-none focus:border-accent resize-none" 
                          placeholder="Describe por qué esta opción es ideal..."
                          value={editingReco?.descripcion || ''}
                          onChange={e => setEditingReco({...editingReco!, descripcion: e.target.value})}
                       />
                    </div>

                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">URL de Imagen</label>
                       <input 
                         className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none" 
                         placeholder="https://images.unsplash..."
                         value={editingReco?.imagen_url || ''}
                         onChange={e => setEditingReco({...editingReco!, imagen_url: e.target.value})}
                       />
                    </div>
                 </div>

                 {/* Right Column: Targeting */}
                 <div className="lg:col-span-5 space-y-8 p-10 bg-background/50 border border-border rounded-[2.5rem]">
                    <div className="flex items-center gap-3 mb-4">
                       <Filter className="text-accent" size={18} />
                       <h3 className="text-lg font-black font-heading">Targeting Inteligente</h3>
                    </div>

                    <div className="space-y-6">
                       {/* Level Select */}
                       <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-muted tracking-widest">Nivel de Segmentación</label>
                          <div className="grid grid-cols-2 gap-3">
                             {[
                               { id: 'global', label: 'Global', icon: Globe },
                               { id: 'client', label: 'Cliente', icon: Building },
                               { id: 'context', label: 'Evento', icon: Calendar },
                               { id: 'user', label: 'Usuario', icon: UserIcon },
                             ].map((level) => {
                                let isSelected = false;
                                if (level.id === 'global' && !editingReco?.client_id && !editingReco?.context_id && !editingReco?.user_id) isSelected = true;
                                if (level.id === 'client' && editingReco?.client_id && !editingReco?.context_id && !editingReco?.user_id) isSelected = true;
                                if (level.id === 'context' && editingReco?.context_id) isSelected = true;
                                if (level.id === 'user' && editingReco?.user_id) isSelected = true;

                                return (
                                  <button 
                                    key={level.id}
                                    onClick={() => {
                                       setEditingReco({
                                          ...editingReco!,
                                          client_id: level.id === 'client' ? clients[0]?.id : null,
                                          context_id: level.id === 'context' ? contexts[0]?.id : null,
                                          user_id: level.id === 'user' ? allUsers[0]?.id : null
                                       });
                                    }}
                                    className={cn(
                                       "flex items-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all border",
                                       isSelected ? "bg-accent border-accent text-background" : "bg-background border-border text-muted hover:border-accent/40"
                                    )}
                                  >
                                    <level.icon size={12} /> {level.label}
                                  </button>
                                );
                             })}
                          </div>
                       </div>

                       {/* Client Select */}
                       {(editingReco?.client_id || editingReco?.context_id) && (
                         <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                           <label className="text-[10px] font-black uppercase text-muted tracking-widest">Seleccionar Cliente</label>
                           <select 
                             className="w-full bg-background border border-border rounded-xl p-4 text-xs"
                             value={editingReco?.client_id || ''}
                             onChange={e => setEditingReco({...editingReco!, client_id: e.target.value})}
                           >
                             <option value="">Cualquier Cliente...</option>
                             {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                           </select>
                         </div>
                       )}

                       {/* Context Select */}
                       {editingReco?.context_id !== undefined && editingReco.context_id !== null && (
                         <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                           <label className="text-[10px] font-black uppercase text-muted tracking-widest">Seleccionar Evento / Contexto</label>
                           <select 
                             className="w-full bg-background border border-border rounded-xl p-4 text-xs"
                             value={editingReco?.context_id || ''}
                             onChange={e => setEditingReco({...editingReco!, context_id: e.target.value})}
                           >
                             <option value="">Ninguno...</option>
                             {contexts.filter(ctx => !editingReco.client_id || ctx.client_id === editingReco.client_id).map(ctx => (
                               <option key={ctx.id} value={ctx.id}>{ctx.name}</option>
                             ))}
                           </select>
                         </div>
                       )}

                       {/* User Select */}
                       {editingReco?.user_id !== undefined && editingReco.user_id !== null && (
                         <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                           <label className="text-[10px] font-black uppercase text-muted tracking-widest">Seleccionar Usuario Final</label>
                           <select 
                             className="w-full bg-background border border-border rounded-xl p-4 text-xs"
                             value={editingReco?.user_id || ''}
                             onChange={e => setEditingReco({...editingReco!, user_id: e.target.value})}
                           >
                             {allUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                           </select>
                         </div>
                       )}
                    </div>

                    <div className="pt-10 flex flex-col gap-4">
                       <Button className="w-full rounded-2xl py-6 gap-2" onClick={handleSave}>
                          <Save size={20} />
                          Guardar Recomendación
                       </Button>
                       <p className="text-[10px] text-center text-muted font-bold italic uppercase tracking-widest">
                         Esta recomendación seguirá la regla: <br/> Usuario {'>'} Contexto {'>'} Cliente
                       </p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
