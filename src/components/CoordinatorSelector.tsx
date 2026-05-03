'use client';

import React, { useState, useEffect } from 'react';
import { User, Shield, Phone, Mail, Plus, Edit2, Check, X, Loader2, Upload, Trash2, MessageSquare } from 'lucide-react';
import { Button } from './Button';
import { supabase } from '@/lib/supabase';
import { LogisticContact, useTravelPlans } from '@/hooks/useTravelPlans';
import { useDialog } from '@/context/DialogContext';

interface CoordinatorSelectorProps {
  planId: string;
  currentContactId?: string;
  onAssigned: (contactId: string) => void;
}

export function CoordinatorSelector({ planId, currentContactId, onAssigned }: CoordinatorSelectorProps) {
  const { getLogisticContacts, saveLogisticContact } = useTravelPlans();
  const { alert, confirm } = useDialog();
  const [contacts, setContacts] = useState<LogisticContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingContact, setEditingContact] = useState<Partial<LogisticContact> | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const data = await getLogisticContacts();
      setContacts(data || []);
    } catch (err: any) {
      console.error('Error loading logistic contacts:', err);
      // Fallback to empty array to avoid crashes
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact?.name) return;

    try {
      setLoading(true);
      const res = await saveLogisticContact(editingContact);
      await loadContacts();
      setIsEditing(false);
      setEditingContact(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `contacts/${fileName}`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setEditingContact(prev => ({ ...prev, avatar_url: publicUrl }));
    } catch (err: any) {
      alert({ title: 'Error de subida', message: err.message, type: 'danger' });
    } finally {
      setUploading(false);
    }
  };

  const currentContact = contacts.find(c => c.id === currentContactId) || contacts.find(c => c.is_default);

  return (
    <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-border bg-surface-subtle/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <Shield size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Coordinador del Plan</h3>
            <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Responsable Logístico</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs font-bold gap-2"
          onClick={() => {
            setEditingContact({ is_default: false });
            setIsEditing(true);
          }}
        >
          <Plus size={14} /> Nuevo Contacto
        </Button>
      </div>

      <div className="p-6">
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center gap-6 mb-6">
              <div className="relative group">
                <div className="w-20 h-20 rounded-2xl bg-surface-subtle border border-border overflow-hidden flex items-center justify-center text-muted">
                  {editingContact?.avatar_url ? (
                    <img src={editingContact.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                  ) : (
                    <User size={32} />
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                      <Loader2 size={20} className="animate-spin" />
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-accent text-white shadow-lg cursor-pointer hover:scale-110 transition-transform">
                  <Upload size={14} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleUploadAvatar} disabled={uploading} />
                </label>
              </div>
              <div className="flex-1 space-y-4">
                <input 
                  type="text" 
                  placeholder="Nombre completo" 
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm outline-none focus:border-accent"
                  value={editingContact?.name || ''}
                  onChange={e => setEditingContact(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="text" 
                    placeholder="Rol (Ej: Coordinador)" 
                    className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent"
                    value={editingContact?.role || ''}
                    onChange={e => setEditingContact(prev => ({ ...prev, role: e.target.value }))}
                  />
                  <input 
                    type="text" 
                    placeholder="Empresa" 
                    className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent"
                    value={editingContact?.company || ''}
                    onChange={e => setEditingContact(prev => ({ ...prev, company: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-3.5 text-muted" />
                <input 
                  type="text" 
                  placeholder="Teléfono" 
                  className="w-full bg-background border border-border rounded-xl p-3 pl-10 text-xs outline-none focus:border-accent"
                  value={editingContact?.phone || ''}
                  onChange={e => setEditingContact(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="relative">
                <MessageSquare size={14} className="absolute left-3 top-3.5 text-muted" />
                <input 
                  type="text" 
                  placeholder="WhatsApp" 
                  className="w-full bg-background border border-border rounded-xl p-3 pl-10 text-xs outline-none focus:border-accent"
                  value={editingContact?.whatsapp || ''}
                  onChange={e => setEditingContact(prev => ({ ...prev, whatsapp: e.target.value }))}
                />
              </div>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-3.5 text-muted" />
                <input 
                  type="email" 
                  placeholder="Email" 
                  className="w-full bg-background border border-border rounded-xl p-3 pl-10 text-xs outline-none focus:border-accent"
                  value={editingContact?.email || ''}
                  onChange={e => setEditingContact(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={editingContact?.is_default || false} 
                  onChange={e => setEditingContact(prev => ({ ...prev, is_default: e.target.checked }))}
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted">Coordinador por Defecto</span>
              </label>
              <div className="flex-1" />
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancelar</Button>
              <Button size="sm" type="submit" disabled={loading} className="gap-2">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Guardar Contacto
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-16 h-16 rounded-[1.5rem] bg-surface-subtle border border-border overflow-hidden p-0.5">
                {currentContact?.avatar_url ? (
                  <img src={currentContact.avatar_url} className="w-full h-full object-cover rounded-[1.3rem]" alt="Avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted">
                    <User size={24} />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-black text-foreground tracking-tight">{currentContact?.name || 'Sin asignar'}</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-accent">
                  {currentContact?.role} {currentContact?.company && `· ${currentContact?.company}`}
                </p>
                <div className="flex gap-4 pt-1">
                  {currentContact?.phone && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted">
                      <Phone size={10} /> {currentContact.phone}
                    </div>
                  )}
                  {currentContact?.email && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted">
                      <Mail size={10} /> {currentContact.email}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full md:w-auto">
              <select 
                className="w-full md:w-48 bg-background border border-border rounded-xl p-2.5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-accent appearance-none"
                value={currentContactId || ''}
                onChange={e => onAssigned(e.target.value)}
              >
                <option value="">(Usar predeterminado)</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.is_default ? '⭐' : ''}</option>
                ))}
              </select>
              {currentContact && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-[10px] font-black uppercase tracking-widest h-10 gap-2"
                  onClick={() => {
                    setEditingContact(currentContact);
                    setIsEditing(true);
                  }}
                >
                  <Edit2 size={12} /> Editar Datos
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
