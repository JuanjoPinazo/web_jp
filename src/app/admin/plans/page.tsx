'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/hooks/useAdmin';
import { useTravelPlans, FullTravelPlan } from '@/hooks/useTravelPlans';
import { 
  Plane, 
  Hotel, 
  Car, 
  FileText, 
  Plus, 
  Search, 
  User as UserIcon, 
  Calendar,
  ChevronRight,
  MoreVertical,
  Loader2,
  X,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  ArrowLeft,
  Settings,
  ExternalLink,
  ShieldCheck,
  History,
  FileBadge
} from 'lucide-react';
import { Button } from '@/components/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialog } from '@/context/DialogContext';

export default function AdminPlansPage() {
  const { getUsers, getContexts } = useAdmin();
  const { getAdminPlanForUser, saveItem, deleteItem } = useTravelPlans();
  const { alert, confirm } = useDialog();

  const [view, setView] = useState<'list' | 'detail'>('list');
  const [users, setUsers] = useState<any[]>([]);
  const [contexts, setContexts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<FullTravelPlan | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedContext, setSelectedContext] = useState('');
  const [supportInfo, setSupportInfo] = useState({ phone: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const [uData, cData] = await Promise.all([getUsers(), getContexts()]);
      setUsers(uData);
      setContexts(cData);
      
      const { data: rawPlans, error: pError } = await supabase
        .from('contact_travel_plans')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (pError) throw pError;

      if (rawPlans && rawPlans.length > 0) {
        const enrichedPlans = rawPlans.map(plan => ({
          ...plan,
          profiles: uData.find(u => u.id === plan.user_id),
          contexts: cData.find(c => c.id === plan.context_id)
        }));
        setPlans(enrichedPlans);
      } else {
        setPlans([]);
      }
    } catch (err: any) {
      console.error('Error loading plans:', err.message || err);
      if (err.message?.includes('relation "contact_travel_plans" does not exist')) {
        setDbError('Las tablas de logística no han sido creadas aún.');
      } else {
        setDbError(err.message || 'Error al cargar los planes.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManagePlan = async (plan: any) => {
    setLoading(true);
    try {
      const fullPlan = await getAdminPlanForUser(plan.user_id, plan.context_id);
      if (fullPlan) {
        setSelectedPlan({
          ...fullPlan,
          profiles: plan.profiles,
          contexts: plan.contexts
        } as any);
        setView('detail');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDelete = async (id: string, table = 'contact_travel_plans') => {
    const isConfirmed = await confirm({
      title: 'Eliminar Registro',
      message: '¿Estás seguro de que deseas eliminar este registro? Se realizará un borrado lógico.',
      type: 'danger',
      confirmText: 'Eliminar'
    });
    
    if (!isConfirmed) return;
    
    try {
      await deleteItem(table, id);
      if (table === 'contact_travel_plans') {
        setView('list');
        loadData();
      } else if (selectedPlan) {
        handleManagePlan(selectedPlan);
      }
    } catch (err: any) {
      await alert({ title: 'Error', message: err.message, type: 'danger' });
    }
  };

  const handleSaveSection = async () => {
    if (!selectedPlan || !activeSection) return;
    setIsSubmitting(true);
    try {
      const tableMap: any = {
        hotel: 'travel_hotels',
        flight: 'travel_flights',
        transfer: 'travel_transfers',
        document: 'travel_documents',
        registration: 'travel_registrations'
      };
      
      const table = tableMap[activeSection];
      if (!table) return;

      await saveItem(table, { ...editData, plan_id: selectedPlan.id });
      await alert({ title: 'Éxito', message: 'Datos guardados correctamente.', type: 'success' });
      setActiveSection(null);
      handleManagePlan(selectedPlan);
    } catch (err: any) {
      await alert({ title: 'Error', message: err.message, type: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'updated': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'medicrm': return <Settings size={12} />;
      case 'agency': return <ExternalLink size={12} />;
      default: return <UserIcon size={12} />;
    }
  };

  // --- RENDERERS ---

  const renderList = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-5xl font-black font-heading tracking-tight text-foreground">Planes Logísticos.</h1>
          <p className="text-muted text-sm font-medium uppercase tracking-widest">Gestión de viajes, hoteles y documentación por usuario.</p>
        </div>
        <Button className="gap-2 rounded-2xl px-6 py-6 shadow-xl shadow-accent/10" onClick={() => setIsCreating(true)}>
          <Plus size={20} />
          Nuevo Plan
        </Button>
      </header>

      {dbError ? (
        <div className="p-10 rounded-[3rem] bg-red-500/5 border border-red-500/20 text-center space-y-4">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <p className="text-xl font-bold">{dbError}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-surface border border-border rounded-[2rem] p-6 flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-accent/30 transition-all hover:shadow-2xl hover:shadow-accent/5">
              <div className="flex items-center gap-6 flex-1">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                  <UserIcon size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold">{plan.profiles?.full_name || plan.profiles?.nombre || 'Usuario'}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted font-bold uppercase tracking-widest">{plan.contexts?.name}</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="text-[9px] text-muted font-medium uppercase tracking-tighter">Act: {new Date(plan.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 w-full md:w-auto">
                <Button 
                  className="flex-1 md:flex-none rounded-xl px-8 py-5 shadow-lg shadow-accent/5"
                  onClick={() => handleManagePlan(plan)}
                >
                  Gestionar
                </Button>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setEditingPlan(plan); }}
                    className="p-4 rounded-xl bg-background border border-border text-muted hover:text-accent transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleSoftDelete(plan.id)}
                    className="p-4 rounded-xl bg-background border border-border text-muted hover:text-red-500 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {plans.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-border rounded-[3rem] bg-surface/30">
              <p className="text-muted text-sm font-bold uppercase tracking-widest">No hay planes logísticos creados aún</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderDetail = () => {
    if (!selectedPlan) return null;

    const SectionCard = ({ title, icon: Icon, children, sectionId, items = [] }: any) => (
      <div className="bg-surface border border-border rounded-[2.5rem] overflow-hidden group hover:border-accent/20 transition-all">
        <div className="p-8 border-b border-border/50 flex justify-between items-center bg-background/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/5 flex items-center justify-center text-accent">
              <Icon size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black font-heading uppercase tracking-tight">{title}</h3>
              <p className="text-[10px] text-muted font-bold uppercase tracking-widest">{items.length} {items.length === 1 ? 'Elemento' : 'Elementos'}</p>
            </div>
          </div>
          <button 
            onClick={() => { setActiveSection(sectionId); setEditData({ plan_id: selectedPlan.id, status: 'planned', source: 'manual' }); }}
            className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center shadow-lg shadow-accent/20 hover:scale-110 transition-transform"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="p-8 space-y-4">
          {children}
          {items.length === 0 && (
            <p className="text-[11px] text-muted italic py-4 text-center">No hay datos registrados en esta sección.</p>
          )}
        </div>
      </div>
    );

    const ItemRow = ({ title, subtitle, status, source, lastUpdated, onEdit, onDelete }: any) => (
      <div className="bg-background/40 border border-border/40 rounded-2xl p-4 flex justify-between items-center group/item hover:bg-background/60 transition-all">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h4 className="font-bold text-sm">{title}</h4>
            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${getStatusColor(status)}`}>
              {status}
            </span>
          </div>
          <p className="text-xs text-muted font-medium">{subtitle}</p>
          <div className="flex items-center gap-3 text-[9px] text-muted/60 font-bold uppercase tracking-tight pt-1">
            <span className="flex items-center gap-1">
              {getSourceIcon(source)}
              {source}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {lastUpdated ? new Date(lastUpdated).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
        <div className="flex gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-2 text-muted hover:text-accent"><Edit2 size={14} /></button>
          <button onClick={onDelete} className="p-2 text-muted hover:text-red-500"><Trash2 size={14} /></button>
        </div>
      </div>
    );

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
        <button 
          onClick={() => setView('list')}
          className="flex items-center gap-2 text-muted hover:text-accent font-bold text-xs uppercase tracking-[0.2em] transition-all"
        >
          <ArrowLeft size={16} />
          Volver a la lista
        </button>

        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-accent/5 p-8 rounded-[3rem] border border-accent/10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-[2rem] bg-accent flex items-center justify-center text-white shadow-2xl shadow-accent/30">
              <UserIcon size={40} />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-black font-heading tracking-tight">{selectedPlan.profiles?.full_name || selectedPlan.profiles?.nombre || 'Usuario'}</h1>
              <p className="text-xs text-muted font-bold uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} className="text-accent" />
                {selectedPlan.contexts?.name}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${getStatusColor(selectedPlan.status)}`}>
              Plan {selectedPlan.status}
            </div>
            <p className="text-[10px] text-muted font-medium uppercase tracking-tighter">Última mod: {new Date(selectedPlan.created_at || '').toLocaleString()}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Registration Section */}
          <SectionCard title="Inscripción / Registro" icon={FileBadge} sectionId="registration" items={selectedPlan.registrations}>
            {selectedPlan.registrations.map(reg => (
              <ItemRow 
                key={reg.id}
                title={`Código: ${reg.registration_code || 'Pendiente'}`}
                subtitle={reg.notes || 'Sin observaciones'}
                status={reg.status}
                source={reg.source}
                lastUpdated={reg.last_updated_at}
                onEdit={() => { setEditData(reg); setActiveSection('registration'); }}
                onDelete={() => handleSoftDelete(reg.id, 'travel_registrations')}
              />
            ))}
          </SectionCard>

          {/* Hotel Section */}
          <SectionCard title="Alojamiento" icon={Hotel} sectionId="hotel" items={selectedPlan.hotels}>
            {selectedPlan.hotels.map(h => (
              <ItemRow 
                key={h.id}
                title={h.hotel_name}
                subtitle={`${new Date(h.check_in).toLocaleDateString()} - ${new Date(h.check_out).toLocaleDateString()}`}
                status={h.status}
                source={h.source}
                lastUpdated={h.last_updated_at}
                onEdit={() => { setEditData(h); setActiveSection('hotel'); }}
                onDelete={() => handleSoftDelete(h.id, 'travel_hotels')}
              />
            ))}
          </SectionCard>

          {/* Flight Section */}
          <SectionCard title="Vuelos" icon={Plane} sectionId="flight" items={selectedPlan.flights}>
            {selectedPlan.flights.map(f => (
              <ItemRow 
                key={f.id}
                title={`Vuelo ${f.flight_number}`}
                subtitle={`${f.origin} ➔ ${f.destination}`}
                status={f.status}
                source={f.source}
                lastUpdated={f.last_updated_at}
                onEdit={() => { setEditData(f); setActiveSection('flight'); }}
                onDelete={() => handleSoftDelete(f.id, 'travel_flights')}
              />
            ))}
          </SectionCard>

          {/* Transfer Section */}
          <SectionCard title="Transfers / Recogidas" icon={Car} sectionId="transfer" items={selectedPlan.transfers}>
            {selectedPlan.transfers.map(t => (
              <ItemRow 
                key={t.id}
                title={t.transfer_type || 'Transfer Privado'}
                subtitle={`${t.pickup_location} ➔ ${t.dropoff_location}`}
                status={t.status}
                source={t.source}
                lastUpdated={t.last_updated_at}
                onEdit={() => { setEditData(t); setActiveSection('transfer'); }}
                onDelete={() => handleSoftDelete(t.id, 'travel_transfers')}
              />
            ))}
          </SectionCard>

          {/* Support Section */}
          <div className="lg:col-span-2 bg-rose-500/5 border border-rose-500/10 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                <ShieldCheck size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black font-heading uppercase tracking-tight">Soporte JP Concierge</h3>
                <p className="text-sm text-muted font-medium">Asistencia 24/7 disponible para el usuario en este plan.</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-[10px] text-muted font-black uppercase tracking-widest">Teléfono de Soporte</p>
                <p className="text-xl font-bold text-rose-500">{selectedPlan.support_phone || 'No asignado'}</p>
              </div>
              <Button variant="outline" className="rounded-xl px-6 border-rose-500/20 text-rose-500 hover:bg-rose-500/10" onClick={() => { setEditingPlan(selectedPlan); }}>
                Cambiar Soporte
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      {loading && (
        <div className="fixed inset-0 bg-background/20 backdrop-blur-[2px] z-[200] flex items-center justify-center">
          <div className="bg-surface p-8 rounded-3xl shadow-2xl border border-border flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-accent" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted">Cargando datos...</p>
          </div>
        </div>
      )}

      {view === 'list' ? renderList() : renderDetail()}

      {/* Dynamic Section Modal */}
      <AnimatePresence>
        {activeSection && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[150] flex items-center justify-center p-6 text-foreground">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface border border-border w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 relative overflow-y-auto max-h-[90vh]"
            >
              <button onClick={() => setActiveSection(null)} className="absolute top-8 right-8 text-muted hover:text-accent"><X size={24} /></button>
              <h2 className="text-2xl font-black font-heading mb-8 uppercase tracking-tighter">Editar {activeSection}</h2>
              
              <div className="space-y-6">
                {activeSection === 'hotel' && (
                  <>
                    <input className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none" placeholder="Nombre del Hotel" value={editData.hotel_name || ''} onChange={e => setEditData({...editData, hotel_name: e.target.value})} />
                    <input className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none" placeholder="Dirección" value={editData.address || ''} onChange={e => setEditData({...editData, address: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-muted tracking-widest px-1">Check-in</label>
                        <input type="datetime-local" className="w-full bg-background border border-border rounded-xl p-3 text-xs" value={editData.check_in?.slice(0, 16) || ''} onChange={e => setEditData({...editData, check_in: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-muted tracking-widest px-1">Check-out</label>
                        <input type="datetime-local" className="w-full bg-background border border-border rounded-xl p-3 text-xs" value={editData.check_out?.slice(0, 16) || ''} onChange={e => setEditData({...editData, check_out: e.target.value})} />
                      </div>
                    </div>
                  </>
                )}

                {activeSection === 'flight' && (
                  <>
                    <input className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none" placeholder="Número de Vuelo" value={editData.flight_number || ''} onChange={e => setEditData({...editData, flight_number: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                      <input className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none" placeholder="Origen" value={editData.origin || ''} onChange={e => setEditData({...editData, origin: e.target.value})} />
                      <input className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none" placeholder="Destino" value={editData.destination || ''} onChange={e => setEditData({...editData, destination: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-muted tracking-widest px-1">Salida</label>
                        <input type="datetime-local" className="w-full bg-background border border-border rounded-xl p-3 text-xs" value={editData.departure_time?.slice(0, 16) || ''} onChange={e => setEditData({...editData, departure_time: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-muted tracking-widest px-1">Llegada</label>
                        <input type="datetime-local" className="w-full bg-background border border-border rounded-xl p-3 text-xs" value={editData.arrival_time?.slice(0, 16) || ''} onChange={e => setEditData({...editData, arrival_time: e.target.value})} />
                      </div>
                    </div>
                  </>
                )}

                {activeSection === 'registration' && (
                  <>
                    <input className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none" placeholder="Código de Inscripción" value={editData.registration_code || ''} onChange={e => setEditData({...editData, registration_code: e.target.value})} />
                    <input className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none" placeholder="URL Documento / PDF" value={editData.document_url || ''} onChange={e => setEditData({...editData, document_url: e.target.value})} />
                    <textarea className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none resize-none" rows={3} placeholder="Notas adicionales..." value={editData.notes || ''} onChange={e => setEditData({...editData, notes: e.target.value})} />
                  </>
                )}

                {/* Common fields for admin */}
                <div className="pt-6 border-t border-border/50 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-muted tracking-widest px-1">Estado Visual</label>
                      <select className="w-full bg-background border border-border rounded-xl p-3 text-xs" value={editData.status || 'planned'} onChange={e => setEditData({...editData, status: e.target.value})}>
                        <option value="planned">Planificado</option>
                        <option value="confirmed">Confirmado</option>
                        <option value="updated">Actualizado</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-muted tracking-widest px-1">Fuente del Dato</label>
                      <select className="w-full bg-background border border-border rounded-xl p-3 text-xs" value={editData.source || 'manual'} onChange={e => setEditData({...editData, source: e.target.value})}>
                        <option value="manual">Manual</option>
                        <option value="medicrm">MediCRM</option>
                        <option value="agency">Agencia</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button className="w-full py-6 rounded-2xl shadow-xl shadow-accent/20" onClick={handleSaveSection} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Guardar Sección'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Creation / Support Edit Modal */}
      {(isCreating || (editingPlan && view === 'list')) && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[150] flex items-center justify-center p-6 text-foreground">
          <div className="bg-surface border border-border w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 relative">
            <button onClick={() => { setIsCreating(false); setEditingPlan(null); }} className="absolute top-8 right-8 text-muted hover:text-accent"><X size={24} /></button>
            <h2 className="text-2xl font-black font-heading mb-8">
              {editingPlan ? 'Editar Cabecera' : 'Nuevo Plan Operativo'}
            </h2>
            <div className="space-y-6">
              {!editingPlan && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Usuario / Contacto</label>
                    <select 
                      className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none focus:border-accent"
                      value={selectedUser}
                      onChange={e => setSelectedUser(e.target.value)}
                    >
                      <option value="">Selecciona un usuario...</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.nombre || u.email}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Evento / Contexto</label>
                    <select 
                      className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none focus:border-accent"
                      value={selectedContext}
                      onChange={e => setSelectedContext(e.target.value)}
                    >
                      <option value="">Selecciona un evento...</option>
                      {contexts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Teléfono Soporte JP</label>
                <input 
                  className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none focus:border-accent"
                  value={supportInfo.phone}
                  onChange={e => setSupportInfo({...supportInfo, phone: e.target.value})}
                  placeholder="+34 600 000 000"
                />
              </div>

              {editingPlan && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Estado General</label>
                  <select 
                    className="w-full bg-background border border-border rounded-xl p-4 text-xs outline-none focus:border-accent"
                    value={editingPlan.status}
                    onChange={e => setEditingPlan({...editingPlan, status: e.target.value})}
                  >
                    <option value="active">Activo</option>
                    <option value="draft">Borrador</option>
                    <option value="completed">Completado</option>
                  </select>
                </div>
              )}

              <div className="pt-4">
                <Button className="w-full py-6 rounded-2xl shadow-xl shadow-accent/20" onClick={editingPlan ? async () => {
                  try {
                    setIsSubmitting(true);
                    const { error } = await supabase.from('contact_travel_plans').update({
                      support_phone: supportInfo.phone,
                      status: editingPlan.status
                    }).eq('id', editingPlan.id);
                    if (error) throw error;
                    await alert({ title: 'Éxito', message: 'Plan actualizado.', type: 'success' });
                    setEditingPlan(null);
                    loadData();
                  } catch (err: any) {
                    await alert({ title: 'Error', message: err.message, type: 'danger' });
                  } finally {
                    setIsSubmitting(false);
                  }
                } : async () => {
                  if (!selectedUser || !selectedContext) return;
                  try {
                    setIsSubmitting(true);
                    const { data, error } = await supabase.from('contact_travel_plans').insert({
                      user_id: selectedUser,
                      context_id: selectedContext,
                      support_phone: supportInfo.phone,
                      status: 'active',
                      source: 'manual'
                    }).select().single();
                    if (error) throw error;
                    await alert({ title: 'Éxito', message: 'Plan operativo creado.', type: 'success' });
                    setIsCreating(false);
                    loadData();
                  } catch (err: any) {
                    await alert({ title: 'Error', message: err.message, type: 'danger' });
                  } finally {
                    setIsSubmitting(false);
                  }
                }} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : editingPlan ? 'Guardar Cambios' : 'Crear Cabecera del Plan'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
