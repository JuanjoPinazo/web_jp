'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UserCircle, Save, Loader2, Mail, Phone, User as UserIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/Button';

const profileSchema = z.object({
  name: z.string().min(2, 'El nombre es obligatorio'),
  surname: z.string().min(2, 'Los apellidos son obligatorios'),
  email: z.string().email('Email no válido'),
  phone: z.string().min(9, 'Teléfono no válido'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { profile, loading, error: hookError, success: hookSuccess, updateProfile } = useUser();
  const [localMessage, setLocalMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const { register, handleSubmit, reset, setValue, trigger, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      surname: '',
      email: '',
      phone: ''
    }
  });

  // Reset form when profile data is loaded
  useEffect(() => {
    if (profile && !loading) {
      reset({
        name: profile.name || '',
        surname: profile.surname || '',
        email: profile.email || '',
        phone: profile.phone || '',
      });
      // Force validation re-run to clear any "required" errors now that data is present
      trigger();
    }
  }, [profile, loading, reset, trigger]);

  // Sync hook messages to local UI state
  useEffect(() => {
    if (hookSuccess) {
      setLocalMessage({ type: 'success', text: 'Perfil actualizado correctamente en Supabase.' });
    } else if (hookError) {
      setLocalMessage({ type: 'error', text: hookError });
    }
  }, [hookSuccess, hookError]);

  const onSubmit = async (values: ProfileFormValues) => {
    setLocalMessage(null);
    await updateProfile(values);
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-5xl font-black font-heading tracking-tight">Tu Perfil.</h1>
        <p className="text-muted text-sm font-medium">Gestiona tu información personal y de contacto en tiempo real con Supabase.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Profile Card */}
        <div className="md:col-span-1 space-y-6">
           <div className="p-8 rounded-[2.5rem] bg-surface border border-border flex flex-col items-center text-center gap-6 shadow-sm">
              <div className="w-24 h-24 rounded-full bg-accent/20 border border-accent/20 flex items-center justify-center text-accent">
                 <UserCircle size={48} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col">
                 <h2 className="text-xl font-bold">{profile?.name} {profile?.surname}</h2>
                 <span className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">Usuario Premium</span>
              </div>
              
              <div className="w-full pt-6 border-t border-border flex flex-col gap-4 text-left">
                 <div className="flex items-center gap-3 text-muted text-xs">
                    <Mail size={14} />
                    <span className="truncate">{profile?.email}</span>
                 </div>
                 <div className="flex items-center gap-3 text-muted text-xs">
                    <Phone size={14} />
                    <span>{profile?.phone}</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Edit Form */}
        <div className="md:col-span-2 space-y-8">
           <form onSubmit={handleSubmit(onSubmit)} className="p-8 md:p-10 rounded-[2.5rem] bg-surface border border-border shadow-sm space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Name */}
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest flex items-center gap-2 px-1">
                       <UserIcon size={12} />
                       Nombre
                    </label>
                    <input 
                       {...register('name')}
                       className="w-full bg-background/50 border border-border rounded-xl p-4 text-xs focus:border-accent/40 outline-none transition-all"
                    />
                    {errors.name && <p className="text-[10px] text-red-500 font-bold">{errors.name.message}</p>}
                 </div>

                 {/* Surname */}
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Apellidos</label>
                    <input 
                       {...register('surname')}
                       className="w-full bg-background/50 border border-border rounded-xl p-4 text-xs focus:border-accent/40 outline-none transition-all"
                    />
                    {errors.surname && <p className="text-[10px] text-red-500 font-bold">{errors.surname.message}</p>}
                 </div>

                 {/* Email */}
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Email</label>
                    <input 
                       {...register('email')}
                       className="w-full bg-background/50 border border-border rounded-xl p-4 text-xs focus:border-accent/40 outline-none transition-all"
                    />
                    {errors.email && <p className="text-[10px] text-red-500 font-bold">{errors.email.message}</p>}
                 </div>

                 {/* Phone */}
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
              <p className="text-[10px] text-muted leading-relaxed font-medium capitalize">
                 Tu información está protegida mediante encriptación SSL y almacenada en la infraestructura oficial de Supabase. Cualquier cambio se verá reflejado en tus casos activos y dossieres de inmediato.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
