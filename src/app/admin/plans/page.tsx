'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/hooks/useAdmin';
import { useTravelPlans, FullTravelPlan } from '@/hooks/useTravelPlans';
import { FlightCard } from '@/components/FlightCard';
import { CoordinatorSelector } from '@/components/CoordinatorSelector';
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
  FileBadge,
  Download
} from 'lucide-react';
import { Button } from '@/components/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialog } from '@/context/DialogContext';

export default function AdminPlansPage() {
  const { getUsers, getContexts } = useAdmin();
  const [isImporting, setIsImporting] = useState(false);
  const [importType, setImportType] = useState('auto');
  const [importStep, setImportStep] = useState<'upload' | 'extracting' | 'validating'>('upload');
  const [extractionResult, setExtractionResult] = useState<any>(null);

  const { getAdminPlanForUser, saveItem, deleteItem, saveTravelDocument } = useTravelPlans();
  const { alert, confirm } = useDialog();

  const displayLocalTime = (dateStr: string) => {
    if (!dateStr) return 'S/H';
    try {
      // Extraemos la parte de la hora directamente del string ISO para evitar conversiones de zona horaria del navegador
      // El formato suele ser YYYY-MM-DDTHH:mm:ss...
      const timePart = dateStr.split('T')[1];
      if (timePart) {
        return timePart.substring(0, 5);
      }
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'S/H';
    }
  };

  const [view, setView] = useState<'list' | 'detail'>('list');
  const [users, setUsers] = useState<any[]>([]);
  const [contexts, setContexts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [editingFlight, setEditingFlight] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedContext, setSelectedContext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supportInfo, setSupportInfo] = useState({ phone: '+34 600 000 000' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uData, cData] = await Promise.all([getUsers(), getContexts()]);
      setUsers(uData || []);
      setContexts(cData || []);

      const { data: pData, error: pError } = await supabase
        .from('contact_travel_plans')
        .select(`
          *,
          profiles:user_id (nombre, apellidos, email),
          contexts:context_id (name)
        `)
        .order('created_at', { ascending: false });

      if (pError) throw pError;
      setPlans(pData || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      alert({ title: 'Error', message: 'No se pudieron cargar los datos.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleManagePlan = async (plan: any) => {
    setLoading(true);
    try {
      const fullPlan = await getAdminPlanForUser(plan.user_id, plan.context_id);
      setSelectedPlan(fullPlan);
      setView('detail');
    } catch (err) {
      alert({ title: 'Error', message: 'No se pudo cargar el detalle del plan.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = plans.filter(p => {
    const userName = `${p.profiles?.nombre} ${p.profiles?.apellidos}`.toLowerCase();
    const contextName = p.contexts?.name?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return userName.includes(query) || contextName.includes(query);
  });

  const handleImportPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStep('extracting');
    setIsImporting(true);

    try {
      const { extractTravelInfo } = await import('@/app/actions/travel-extraction');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', importType);
      formData.append('userName', `${selectedPlan?.profiles?.nombre} ${selectedPlan?.profiles?.apellidos}`);

      const result = await extractTravelInfo(formData);
      setExtractionResult({ ...result, file });
      setImportStep('validating');
    } catch (err: any) {
      alert({ title: 'Error', message: err.message, type: 'danger' });
      setIsImporting(false);
    }
  };

  const handleSaveFlight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlight) return;

    try {
      setIsSubmitting(true);
      
      // Sanitización de datos
      const flightData = { ...editingFlight };
      delete flightData.created_at;
      delete flightData.updated_at;

      const { error } = await supabase
        .from('travel_flights')
        .update({
          ...flightData,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingFlight.id);

      if (error) throw error;

      await alert({ title: 'Éxito', message: 'Vuelo actualizado correctamente.', type: 'success' });
      setEditingFlight(null);
      handleManagePlan(selectedPlan);
    } catch (err: any) {
      alert({ title: 'Error', message: err.message, type: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPlansList = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tighter flex items-center gap-3">
            <Plane className="text-accent" /> Logística de Viajes
          </h1>
          <p className="text-muted text-[10px] font-black uppercase tracking-[0.2em] mt-1">Panel de Control de Itinerarios</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input 
              type="text" 
              placeholder="Buscar pasajero o evento..." 
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-accent transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsCreating(true)} className="rounded-xl px-4 flex items-center gap-2">
            <Plus size={18} /> <span className="hidden md:inline">Nuevo Plan</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlans.map(plan => (
          <motion.div 
            key={plan.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-background border border-border rounded-2xl p-5 hover:border-accent/50 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all">
              <Button variant="ghost" size="sm" onClick={() => { setEditingPlan(plan); setSupportInfo({ phone: plan.support_phone }); }}>
                <Edit2 size={14} />
              </Button>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <UserIcon size={24} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground line-clamp-1">{plan.profiles?.nombre} {plan.profiles?.apellidos}</h3>
                <p className="text-[10px] text-muted font-black uppercase tracking-widest">{plan.contexts?.name || 'Evento General'}</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-xs text-muted">
                <ShieldCheck size={14} className={plan.status === 'active' ? 'text-emerald-500' : 'text-orange-500'} />
                <span>Estado: <b className="text-foreground uppercase text-[10px]">{plan.status === 'active' ? 'Publicado' : 'Borrador'}</b></span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <Phone size={14} />
                <span>Soporte: <b className="text-foreground">{plan.support_phone || 'S/N'}</b></span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full rounded-xl border-accent/20 text-accent text-xs font-bold hover:bg-accent hover:text-white transition-all py-2"
              onClick={() => handleManagePlan(plan)}
            >
              Gestionar Itinerario <ChevronRight size={14} />
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderDetail = () => {
    if (!selectedPlan) return null;

    const flights = selectedPlan.flights || [];
    const hotels = selectedPlan.hotels || [];
    const transfers = selectedPlan.transfers || [];

    return (
      <div className="space-y-8 pb-20">
        {/* Header Detalle */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="rounded-xl p-2" onClick={() => setView('list')}>
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h2 className="text-xl font-black text-foreground tracking-tighter">
                Plan: {selectedPlan.profiles?.nombre} {selectedPlan.profiles?.apellidos}
              </h2>
              <p className="text-[10px] text-muted font-black uppercase tracking-widest">
                {selectedPlan.contexts?.name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl px-4 flex items-center gap-2 border-accent/20 text-accent hover:bg-accent hover:text-white" onClick={() => setIsImporting(true)}>
              <FileBadge size={18} /> Importar PDF de Agencia
            </Button>
          </div>
        </div>

        <CoordinatorSelector 
          planId={selectedPlan.id} 
          currentContactId={selectedPlan.logistic_contact_id}
          onAssigned={async (contactId) => {
            try {
              const { error } = await supabase
                .from('contact_travel_plans')
                .update({ logistic_contact_id: contactId || null })
                .eq('id', selectedPlan.id);
              
              if (error) throw error;
              handleManagePlan(selectedPlan); // Refresh
            } catch (err) {
              console.error(err);
            }
          }}
        />

        {/* Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-background border border-border p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Plane size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted uppercase tracking-widest">Vuelos</p>
              <p className="text-lg font-black text-foreground">{flights.length}</p>
            </div>
          </div>
          <div className="bg-background border border-border p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Hotel size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted uppercase tracking-widest">Hoteles</p>
              <p className="text-lg font-black text-foreground">{hotels.length}</p>
            </div>
          </div>
          <div className="bg-background border border-border p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Car size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted uppercase tracking-widest">Traslados</p>
              <p className="text-lg font-black text-foreground">{transfers.length}</p>
            </div>
          </div>
          <div className="bg-background border border-border p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted uppercase tracking-widest">Documentos</p>
              <p className="text-lg font-black text-foreground">{selectedPlan.documents?.length || 0}</p>
            </div>
          </div>
        </div>

        {/* Vuelos Section */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-black uppercase text-muted tracking-widest flex items-center gap-2">
              <Plane size={14} className="text-accent" /> Segmentos de Vuelo
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flights.sort((a: any, b: any) => (a.type === 'outbound' ? -1 : 1)).map((flight: any) => {
              const flightDoc = selectedPlan.documents?.find((d: any) => d.related_entity === 'flight' && d.related_entity_id === flight.id);
              
              return (
                <FlightCard 
                  key={flight.id} 
                  flight={flight} 
                  role="admin"
                  actions={
                    <>
                      {flightDoc && (
                        <a href={flightDoc.file_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <FileText size={14} className="text-accent" />
                          </Button>
                        </a>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingFlight(flight)}>
                        <Edit2 size={14} className="text-muted hover:text-accent" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete('flight', flight.id)}>
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    </>
                  }
                />
              );
            })}
            {flights.length === 0 && (
              <div className="col-span-full border border-dashed border-border rounded-2xl p-10 text-center">
                <p className="text-xs text-muted font-medium">No hay vuelos registrados para este itinerario.</p>
              </div>
            )}
          </div>
        </section>

        {/* Hoteles Section */}
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase text-muted tracking-widest flex items-center gap-2">
            <Hotel size={14} className="text-accent" /> Alojamiento
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hotels.map((hotel: any) => (
              <div key={hotel.id} className="bg-background border border-border rounded-2xl overflow-hidden group">
                <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                      <Hotel size={16} />
                    </div>
                    <span className="text-xs font-bold text-foreground line-clamp-1">{hotel.hotel_name || 'Hotel S/N'}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete('hotel', hotel.id)}>
                    <Trash2 size={14} className="text-red-500" />
                  </Button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin size={14} className="text-muted mt-1" />
                    <div>
                      <p className="text-[10px] font-black text-muted uppercase tracking-widest">Ubicación</p>
                      <p className="text-xs font-medium">{hotel.address || 'Dirección no especificada'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-muted uppercase tracking-widest">Check-in</p>
                      <p className="text-xs font-bold">{hotel.check_in ? new Date(hotel.check_in).toLocaleDateString('es-ES') : 'S/F'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-muted uppercase tracking-widest">Check-out</p>
                      <p className="text-xs font-bold">{hotel.check_out ? new Date(hotel.check_out).toLocaleDateString('es-ES') : 'S/F'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {hotels.length === 0 && (
              <div className="col-span-full border border-dashed border-border rounded-2xl p-10 text-center">
                <p className="text-xs text-muted font-medium">No hay alojamientos registrados.</p>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase text-muted tracking-widest flex items-center gap-2">
            <FileText size={14} className="text-accent" /> Documentación
          </h3>
          <div className="bg-background border border-border rounded-2xl divide-y divide-border">
            {selectedPlan.documents?.filter((d: any) => !d.related_entity_id).map((doc: any) => (
              <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent">
                    <FileBadge size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{doc.title}</p>
                    <p className="text-[9px] text-muted font-black uppercase tracking-widest">Digitalizado el {new Date(doc.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="rounded-lg">
                      <Download size={16} />
                    </Button>
                  </a>
                  <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => handleDelete('document', doc.id)}>
                    <Trash2 size={16} className="text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            {!selectedPlan.documents?.filter((d: any) => !d.related_entity_id).length && (
              <div className="p-10 text-center text-xs text-muted">No hay documentos generales. Los billetes se visualizan en sus tarjetas correspondientes.</div>
            )}
          </div>
        </section>
      </div>
    );
  };

  const handleDelete = async (type: string, id: string) => {
    const isConfirmed = await confirm({
      title: 'Eliminar Registro',
      message: '¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.',
      type: 'danger'
    });

    if (isConfirmed) {
      try {
        const tableMap: any = { flight: 'travel_flights', hotel: 'travel_hotels', transfer: 'travel_transfers', document: 'travel_documents' };
        await deleteItem(tableMap[type], id);
        handleManagePlan(selectedPlan);
      } catch (err) {
        alert({ title: 'Error', message: 'No se pudo eliminar el registro.', type: 'danger' });
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-accent" size={40} />
            <p className="text-xs font-black uppercase tracking-widest text-muted">Sincronizando itinenario...</p>
          </div>
        </div>
      )}

      {view === 'list' ? renderPlansList() : renderDetail()}

      {/* Modals de Gestión de Plan (Creación/Edición) */}
      <AnimatePresence>
        {(isCreating || editingPlan) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background border border-border w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-surface-subtle">
                <h3 className="font-black text-lg tracking-tighter text-foreground">
                  {editingPlan ? 'Configurar Plan Operativo' : 'Nuevo Plan Operativo'}
                </h3>
                <Button variant="ghost" className="rounded-xl h-8 w-8 p-0" onClick={() => { setIsCreating(false); setEditingPlan(null); }}>
                  <X size={18} />
                </Button>
              </div>
              <div className="p-6 space-y-6">
                {!editingPlan && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Pasajero / Usuario</label>
                      <select 
                        className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent appearance-none"
                        value={selectedUser}
                        onChange={e => setSelectedUser(e.target.value)}
                      >
                        <option value="">Seleccionar...</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellidos}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Contexto / Evento</label>
                      <select 
                        className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent appearance-none"
                        value={selectedContext}
                        onChange={e => setSelectedContext(e.target.value)}
                      >
                        <option value="">Seleccionar...</option>
                        {contexts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Teléfono de Soporte 24h</label>
                  <input 
                    type="text" 
                    className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent"
                    value={supportInfo.phone}
                    onChange={e => setSupportInfo({ phone: e.target.value })}
                  />
                </div>

                {editingPlan && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Estado de Publicación</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setEditingPlan({...editingPlan, status: 'active'})}
                        className={`p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${editingPlan.status === 'active' ? 'bg-green-500/10 border-green-500 text-green-600' : 'bg-background border-border text-muted hover:border-accent'}`}
                      >
                        Publicado
                      </button>
                      <button 
                        onClick={() => setEditingPlan({...editingPlan, status: 'draft'})}
                        className={`p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${editingPlan.status === 'draft' ? 'bg-orange-500/10 border-orange-500 text-orange-600' : 'bg-background border-border text-muted hover:border-accent'}`}
                      >
                        Borrador
                      </button>
                    </div>
                  </div>
                )}

                <Button className="w-full rounded-xl py-6 font-black uppercase tracking-widest text-[11px]" onClick={editingPlan ? async () => {
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Importación PDF */}
      <AnimatePresence>
        {isImporting && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-background border border-border w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl"
            >
               <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-foreground tracking-tighter">Motor de Extracción IA</h3>
                      <p className="text-xs text-muted font-black uppercase tracking-[0.2em] mt-1">Importación de Logística</p>
                    </div>
                    <Button variant="ghost" className="rounded-full h-10 w-10 p-0" onClick={() => { setIsImporting(false); setExtractionResult(null); }}>
                      <X size={24} />
                    </Button>
                  </div>

                  {importStep === 'upload' && (
                    <div className="space-y-8">
                       <div className="grid grid-cols-2 gap-4">
                         <button onClick={() => setImportType('flight')} className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 ${importType === 'flight' ? 'border-accent bg-accent/5' : 'border-border bg-muted/10 opacity-50 hover:opacity-100'}`}>
                           <Plane size={32} className={importType === 'flight' ? 'text-accent' : 'text-muted'} />
                           <span className="text-[10px] font-black uppercase tracking-widest">Billete de Vuelo</span>
                         </button>
                         <button onClick={() => setImportType('hotel')} className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 ${importType === 'hotel' ? 'border-accent bg-accent/5' : 'border-border bg-muted/10 opacity-50 hover:opacity-100'}`}>
                           <Hotel size={32} className={importType === 'hotel' ? 'text-accent' : 'text-muted'} />
                           <span className="text-[10px] font-black uppercase tracking-widest">Reserva Hotel</span>
                         </button>
                       </div>
                       
                       <label className="block">
                         <div className="border-2 border-dashed border-border rounded-[32px] p-12 flex flex-col items-center justify-center gap-4 hover:border-accent/50 cursor-pointer transition-all bg-muted/5 group">
                           <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-all">
                             <Plus size={32} />
                           </div>
                           <p className="text-xs font-bold text-muted uppercase tracking-widest">Seleccionar Archivo PDF</p>
                           <input type="file" accept=".pdf" className="hidden" onChange={handleImportPdf} />
                         </div>
                       </label>
                    </div>
                  )}

                  {importStep === 'extracting' && (
                    <div className="p-20 flex flex-col items-center gap-6">
                      <Loader2 className="animate-spin text-accent" size={60} />
                      <div className="text-center">
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-foreground mb-2">Analizando Documento</p>
                        <p className="text-xs text-muted font-bold">Nuestra IA está identificando los bloques de viaje...</p>
                      </div>
                    </div>
                  )}

                  {importStep === 'validating' && extractionResult && (
                    <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar">
                      <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-black text-sm">
                          {Math.round(extractionResult.confidence * 100)}%
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-accent tracking-widest">Confianza de Extracción</p>
                          <p className="text-xs font-bold text-foreground">Se han identificado {extractionResult.confidence >= 0.9 ? 'todos' : 'casi todos'} los campos críticos.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        {extractionResult.type === 'flight' ? (
                          <>
                            <FieldReview label="Aerolínea" value={extractionResult.data.airline} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, airline: v}})} />
                            <FieldReview label="Nº de Vuelo" value={extractionResult.data.flight_number} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, flight_number: v}})} />
                            <FieldReview label="Origen" value={extractionResult.data.departure_location} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, departure_location: v}})} />
                            <FieldReview label="Destino" value={extractionResult.data.arrival_location} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, arrival_location: v}})} />
                            <FieldReview label="Salida (Local)" value={extractionResult.data.departure_time} type="text" onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, departure_time: v}})} />
                            <FieldReview label="Llegada (Local)" value={extractionResult.data.arrival_time} type="text" onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, arrival_time: v}})} />
                            <FieldReview label="Cód. Reserva" value={extractionResult.data.reservation_code} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, reservation_code: v}})} />
                            <FieldReview label="Asiento" value={extractionResult.data.seat} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, seat: v}})} />
                          </>
                        ) : (
                          <>
                            <FieldReview label="Hotel" value={extractionResult.data.hotel_name} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, hotel_name: v}})} />
                            <FieldReview label="Confirmación" value={extractionResult.data.confirmation_number} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, confirmation_number: v}})} />
                            <FieldReview label="Check-in" value={extractionResult.data.check_in} type="text" onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, check_in: v}})} />
                            <FieldReview label="Check-out" value={extractionResult.data.check_out} type="text" onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, check_out: v}})} />
                            <div className="col-span-2">
                              <FieldReview label="Dirección" value={extractionResult.data.address} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, address: v}})} />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="pt-8 border-t border-border flex gap-4">
                        <Button variant="ghost" className="flex-1 rounded-2xl py-6 font-bold" onClick={() => setImportStep('upload')}>Descartar</Button>
                        <Button className="flex-2 rounded-2xl py-6 font-black uppercase tracking-widest text-xs" disabled={isSubmitting} onClick={async () => {
                          try {
                            setIsSubmitting(true);
                            const editData = extractionResult.data;
                            const depLoc = editData.departure_location === 'VAL' ? 'VLC' : editData.departure_location;
                            const arrLoc = editData.arrival_location === 'VAL' ? 'VLC' : editData.arrival_location;

                            // Detección de trayecto (Outbound / Return)
                            let tripType = editData.type;
                            const isFromSpain = /VLC|Valencia|MAD|Madrid|ALC|Alicante/i.test(depLoc);
                            const isToFrance = /ORY|Orly|CDG|Paris|Par\u00eds/i.test(arrLoc);
                            const isFromFrance = /ORY|Orly|CDG|Paris|Par\u00eds/i.test(depLoc);
                            const isToSpain = /VLC|Valencia|MAD|Madrid|ALC|Alicante/i.test(arrLoc);

                            if (isFromSpain && isToFrance) tripType = 'outbound';
                            else if (isFromFrance && isToSpain) tripType = 'return';

                            // LIMPIEZA CRÍTICA: Solo enviar campos que existen en la DB
                            const allowedFields = [
                              'id', 'plan_id', 'airline', 'flight_number', 'departure_location', 
                              'arrival_location', 'origin', 'destination', 'departure_time', 
                              'arrival_time', 'reservation_code', 'seat', 'baggage_info', 
                              'is_verified', 'source', 'type', 'notes',
                              'hotel_name', 'confirmation_number', 'address', 'check_in', 'check_out'
                            ];

                            const sanitizedData: any = {};
                            allowedFields.forEach(key => {
                              if (editData[key] !== undefined) sanitizedData[key] = editData[key];
                            });

                            // Aplicar normalizaciones sobre el objeto limpio
                            sanitizedData.departure_location = depLoc;
                            sanitizedData.arrival_location = arrLoc;
                            sanitizedData.origin = depLoc;
                            sanitizedData.destination = arrLoc;
                            sanitizedData.type = tripType;
                            sanitizedData.is_verified = true;
                            sanitizedData.plan_id = selectedPlan.id;
                            
                            // Normalización Crítica de fechas para Supabase (ISO)
                            const toISO = (dateStr: string) => {
                              if (!dateStr) return null;
                              const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/);
                              if (match) {
                                const [, day, month, year, time] = match;
                                return `${year}-${month}-${day}T${time}:00`;
                              }
                              return dateStr;
                            };

                            if (sanitizedData.departure_time) sanitizedData.departure_time = toISO(sanitizedData.departure_time);
                            if (sanitizedData.arrival_time) sanitizedData.arrival_time = toISO(sanitizedData.arrival_time);
                            if (sanitizedData.check_in) sanitizedData.check_in = toISO(sanitizedData.check_in);
                            if (sanitizedData.check_out) sanitizedData.check_out = toISO(sanitizedData.check_out);

                            const tableMap: any = { hotel: 'travel_hotels', flight: 'travel_flights' };
                            const res = await saveItem(tableMap[extractionResult.type], sanitizedData);
                            
                            if (!res || !res.id) {
                              throw new Error('La base de datos rechazó el registro.');
                            }

                            // 2. Upload and link the PDF
                            if (extractionResult.file) {
                              const fileName = `${extractionResult.type}_${Date.now()}.pdf`;
                              const { data: uploadData, error: uploadError } = await supabase.storage
                                .from('travel-documents')
                                .upload(`${selectedPlan.id}/${fileName}`, extractionResult.file);

                              if (uploadError) throw new Error(`Error en storage: ${uploadError.message}`);

                              const { data: { publicUrl } } = supabase.storage
                                .from('travel-documents')
                                .getPublicUrl(uploadData.path);

                              await saveTravelDocument({
                                plan_id: selectedPlan.id,
                                title: sanitizedData.type === 'return' ? 'Billete Vuelta (PDF)' : 'Billete Ida (PDF)',
                                file_url: publicUrl,
                                related_entity: extractionResult.type,
                                related_entity_id: res.id
                              });
                            }

                            setImportStep('upload');
                            setExtractionResult(null);
                            handleManagePlan(selectedPlan);
                          } catch (err: any) {
                             console.error('Error Crítico:', err);
                             const errorMsg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
                             await alert({ 
                               title: 'Error de Guardado', 
                               message: `No se pudo guardar: ${errorMsg}`, 
                               type: 'danger' 
                             });
                          } finally {
                             setIsSubmitting(false);
                          }
                        }}>
                           {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirmar y Guardar'}
                        </Button>
                      </div>
                    </div>
                  )}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Edición de Vuelo */}
      <AnimatePresence>
        {editingFlight && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background border border-border w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl my-8"
            >
              <div className="p-8 border-b border-border flex justify-between items-center bg-muted/20">
                <div>
                  <h3 className="text-2xl font-black text-primary tracking-tighter">Editar Segmento de Vuelo</h3>
                  <p className="text-[10px] text-muted font-black uppercase tracking-widest mt-1">Control Manual de Logística</p>
                </div>
                <Button variant="ghost" className="rounded-full h-10 w-10 p-0" onClick={() => setEditingFlight(null)}>
                  <X size={24} />
                </Button>
              </div>
              
              <form onSubmit={handleSaveFlight} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Tipo de Trayecto</label>
                    <select 
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent appearance-none"
                      value={editingFlight.type}
                      onChange={e => setEditingFlight({...editingFlight, type: e.target.value})}
                    >
                      <option value="outbound">Vuelo Ida</option>
                      <option value="return">Vuelo Vuelta</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Estado de Verificación</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setEditingFlight({...editingFlight, is_verified: true})}
                        className={`flex-1 p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${editingFlight.is_verified ? 'bg-green-500/10 border-green-500 text-green-600' : 'bg-background border-border text-muted'}`}
                      >
                        Verificado
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditingFlight({...editingFlight, is_verified: false})}
                        className={`flex-1 p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${!editingFlight.is_verified ? 'bg-orange-500/10 border-orange-500 text-orange-600' : 'bg-background border-border text-muted'}`}
                      >
                        Pendiente
                      </button>
                    </div>
                  </div>

                  <FieldReview 
                    label="Origen (IATA)" 
                    value={editingFlight.departure_location} 
                    onChange={(v:string) => setEditingFlight({...editingFlight, departure_location: v, origin: v})} 
                  />
                  <FieldReview 
                    label="Destino (IATA)" 
                    value={editingFlight.arrival_location} 
                    onChange={(v:string) => setEditingFlight({...editingFlight, arrival_location: v, destination: v})} 
                  />
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Salida (Fecha/Hora)</label>
                    <input 
                      type="datetime-local" 
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent"
                      value={editingFlight.departure_time?.slice(0, 16)}
                      onChange={e => setEditingFlight({...editingFlight, departure_time: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Llegada (Fecha/Hora)</label>
                    <input 
                      type="datetime-local" 
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent"
                      value={editingFlight.arrival_time?.slice(0, 16)}
                      onChange={e => setEditingFlight({...editingFlight, arrival_time: e.target.value})}
                    />
                  </div>

                  <FieldReview label="Aerolínea" value={editingFlight.airline} onChange={(v:any) => setEditingFlight({...editingFlight, airline: v})} />
                  <FieldReview label="Nº Vuelo" value={editingFlight.flight_number} onChange={(v:any) => setEditingFlight({...editingFlight, flight_number: v})} />
                  <FieldReview label="Localizador" value={editingFlight.reservation_code} onChange={(v:any) => setEditingFlight({...editingFlight, reservation_code: v})} />
                  <FieldReview label="Asiento" value={editingFlight.seat} onChange={(v:any) => setEditingFlight({...editingFlight, seat: v})} />
                  
                  <FieldReview label="Terminal Salida" value={editingFlight.departure_terminal} onChange={(v:any) => setEditingFlight({...editingFlight, departure_terminal: v})} />
                  <FieldReview label="Terminal Llegada" value={editingFlight.arrival_terminal} onChange={(v:any) => setEditingFlight({...editingFlight, arrival_terminal: v})} />
                  
                  <FieldReview label="Duración (min)" type="number" value={editingFlight.duration_minutes} onChange={(v:any) => setEditingFlight({...editingFlight, duration_minutes: parseInt(v) || 0})} />
                  <FieldReview label="Distancia (km)" type="number" value={editingFlight.distance_km} onChange={(v:any) => setEditingFlight({...editingFlight, distance_km: parseInt(v) || 0})} />
                  
                  <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FieldReview label="Cierre Check-in" value={editingFlight.checkin_deadline} onChange={(v:any) => setEditingFlight({...editingFlight, checkin_deadline: v})} />
                    <FieldReview label="Info. Equipaje" value={editingFlight.baggage_info} onChange={(v:any) => setEditingFlight({...editingFlight, baggage_info: v})} />
                  </div>
                </div>

                <div className="pt-6 border-t border-border flex gap-4">
                  <Button variant="ghost" type="button" className="flex-1 rounded-2xl py-6 font-bold" onClick={() => setEditingFlight(null)}>Cancelar</Button>
                  <Button type="submit" className="flex-2 rounded-2xl py-6 font-black uppercase tracking-widest text-xs" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Guardar Cambios'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const FieldReview = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-2">
    <label className="text-[9px] font-black uppercase text-muted tracking-widest px-1 flex justify-between">
      {label}
      {!value && <span className="text-red-500 font-bold">Faltante</span>}
    </label>
    <input 
      type={type}
      className={`w-full bg-background border rounded-xl p-3 text-xs outline-none transition-all ${!value ? 'border-red-500/50 bg-red-500/5' : 'border-border focus:border-accent'}`} 
      value={type === 'datetime-local' ? value?.slice(0, 16) || '' : value || ''} 
      onChange={e => onChange(e.target.value)}
      placeholder={`Ingresar ${label.toLowerCase()}...`}
    />
  </div>
);
