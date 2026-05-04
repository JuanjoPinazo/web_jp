'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { useUser } from '@/hooks/useUser';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Save, Loader2, Mail, Phone, User as UserIcon,
  CheckCircle2, AlertCircle, Camera, LogOut
} from 'lucide-react';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';

const profileSchema = z.object({
  name: z.string().min(2, 'El nombre es obligatorio'),
  surname: z.string().min(2, 'Los apellidos son obligatorios'),
  email: z.string().email('Email no válido'),
  phone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { session, logout } = useAuth();
  const { confirm } = useDialog();
  const { profile, loading, error: hookError, success: hookSuccess, updateProfile } = useUser();
  const [localMessage, setLocalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, trigger, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', surname: '', email: '', phone: '' }
  });

  useEffect(() => {
    if (profile && !loading) {
      reset({
        name: profile.name || '',
        surname: profile.surname || '',
        email: profile.email || '',
        phone: profile.phone || '',
      });
      setAvatarUrl(profile.avatar_url || null);
      trigger();
    }
  }, [profile, loading, reset, trigger]);

  useEffect(() => {
    if (hookSuccess) setLocalMessage({ type: 'success', text: 'Perfil actualizado correctamente.' });
    else if (hookError) setLocalMessage({ type: 'error', text: hookError });
  }, [hookSuccess, hookError]);

  const onSubmit = async (values: ProfileFormValues) => {
    setLocalMessage(null);
    await updateProfile(values);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;

    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${session.user.id}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = data.publicUrl + '?t=' + Date.now();

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', session.user.id);

      if (updateErr) {
        console.error('Error actualizando avatar en DB:', updateErr);
        throw new Error(`Error de base de datos: ${updateErr.message}`);
      }

      setAvatarUrl(url);
      setLocalMessage({ type: 'success', text: 'Foto de perfil actualizada correctamente.' });
    } catch (err: any) {
      console.error('Error en handleAvatarChange:', err);
      setLocalMessage({ type: 'error', text: err.message || 'Error al procesar la imagen.' });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Cerrar sesión',
      message: '¿Deseas cerrar la sesión y volver al menú principal?',
      type: 'warning',
      confirmText: 'Cerrar sesión'
    });
    if (ok) logout();
  };

  const initials = `${profile?.name?.[0] || ''}${profile?.surname?.[0] || ''}`.toUpperCase();

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24 px-4 md:px-0">
      {/* Header */}
      <div className="flex items-start justify-between pt-4">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-5xl font-black font-heading tracking-tight">Tu Perfil.</h1>
          <p className="text-muted text-sm font-medium">Gestiona tu información personal.</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-border text-muted text-[10px] font-black uppercase tracking-widest hover:border-red-500/50 hover:text-red-400 transition-all"
        >
          <LogOut size={14} />
          Cerrar sesión
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card with Avatar */}
        <div className="md:col-span-1 space-y-6">
          <div className="p-8 rounded-[2.5rem] bg-surface border border-border flex flex-col items-center text-center gap-6 shadow-sm">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-accent/20 bg-accent/10 flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black text-accent">{initials || '?'}</span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                {avatarUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            <div className="flex flex-col">
              <h2 className="text-xl font-bold">{profile?.name} {profile?.surname}</h2>
              <span className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">
                {session?.user?.role === 'admin' ? 'Administrador' : 'Usuario Premium'}
              </span>
            </div>

            <div className="w-full pt-6 border-t border-border flex flex-col gap-4 text-left">
              <div className="flex items-center gap-3 text-muted text-xs">
                <Mail size={14} className="shrink-0" />
                <span className="truncate">{profile?.email}</span>
              </div>
              {profile?.phone && (
                <div className="flex items-center gap-3 text-muted text-xs">
                  <Phone size={14} className="shrink-0" />
                  <span>{profile.phone}</span>
                </div>
              )}
            </div>

            {/* Logout en mobile dentro de la card de perfil también */}
            <button
              onClick={handleLogout}
              className="w-full mt-2 flex items-center justify-center gap-2 p-3 rounded-2xl border border-border text-muted text-[10px] font-black uppercase tracking-widest hover:border-red-500/50 hover:text-red-400 transition-all md:hidden"
            >
              <LogOut size={12} />
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Edit Form */}
        <div className="md:col-span-2 space-y-8">
          <form onSubmit={handleSubmit(onSubmit)} className="p-8 md:p-10 rounded-[2.5rem] bg-surface border border-border shadow-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted tracking-widest flex items-center gap-2 px-1">
                  <UserIcon size={12} /> Nombre
                </label>
                <input
                  {...register('name')}
                  className="w-full bg-background/50 border border-border rounded-xl p-4 text-xs focus:border-accent/40 outline-none transition-all"
                />
                {errors.name && <p className="text-[10px] text-red-500 font-bold">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Apellidos</label>
                <input
                  {...register('surname')}
                  className="w-full bg-background/50 border border-border rounded-xl p-4 text-xs focus:border-accent/40 outline-none transition-all"
                />
                {errors.surname && <p className="text-[10px] text-red-500 font-bold">{errors.surname.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Email</label>
                <input
                  {...register('email')}
                  className="w-full bg-background/50 border border-border rounded-xl p-4 text-xs focus:border-accent/40 outline-none transition-all"
                />
                {errors.email && <p className="text-[10px] text-red-500 font-bold">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Teléfono</label>
                <input
                  {...register('phone')}
                  className="w-full bg-background/50 border border-border rounded-xl p-4 text-xs focus:border-accent/40 outline-none transition-all"
                />
                {errors.phone && <p className="text-[10px] text-red-500 font-bold">{errors.phone.message}</p>}
              </div>
            </div>

            {localMessage && (
              <div className={`p-4 rounded-xl border flex items-center gap-3 ${localMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                {localMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span className="text-xs font-bold">{localMessage.text}</span>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full gap-2 rounded-2xl py-6">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Guardar Cambios
            </Button>
          </form>

          <div className="p-8 rounded-[2rem] bg-accent/5 border border-accent/10 flex flex-col gap-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-accent">
              <AlertCircle size={14} />
              Nota de Seguridad
            </h4>
            <p className="text-[10px] text-muted leading-relaxed font-medium">
              Tu información está protegida mediante encriptación SSL y almacenada en la infraestructura oficial de Supabase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
