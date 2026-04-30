'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/hooks/useAdmin';
import { useDialog } from '@/context/DialogContext';
import {
  CheckCircle, XCircle, Loader2, User, Building2, Mail,
  Clock, Trash2, Phone, Briefcase, Stethoscope, HelpCircle, ArrowRight, X, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, alert } = useDialog();
  
  const { getClients } = useAdmin();
  const [clients, setClients] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  
  const [approvingRequest, setApprovingRequest] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [approvalLoading, setApprovalLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Basic queries first
      const clientsData = await getClients();
      setClients(clientsData || []);

      const [hospitalsRes, deptsRes, rolesRes] = await Promise.all([
        supabase.from('hospitals').select('*').order('name'),
        supabase.from('departments').select('*').order('name'),
        supabase.from('professional_roles').select('*').order('name')
      ]);

      setHospitals(hospitalsRes.data || []);
      setDepartments(deptsRes.data || []);
      setRoles(rolesRes.data || []);

      // Complex join query separately with fallback
      const { data, error } = await supabase
        .from('access_requests')
        .select('*, departments(name), hospitals(name), professional_roles(name, scope)')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("⚠️ Complex join for access_requests failed, trying basic select:", error.message);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('access_requests')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (fallbackError) throw fallbackError;
        setRequests(fallbackData || []);
      } else {
        setRequests(data || []);
      }
    } catch (err: any) {
      console.error("❌ Error loading requests data:", err.message || err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (id: string, newStatus: string) => {
    if (newStatus === 'rejected') {
      const isConfirmed = await confirm({
        title: 'Rechazar solicitud',
        message: '¿Desea rechazar definitivamente esta solicitud?',
        type: 'danger',
        confirmText: 'Rechazar'
      });
      if (!isConfirmed) return;
      
      try {
        const { data, error } = await supabase.from('access_requests').update({ status: 'rejected' }).eq('id', id).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('No se pudo rechazar. Puede ser un problema de permisos en la base de datos (RLS).');
        setRequests(requests.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
        await alert({ title: 'Completado', message: 'Solicitud rechazada correctamente', type: 'success' });
      } catch (err: any) {
        console.error(err);
        await alert({ title: 'Error', message: 'Error al rechazar: ' + err.message, type: 'danger' });
      }
    }
  };

  const openApprovalModal = (req: any) => {
    setApprovingRequest(req);
    setSelectedHospitalId(req.hospital_id || '');
    setSelectedDepartmentId(req.department_id || '');
    setSelectedRoleId(req.professional_role_id || '');
    setSelectedClientId(''); // Must be selected manually
  };

  const submitApproval = async () => {
    if (!selectedHospitalId) return alert({ title: 'Faltan datos', message: 'Seleccione un hospital para el usuario.', type: 'warning' });
    if (!selectedDepartmentId) return alert({ title: 'Faltan datos', message: 'Seleccione un servicio/departamento.', type: 'warning' });
    if (!selectedRoleId) return alert({ title: 'Faltan datos', message: 'Seleccione un cargo profesional.', type: 'warning' });
    if (!selectedClientId) return alert({ title: 'Faltan datos', message: 'Seleccione el Cliente (cuenta) asociado.', type: 'warning' });
    
    setApprovalLoading(true);
    try {
      const { data, error } = await supabase
        .from('access_requests')
        .update({ 
          status: 'approved',
          assigned_client_id: selectedClientId,
          assigned_hospital_id: selectedHospitalId,
          assigned_department_id: selectedDepartmentId,
          assigned_professional_role_id: selectedRoleId
        })
        .eq('id', approvingRequest.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('No se pudo aprobar. Puede ser un problema de permisos en la base de datos (RLS).');
      
      setRequests(requests.map(r => r.id === approvingRequest.id ? { ...r, status: 'approved' } : r));
      setApprovingRequest(null);
      setSelectedClientId('');
      setSelectedHospitalId('');
      setSelectedDepartmentId('');
      setSelectedRoleId('');
      
      await alert({ 
        title: 'Solicitud aprobada', 
        message: 'Solicitud aprobada y asignaciones guardadas. Ahora debes invitar al usuario desde Supabase Auth para completar el alta.',
        type: 'success'
      });
    } catch (err: any) {
      console.error(err);
      await alert({ title: 'Error', message: 'Error al aprobar: ' + err.message, type: 'danger' });
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Eliminar solicitud',
      message: '¿Eliminar definitivamente esta solicitud?',
      type: 'danger',
      confirmText: 'Eliminar'
    });
    if (!isConfirmed) return;

    try {
      const { data, error } = await supabase.from('access_requests').delete().eq('id', id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('No se pudo eliminar. Puede ser un problema de permisos en la base de datos (RLS).');
      
      setRequests(requests.filter(r => r.id !== id));
      await alert({ title: 'Eliminado', message: 'Solicitud eliminada correctamente', type: 'success' });
    } catch (err: any) {
      console.error(err);
      await alert({ title: 'Error', message: 'Error al eliminar: ' + err.message, type: 'danger' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="animate-spin text-accent" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-5xl font-black font-heading tracking-tight">Solicitudes de Acceso</h1>
        <p className="text-muted text-sm font-medium uppercase tracking-widest">Revisión detallada y aprobación de nuevos profesionales.</p>
      </header>

      <div className="grid gap-6">
        {requests.length === 0 ? (
          <div className="p-20 rounded-[3rem] bg-surface border border-dashed border-border text-center">
            <p className="text-muted text-sm font-bold uppercase tracking-widest font-heading">No hay solicitudes pendientes.</p>
          </div>
        ) : requests.map((req) => (
          <div key={req.id} className="p-8 rounded-[2.5rem] bg-surface border border-border shadow-sm flex flex-col group gap-6">
            
            {/* Header of Request */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex items-start gap-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                    req.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                    req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                    'bg-red-500/10 text-red-500 border border-red-500/20'
                  }`}>
                  {req.status === 'pending' ? <Clock size={24} /> :
                    req.status === 'approved' ? <CheckCircle size={24} /> : <XCircle size={24} />}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold">{req.nombre}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                        req.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                        req.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 
                        'bg-red-500/10 border-red-500/20 text-red-500'
                      }`}>
                      {req.status === 'pending' ? 'Pendiente' : req.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-muted">
                    <div className="flex items-center gap-1.5"><Mail size={14} /> {req.email}</div>
                    {req.phone && <div className="flex items-center gap-1.5"><Phone size={14} /> {req.phone}</div>}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 w-full lg:w-auto">
                {req.status === 'pending' && (
                  <>
                    <button
                      onClick={() => openApprovalModal(req)}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 border border-emerald-500/20 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => handleProcess(req.id, 'rejected')}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-surface border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all"
                    >
                      Rechazar
                    </button>
                  </>
                )}
                {req.status === 'approved' && (
                  <div className="flex items-center gap-2 text-emerald-500 font-bold text-[10px] uppercase px-4 py-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                    <CheckCircle size={14} /> Lista para Auth
                  </div>
                )}
                <button
                  onClick={() => handleDelete(req.id)}
                  className="p-3 rounded-xl bg-background border border-border text-muted hover:text-red-500 hover:border-red-500/40 transition-all"
                  title="Eliminar solicitud"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 p-6 rounded-3xl bg-background border border-border/50">
              <div className="space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                  <Building2 size={12} /> Centro Médico
                </p>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-white">{req.hospitals?.name || req.hospital || req.hospital_manual}</p>
                  {req.hospital_manual && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-widest border border-amber-500/20" title="Hospital introducido manualmente">Manual</span>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                  <Stethoscope size={12} /> Departamento
                </p>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-white">{req.departments?.name || req.department_manual || 'N/A'}</p>
                  {req.department_manual && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-widest border border-amber-500/20" title="Servicio introducido manualmente">Manual</span>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                  <Briefcase size={12} /> Cargo
                </p>
                <div className="flex flex-col gap-1">
                  <p className="font-medium text-sm text-white">{req.professional_roles?.name || req.professional_role_manual || req.role_title || 'N/A'}</p>
                  {req.professional_roles?.scope && (
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest flex items-center gap-1 w-max px-1.5 py-0.5 rounded border",
                      req.professional_roles.scope === 'hospital' 
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    )}>
                      {req.professional_roles.scope}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                  <Clock size={12} /> Solicitado
                </p>
                <p className="font-medium text-sm text-white">{new Date(req.created_at).toLocaleDateString()}</p>
              </div>
              <div className="col-span-full pt-4 mt-2 border-t border-border/50 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                  <HelpCircle size={12} /> Motivo del Acceso
                </p>
                <p className="text-sm text-white/70 italic bg-surface p-4 rounded-xl border border-border leading-relaxed">
                  "{req.reason || 'Sin motivo especificado'}"
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Approval Modal */}
      <AnimatePresence>
        {approvingRequest && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              onClick={() => setApprovingRequest(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-surface border border-border rounded-[2.5rem] p-8 shadow-2xl z-[101]"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black">Aprobar Acceso</h3>
                    <p className="text-xs text-muted font-medium">Asignar {approvingRequest.nombre} a un Cliente</p>
                  </div>
                  <button onClick={() => setApprovingRequest(null)} className="p-2 rounded-full bg-background border border-border text-muted hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </div>

                {approvingRequest.hospital_manual && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 text-amber-500">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed font-medium">
                      Este usuario introdujo un hospital manualmente (<strong>{approvingRequest.hospital_manual}</strong>). Asegúrate de crear este hospital y el Cliente correspondiente en la sección de Clientes antes de asignarlo.
                    </p>
                  </div>
                )}

                {approvingRequest.department_manual && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 text-amber-500">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed font-medium">
                      El servicio/departamento se introdujo manualmente (<strong>{approvingRequest.department_manual}</strong>).
                    </p>
                  </div>
                )}

                {approvingRequest.professional_role_manual && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 text-amber-500">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed font-medium">
                      El cargo se introdujo manualmente (<strong>{approvingRequest.professional_role_manual}</strong>).
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Confirmar Cargo Profesional</label>
                    <select
                      value={selectedRoleId}
                      onChange={(e) => setSelectedRoleId(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl py-4 px-4 text-sm focus:border-accent/40 outline-none transition-all"
                    >
                      <option value="">Seleccionar cargo...</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.scope})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Confirmar Hospital</label>
                    <select
                      value={selectedHospitalId}
                      onChange={(e) => setSelectedHospitalId(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl py-4 px-4 text-sm focus:border-accent/40 outline-none transition-all"
                    >
                      <option value="">Seleccionar hospital...</option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Confirmar Servicio/Departamento</label>
                    <select
                      value={selectedDepartmentId}
                      onChange={(e) => setSelectedDepartmentId(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl py-4 px-4 text-sm focus:border-accent/40 outline-none transition-all"
                    >
                      <option value="">Seleccionar servicio...</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-accent ml-1 flex items-center gap-2"><Building2 size={12}/> Asignar Cliente (Cuenta Comercial)</label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full bg-accent/5 border border-accent/20 rounded-xl py-4 px-4 text-sm focus:border-accent outline-none transition-all text-white"
                    >
                      <option value="">Seleccionar cliente de facturación...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <Button
                    onClick={submitApproval}
                    disabled={approvalLoading}
                    className="w-full rounded-xl py-4"
                  >
                    {approvalLoading ? <Loader2 className="animate-spin" size={18} /> : 'Aprobar Solicitud y Guardar'}
                  </Button>
                  <p className="text-[9px] text-center text-muted uppercase tracking-widest font-bold mt-4">
                    Al aprobar, deberás enviar invitación desde Supabase
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
