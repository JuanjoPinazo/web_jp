'use client';

import React, { useEffect, useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { User } from '@/types/platform';
import { Plus, Mail, Shield, UserPlus, X, CheckCircle2, Building2, Loader2, MapPin, Edit2, Trash2, Stethoscope } from 'lucide-react';
import { Button } from '@/components/Button';
import { HospitalSelect } from '@/components/HospitalSelect';
import { DepartmentSelect } from '@/components/DepartmentSelect';
import { useDialog } from '@/context/DialogContext';

export default function AdminClientsPage() {
  const { getClients, createClient, getUsers, updateUserClient, updateClient, deleteClient } = useAdmin();
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [assigningTo, setAssigningTo] = useState<any | null>(null);
  const [newClient, setNewClient] = useState({ name: '', domain: '', hospital_id: '', department_id: '' });
  const { confirm, alert } = useDialog();

  useEffect(() => {
    loadData();
  }, [getClients, getUsers]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [clientsData, usersData] = await Promise.all([getClients(), getUsers()]);
      setClients(clientsData);
      setUsers(usersData);
    } catch (err: any) {
      console.error('Error loading clients data:', err);
      setError(err?.message || err?.details || "Error desconocido al cargar datos. Verifica la consola.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    if (!newClient.name) return;
    try {
      if (editingClient) {
        await updateClient(editingClient.id, newClient);
      } else {
        await createClient(newClient.name, newClient.domain, newClient.hospital_id, newClient.department_id);
      }
      setIsCreating(false);
      setEditingClient(null);
      setNewClient({ name: '', domain: '', hospital_id: '', department_id: '' });
      await loadData();
    } catch (err) {
      console.error(err);
      await alert({ title: 'Error', message: 'Error al procesar la solicitud.', type: 'danger' });
    }
  };

  const handleDeleteClient = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Eliminar cliente',
      message: '¿Estás seguro de que deseas eliminar este cliente?',
      type: 'danger',
      confirmText: 'Eliminar'
    });
    if (!isConfirmed) return;
    
    try {
      await deleteClient(id);
      await loadData();
    } catch (err) {
      console.error(err);
      await alert({ title: 'Error', message: 'No se pudo eliminar el cliente. Es posible que tenga registros asociados.', type: 'warning' });
    }
  };

  const startEditing = (client: any) => {
    setEditingClient(client);
    setNewClient({
      name: client.name || '',
      domain: client.domain || '',
      hospital_id: client.hospital_id || '',
      department_id: client.department_id || ''
    });
    setIsCreating(true);
  };

  const handleAssignUser = async (userId: string, clientId: string) => {
    try {
      await updateUserClient(userId, clientId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, client_id: clientId } : u));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-5xl font-black font-heading tracking-tight text-foreground">Clientes & Cuentas.</h1>
          <p className="text-muted text-sm font-medium uppercase tracking-widest">Estructura organizativa y asignación de usuarios.</p>
        </div>
        <Button className="gap-2 rounded-2xl px-6 py-6" onClick={() => setIsCreating(true)}>
          <Plus size={20} />
          Nuevo Cliente
        </Button>
      </header>

      {error && (
        <div className="p-6 rounded-[2rem] bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center gap-3 animate-in shake duration-500">
          <Shield size={20} />
          <div className="flex flex-col gap-1">
            <span>{error}</span>
            <span className="opacity-60 text-[10px]">Asegúrate de haber ejecutado el script SQL proporcionado para crear la tabla de hospitales.</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.length > 0 ? (
          clients.map((client) => (
            <div key={client.id} className="p-8 rounded-[2.5rem] bg-surface border border-border shadow-sm flex flex-col gap-6 group hover:border-accent/30 transition-all">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                  <Building2 size={24} />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEditing(client)}
                    className="p-2 rounded-xl bg-background border border-border text-muted hover:text-accent hover:border-accent/40 transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteClient(client.id)}
                    className="p-2 rounded-xl bg-background border border-border text-muted hover:text-red-500 hover:border-red-500/40 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => setAssigningTo(client)}
                    className="p-2 rounded-xl bg-background border border-border text-muted hover:text-accent hover:border-accent/40 transition-all"
                  >
                    <UserPlus size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold font-heading uppercase tracking-tight">{client.name}</h3>
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">{client.domain || 'Dominio no definido'}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {client.hospitals?.name && (
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-accent uppercase tracking-widest bg-accent/5 px-2 py-1 rounded-md border border-accent/10">
                        <MapPin size={10} />
                        {client.hospitals.name}
                      </div>
                    )}
                    {client.departments?.name && (
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-400 uppercase tracking-widest bg-blue-400/5 px-2 py-1 rounded-md border border-blue-400/10">
                        <Stethoscope size={10} />
                        {client.departments?.name || 'N/A'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50 flex flex-col gap-3">
                <p className="text-[10px] font-black text-muted uppercase tracking-widest">Usuarios vinculados</p>
                <div className="flex -space-x-2">
                  {users.filter(u => u.client_id === client.id).map((u, i) => (
                    <div key={u.id} className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-[10px] font-black text-accent overflow-hidden ring-2 ring-surface" title={u.email}>
                      {(u.name && u.name[0]) || '?'}
                    </div>
                  ))}
                  {users.filter(u => u.client_id === client.id).length === 0 && (
                    <span className="text-[10px] italic text-muted/50">Sin usuarios</span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-[3rem] bg-surface/30">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-muted">
                <Building2 size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-bold">No hay clientes registrados</p>
                <p className="text-muted text-xs">Crea tu primera cuenta comercial para empezar a asignar usuarios.</p>
              </div>
              <Button onClick={() => setIsCreating(true)} variant="outline" className="mt-4 rounded-xl">Crear Cliente Ahora</Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Client Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 text-foreground">
          <div className="bg-surface border border-border w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setIsCreating(false);
                setEditingClient(null);
                setNewClient({ name: '', domain: '', hospital_id: '', department_id: '' });
              }} 
              className="absolute top-8 right-8 text-muted hover:text-accent"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-black font-heading mb-8">{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Nombre de la Organización</label>
                <input
                  className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none focus:border-accent/40"
                  placeholder="Ej: Hospital Universitario"
                  value={newClient.name}
                  onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Dominio Correo (@ejemplo.com)</label>
                <input
                  className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none focus:border-accent/40"
                  placeholder="@hospital.es"
                  value={newClient.domain}
                  onChange={e => setNewClient({ ...newClient, domain: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Hospital Vinculado</label>
                <HospitalSelect
                  value={newClient.hospital_id}
                  onChange={id => setNewClient({ ...newClient, hospital_id: id })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Servicio / Departamento</label>
                <DepartmentSelect
                  value={newClient.department_id}
                  onChange={id => setNewClient({ ...newClient, department_id: id })}
                />
              </div>
              <Button className="w-full rounded-2xl py-6 mt-4" onClick={handleCreateClient}>
                {editingClient ? 'Guardar Cambios' : 'Registrar Organización'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Users Modal */}
      {assigningTo && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 text-foreground">
          <div className="bg-surface border border-border w-full max-w-xl rounded-[2.5rem] shadow-2xl p-10 relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setAssigningTo(null)} className="absolute top-8 right-8 text-muted hover:text-accent"><X size={24} /></button>
            <h2 className="text-2xl font-black font-heading mb-4">Vincular a {assigningTo.name}</h2>
            <p className="text-xs text-muted mb-8 italic">Seleccione los usuarios que pertenecen a este cliente.</p>

            <div className="max-h-96 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {users.map(user => {
                const isAssigned = user.client_id === assigningTo.id;
                return (
                  <div key={user.id} className="p-4 rounded-2xl bg-background border border-border flex justify-between items-center group hover:border-accent/20 transition-all">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{user.name} {user.surname}</span>
                      <span className="text-[10px] text-muted">{user.email}</span>
                    </div>
                    <button
                      onClick={() => handleAssignUser(user.id, assigningTo.id)}
                      disabled={isAssigned}
                      className={`p-2 rounded-xl transition-all ${isAssigned ? 'text-emerald-500 bg-emerald-500/10' : 'text-muted hover:bg-accent/10 hover:text-accent'}`}
                    >
                      {isAssigned ? <CheckCircle2 size={18} /> : <UserPlus size={18} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
