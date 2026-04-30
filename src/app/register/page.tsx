'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, User, Building2, ArrowRight, Loader2, ShieldCheck, ArrowLeft, CheckCircle2, Phone, Briefcase, Stethoscope, HelpCircle } from 'lucide-react';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { HospitalSelect } from '@/components/HospitalSelect';
import { DepartmentSelect } from '@/components/DepartmentSelect';
import { RoleSelect } from '@/components/RoleSelect';

export default function RequestAccessPage() {
  const [formData, setFormData] = useState({
    email: '',
    nombre: '',
    phone: '',
    roleId: '',
    roleName: '',
    role_manual: '',
    reason: '',
    hospital: '',
    hospitalId: '',
    hospital_manual: '',
    department: '',
    departmentId: '',
    department_manual: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.roleId) {
      setError('Por favor, seleccione su cargo profesional de la lista o introduzca uno manual.');
      setLoading(false);
      return;
    }

    if (formData.roleId === 'manual' && !formData.role_manual.trim()) {
      setError('Por favor, escriba el nombre de su cargo.');
      setLoading(false);
      return;
    }

    if (!formData.hospitalId) {
      setError('Por favor, seleccione su hospital de la lista o introduzca uno manual.');
      setLoading(false);
      return;
    }

    if (formData.hospitalId === 'manual' && !formData.hospital_manual.trim()) {
      setError('Por favor, escriba el nombre de su hospital.');
      setLoading(false);
      return;
    }

    if (!formData.departmentId) {
      setError('Por favor, seleccione su servicio/departamento de la lista o introduzca uno manual.');
      setLoading(false);
      return;
    }

    if (formData.departmentId === 'manual' && !formData.department_manual.trim()) {
      setError('Por favor, escriba el nombre de su servicio.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        email: formData.email,
        nombre: formData.nombre,
        phone: formData.phone,
        reason: formData.reason,
        status: 'pending',
        professional_role_id: formData.roleId === 'manual' ? null : formData.roleId,
        professional_role_manual: formData.roleId === 'manual' ? formData.role_manual : null,
        hospital: formData.hospitalId === 'manual' ? formData.hospital_manual : formData.hospital,
        hospital_id: formData.hospitalId === 'manual' ? null : formData.hospitalId,
        hospital_manual: formData.hospitalId === 'manual' ? formData.hospital_manual : null,
        department_id: formData.departmentId === 'manual' ? null : formData.departmentId,
        department_manual: formData.departmentId === 'manual' ? formData.department_manual : null,
      };

      const { error: insertError } = await supabase
        .from('access_requests')
        .insert([payload]);

      if (insertError) {
        if (insertError.code === '23505') {
            setError('Ya existe una solicitud pendiente para este email.');
        } else {
            throw insertError;
        }
      } else {
        setSuccess(true);
        // Call notification API asynchronously
        fetch('/api/notify-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            role_title: formData.roleId === 'manual' ? formData.role_manual : formData.roleName,
            department: formData.departmentId === 'manual' ? formData.department_manual : formData.department
          })
        }).catch(err => console.error('Failed to notify admin:', err));
      }
    } catch (err: any) {
      console.warn('Full Error:', err);
      // Detailed logging for debugging
      if (err.message) console.warn('Error Message:', err.message);
      if (err.details) console.warn('Error Details:', err.details);
      
      setError(err?.message || 'Ocurrió un error al enviar la solicitud. Verifique que la tabla exista.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-2xl relative z-10 py-10">
        <div className="mb-8">
          <button 
            onClick={() => router.push('/login')}
            className="flex items-center gap-2 text-muted hover:text-accent font-bold text-[10px] uppercase tracking-[0.2em] transition-all group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Volver al Login
          </button>
        </div>

        {success ? (
          <div className="bg-surface border border-emerald-500/20 rounded-3xl p-10 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto shadow-2xl shadow-emerald-500/10 mb-4 animate-bounce">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-black font-heading">Solicitud de Acceso Registrada.</h2>
            <p className="text-muted text-sm leading-relaxed max-w-md mx-auto">
              Estimado/a <strong>{formData.nombre}</strong>, hemos recibido su solicitud para acceder a JP Intelligence Platform. Nuestro equipo validará sus credenciales profesionales y le contactaremos en breve.
            </p>
            <Button onClick={() => router.push('/')} className="w-full max-w-xs mx-auto rounded-xl mt-6">Volver al Inicio</Button>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-[2.5rem] p-6 md:p-10 shadow-2xl backdrop-blur-sm relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
            
            <header className="mb-10 space-y-2">
                <h1 className="text-3xl font-black font-heading tracking-tight text-white">Solicitud de Acceso</h1>
                <p className="text-xs font-bold text-muted uppercase tracking-widest leading-relaxed">
                    Plataforma privada de logística y coordinación médica
                </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Nombre */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted ml-1">Nombre y Apellidos</label>
                    <div className="relative group/field">
                        <input
                          type="text"
                          required
                          value={formData.nombre}
                          onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                          className="w-full bg-background border border-border rounded-xl py-3 pl-11 pr-4 text-sm focus:border-accent/40 outline-none transition-all"
                          placeholder="Nombre y apellidos"
                        />
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within/field:text-accent" size={16} />
                    </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted ml-1">Email Profesional</label>
                    <div className="relative group/field">
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="w-full bg-background border border-border rounded-xl py-3 pl-11 pr-4 text-sm focus:border-accent/40 outline-none transition-all"
                          placeholder="profesional@hospital.com"
                        />
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within/field:text-accent" size={16} />
                    </div>
                </div>

                {/* Teléfono */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted ml-1">Teléfono Móvil</label>
                    <div className="relative group/field">
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="w-full bg-background border border-border rounded-xl py-3 pl-11 pr-4 text-sm focus:border-accent/40 outline-none transition-all"
                          placeholder="+34 600 000 000"
                        />
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within/field:text-accent" size={16} />
                    </div>
                </div>

                {/* Cargo */}
                <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted ml-1">Cargo Profesional</label>
                    <RoleSelect 
                      value={formData.roleId}
                      onChange={(id, name) => setFormData({...formData, roleId: id, roleName: name})}
                      className="w-full"
                    />
                </div>

                {/* Manual Role Fallback */}
                {formData.roleId === 'manual' && (
                  <div className="space-y-2 md:col-span-2 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-accent ml-1">Especifique su Cargo</label>
                      <div className="relative group/field">
                          <input
                            type="text"
                            required
                            value={formData.role_manual}
                            onChange={(e) => setFormData({...formData, role_manual: e.target.value})}
                            className="w-full bg-background border border-accent/40 rounded-xl py-3 pl-11 pr-4 text-sm focus:border-accent outline-none transition-all"
                            placeholder="Nombre del cargo..."
                          />
                          <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-accent" size={16} />
                      </div>
                  </div>
                )}

                {/* Hospital */}
                <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted ml-1">Centro Hospitalario</label>
                    <HospitalSelect 
                      value={formData.hospitalId}
                      onChange={(id, name) => setFormData({...formData, hospitalId: id, hospital: name})}
                      className="w-full"
                    />
                </div>

                {/* Manual Hospital Fallback */}
                {formData.hospitalId === 'manual' && (
                  <div className="space-y-2 md:col-span-2 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-accent ml-1">Especifique su Hospital</label>
                      <div className="relative group/field">
                          <input
                            type="text"
                            required
                            value={formData.hospital_manual}
                            onChange={(e) => setFormData({...formData, hospital_manual: e.target.value})}
                            className="w-full bg-background border border-accent/40 rounded-xl py-3 pl-11 pr-4 text-sm focus:border-accent outline-none transition-all"
                            placeholder="Nombre del centro médico..."
                          />
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-accent" size={16} />
                      </div>
                  </div>
                )}

                {/* Departamento */}
                <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted ml-1">Servicio / Departamento</label>
                    <DepartmentSelect 
                      value={formData.departmentId}
                      onChange={(id, name) => setFormData({...formData, departmentId: id, department: name})}
                      className="w-full"
                    />
                </div>

                {/* Manual Department Fallback */}
                {formData.departmentId === 'manual' && (
                  <div className="space-y-2 md:col-span-2 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-accent ml-1">Especifique su Servicio</label>
                      <div className="relative group/field">
                          <input
                            type="text"
                            required
                            value={formData.department_manual}
                            onChange={(e) => setFormData({...formData, department_manual: e.target.value})}
                            className="w-full bg-background border border-accent/40 rounded-xl py-3 pl-11 pr-4 text-sm focus:border-accent outline-none transition-all"
                            placeholder="Nombre del servicio..."
                          />
                          <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 text-accent" size={16} />
                      </div>
                  </div>
                )}

                {/* Motivo */}
                <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted ml-1">Motivo de la Solicitud</label>
                    <div className="relative group/field">
                        <textarea
                          required
                          value={formData.reason}
                          onChange={(e) => setFormData({...formData, reason: e.target.value})}
                          className="w-full bg-background border border-border rounded-xl py-3 pl-11 pr-4 text-sm focus:border-accent/40 outline-none transition-all min-h-[100px] resize-none"
                          placeholder="Breve explicación de por qué necesita acceso a la plataforma logística..."
                        />
                        <HelpCircle className="absolute left-4 top-4 text-muted group-focus-within/field:text-accent" size={16} />
                    </div>
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold text-center uppercase tracking-widest">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full gap-2 rounded-xl py-7 font-black uppercase tracking-widest text-xs"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>Enviar Solicitud <ArrowRight size={18} /></>
                )}
              </Button>
            </form>
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-2 text-muted/50 text-[10px] font-bold uppercase tracking-widest">
           <ShieldCheck size={12} />
           Cumplimiento Normativo RGPD y Privacidad Médica Estricta
        </div>
      </div>
    </div>
  );
}
