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
  Download,
  QrCode,
  FileSpreadsheet,
  Utensils,
  Smartphone,
  Milestone
} from 'lucide-react';
import { Button } from '@/components/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialog } from '@/context/DialogContext';
import { HotelImportModal } from '@/components/HotelImportModal';

export default function AdminPlansPage() {
  const { getUsers, getContexts } = useAdmin();
  const [isImporting, setIsImporting] = useState(false);
  const [importType, setImportType] = useState('flight_confirmation');
  const [importProvider, setImportProvider] = useState('auto');
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
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [editingFlight, setEditingFlight] = useState<any>(null);
  const [editingHotel, setEditingHotel] = useState<any>(null);
  const [editingDocument, setEditingDocument] = useState<any>(null);
  const [showHotelImport, setShowHotelImport] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedContext, setSelectedContext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supportInfo, setSupportInfo] = useState({ phone: '+34 600 000 000' });
  const [showQuickUser, setShowQuickUser] = useState(false);
  const [quickUser, setQuickUser] = useState({ name: '', surname: '', email: '' });

  useEffect(() => {
    loadData();
  }, []);

  // --- AUTOMATIC FLIGHT CALCULATIONS ---
  useEffect(() => {
    if (!editingFlight) return;
    
    const { departure_time, arrival_time, departure_location, arrival_location } = editingFlight;
    let updates: any = {};
    
    // 1. Duration Calculation
    if (departure_time && arrival_time) {
      const dep = new Date(departure_time);
      const arr = new Date(arrival_time);
      const diffMs = arr.getTime() - dep.getTime();
      const diffMins = Math.max(0, Math.floor(diffMs / 60000));
      
      if (diffMins > 0 && diffMins !== editingFlight.duration_minutes) {
        updates.duration_minutes = diffMins;
      }
    }

    // 2. Distance & Terminals Smart Defaults (VLC <-> ORY)
    const route = `${departure_location?.toUpperCase()}-${arrival_location?.toUpperCase()}`;
    if (route === 'VLC-ORY' && !editingFlight.distance_km) {
      updates = { ...updates, distance_km: 1065, departure_terminal: 'T1', arrival_terminal: '1' };
    } else if (route === 'ORY-VLC' && !editingFlight.distance_km) {
      updates = { ...updates, distance_km: 1065, departure_terminal: '1', arrival_terminal: 'T1' };
    }

    // 3. Default Check-in Deadline (Now handled by UI calculation)
    if (!editingFlight.checkin_deadline) {
      // Keep empty to let UI calculate default (45 or 40 min)
    }

    if (Object.keys(updates).length > 0) {
      setEditingFlight((prev: any) => ({ ...prev, ...updates }));
    }
  }, [editingFlight?.departure_time, editingFlight?.arrival_time, editingFlight?.departure_location, editingFlight?.arrival_location]);

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
          profiles:user_id (nombre, apellidos, email, avatar_url),
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
      const [fullPlan, modulesData] = await Promise.all([
        getAdminPlanForUser(plan.user_id, plan.context_id),
        supabase.from('plan_modules').select('module_id, is_enabled').eq('plan_id', plan.id)
      ]);

      const moduleMap: Record<string, boolean> = {};
      modulesData.data?.forEach(m => {
        moduleMap[m.module_id] = m.is_enabled;
      });

      setEnabledModules(moduleMap);
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
      formData.append('provider', importProvider);
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

      await saveItem('travel_flights', flightData);

      await alert({ title: 'Éxito', message: 'Vuelo actualizado correctamente.', type: 'success' });
      setEditingFlight(null);
      handleManagePlan(selectedPlan);
    } catch (err: any) {
      alert({ title: 'Error', message: err.message, type: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDocument) return;

    try {
      setIsSubmitting(true);
      // Build update payload — only include columns that exist in schema.
      // Run migration_jp_platform.sql to enable full editing.
      const updatePayload: Record<string, any> = {
        notes: editingDocument.notes,
      };
      // These fields require migration (ADD COLUMN IF NOT EXISTS):
      if (editingDocument.display_title !== undefined)
        updatePayload.display_title = editingDocument.display_title;
      if (editingDocument.document_type !== undefined)
        updatePayload.document_type = editingDocument.document_type;
      if (editingDocument.description !== undefined)
        updatePayload.description = editingDocument.description;
      if (editingDocument.related_flight_id !== undefined)
        updatePayload.related_flight_id = editingDocument.related_flight_id || null;
      if (editingDocument.related_hotel_stay_id !== undefined)
        updatePayload.related_hotel_stay_id = editingDocument.related_hotel_stay_id || null;
      if (editingDocument.visible_to_client !== undefined)
        updatePayload.visible_to_client = editingDocument.visible_to_client;
      if (editingDocument.qr_code !== undefined)
        updatePayload.qr_code = editingDocument.qr_code;
      if (editingDocument.passenger_name !== undefined)
        updatePayload.passenger_name = editingDocument.passenger_name;
      if (editingDocument.seat_assignment !== undefined)
        updatePayload.seat_assignment = editingDocument.seat_assignment;
      if (editingDocument.boarding_group !== undefined)
        updatePayload.boarding_group = editingDocument.boarding_group;

      await saveTravelDocument({
        id: editingDocument.id,
        plan_id: selectedPlan.id,
        ...updatePayload
      });

      await alert({ title: 'Éxito', message: 'Documento actualizado.', type: 'success' });
      setEditingDocument(null);
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
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent overflow-hidden">
                {plan.profiles?.avatar_url ? (
                  <img src={plan.profiles.avatar_url} alt={plan.profiles.nombre} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={24} />
                )}
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
    const hotels = selectedPlan.hotel_stays || [];
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
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="rounded-xl px-4 flex items-center gap-2 border-accent/20 text-accent hover:bg-accent hover:text-white" onClick={() => setShowHotelImport(true)}>
              <FileSpreadsheet size={18} /> Importar Alojamientos Excel
            </Button>
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

        {/* Módulos Activos */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Settings size={14} className="text-accent" />
            <h3 className="text-xs font-black uppercase text-muted tracking-widest">Funcionalidades Activas</h3>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
            {[
              { id: 'flights', label: 'Vuelos', icon: Plane },
              { id: 'hotels', label: 'Hoteles', icon: Hotel },
              { id: 'transfers', label: 'Transfers', icon: Car },
              { id: 'restaurants', label: 'Cenas', icon: Utensils },
              { id: 'agenda', label: 'Agenda', icon: Calendar },
              { id: 'documents', label: 'Docs', icon: FileText },
              { id: 'mobility', label: 'Movilidad', icon: Smartphone },
              { id: 'map', label: 'Mapa', icon: MapPin },
              { id: 'distances', label: 'Distancias', icon: Milestone }
            ].map((mod) => {
              const isEnabled = enabledModules[mod.id] !== false; // Default to true if not set
              
              return (
                <button
                  key={mod.id}
                  onClick={async () => {
                    const nextState = !isEnabled;
                    setEnabledModules(prev => ({ ...prev, [mod.id]: nextState }));
                    try {
                      const { error } = await supabase
                        .from('plan_modules')
                        .upsert({
                          plan_id: selectedPlan.id,
                          module_id: mod.id,
                          is_enabled: nextState
                        }, { onConflict: 'plan_id,module_id' });
                      if (error) {
                        console.error('Supabase Module Error:', error);
                        throw new Error(error.message);
                      }
                    } catch (err: any) {
                      console.error('Error toggling module:', err);
                      setEnabledModules(prev => ({ ...prev, [mod.id]: isEnabled })); // Rollback
                      alert({ title: 'Error de Configuración', message: `No se pudo cambiar el módulo: ${err.message}`, type: 'danger' });
                    }
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all gap-2 ${
                    isEnabled 
                      ? 'bg-accent/5 border-accent/30 text-accent shadow-sm' 
                      : 'bg-background border-border text-muted hover:border-accent/20'
                  }`}
                >
                  <mod.icon size={18} className={isEnabled ? 'animate-in zoom-in-75 duration-300' : 'opacity-40'} />
                  <span className="text-[9px] font-bold uppercase tracking-tighter">{mod.label}</span>
                </button>
              );
            })}
          </div>
        </section>

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
              const flightDocs = selectedPlan.documents?.filter((d: any) => 
                (d.related_entity === 'flight' && d.related_entity_id === flight.id) || 
                (d.related_flight_id === flight.id)
              ) || [];
              
              return (
                <FlightCard 
                  key={flight.id} 
                  flight={flight} 
                  role="admin"
                  actions={
                    <>
                      {flightDocs.map((doc: any) => (
                        <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer" title={doc.display_title || doc.title}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            {doc.document_type === 'boarding_pass' ? (
                              <QrCode size={14} className="text-emerald-500" />
                            ) : (
                              <FileText size={14} className="text-accent" />
                            )}
                          </Button>
                        </a>
                      ))}
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
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-black uppercase text-muted tracking-widest flex items-center gap-2">
              <Hotel size={14} className="text-accent" /> Alojamiento
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-[10px] font-black uppercase tracking-widest text-accent hover:bg-accent/10 rounded-xl px-3"
              onClick={() => setEditingHotel({
                plan_id: selectedPlan.id,
                guest_name: `${selectedPlan.profiles?.nombre || ''} ${selectedPlan.profiles?.apellidos || ''}`.trim(),
                hotel_name: '',
                booking_reference: '',
                check_in: '',
                check_out: '',
                room_group_id: '',
                breakfast_included: false,
                status: 'confirmed',
                source: 'manual'
              })}
            >
              <Plus size={14} /> Añadir Hotel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Agrupación visual por habitación para el admin */}
            {(() => {
              const grouped: Record<string, any[]> = {};
              hotels.forEach((h: any) => {
                const gid = h.room_group_id || `single-${h.id}`;
                if (!grouped[gid]) grouped[gid] = [];
                grouped[gid].push(h);
              });

              return Object.entries(grouped).map(([gid, stays]: [string, any[]]) => {
                const hotel = stays[0];
                const isShared = stays.length > 1 || hotel.room_group_id;

                return (
                  <div key={gid} className={`bg-background border rounded-2xl overflow-hidden group hover:border-accent/30 transition-all ${isShared ? 'border-accent/20' : 'border-border'}`}>
                    <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                          <Hotel size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground line-clamp-1">{hotel.hotel_name || 'Hotel S/N'}</span>
                            {hotel.room_group_id && (
                              <span className="px-1.5 py-0.5 rounded-md bg-accent/10 text-accent text-[8px] font-black uppercase">Grupo: {hotel.room_group_id}</span>
                            )}
                          </div>
                          <p className="text-[9px] text-muted font-medium">
                            {stays.map(s => s.guest_name).join(' + ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {stays.map(s => (
                          <div key={s.id} className="flex gap-1 border-l border-border pl-2 ml-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingHotel(s)}>
                              <Edit2 size={12} className="text-muted hover:text-accent" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete('hotel', s.id)}>
                              <Trash2 size={12} className="text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      {hotel.address && (
                        <div className="flex items-start gap-3">
                          <MapPin size={12} className="text-muted mt-0.5 shrink-0" />
                          <p className="text-[10px] font-medium text-muted">{hotel.address}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[9px] font-black text-muted uppercase tracking-widest">Check-in</p>
                          <p className="text-xs font-bold">{hotel.check_in ? new Date(hotel.check_in).toLocaleDateString('es-ES') : 'S/F'}</p>
                          {hotel.check_in_time && <p className="text-[9px] text-accent font-bold">Desde {hotel.check_in_time}</p>}
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-muted uppercase tracking-widest">Check-out</p>
                          <p className="text-xs font-bold">{hotel.check_out ? new Date(hotel.check_out).toLocaleDateString('es-ES') : 'S/F'}</p>
                          {hotel.check_out_time && <p className="text-[9px] text-accent font-bold">Hasta {hotel.check_out_time}</p>}
                        </div>
                        {hotel.room_type && (
                          <div>
                            <p className="text-[9px] font-black text-muted uppercase tracking-widest">Habitación</p>
                            <p className="text-xs font-bold">{hotel.room_type}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[9px] font-black text-muted uppercase tracking-widest">Desayuno</p>
                          <p className={`text-xs font-bold ${hotel.breakfast_included ? 'text-emerald-500' : 'text-muted'}`}>
                            {hotel.breakfast_included ? 'Incluido' : 'No incluido'}
                          </p>
                        </div>
                      </div>
                      {hotel.booking_reference && (
                        <div className="pt-2 border-t border-border/50">
                          <p className="text-[9px] font-black text-muted uppercase tracking-widest">Localizador</p>
                          <p className="text-xs font-mono font-bold text-accent">{hotel.booking_reference}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
            {hotels.length === 0 && (
              <div className="col-span-full border border-dashed border-border rounded-2xl p-10 text-center space-y-4">
                <Hotel size={32} className="text-muted/30 mx-auto" />
                <div>
                  <p className="text-xs text-muted font-bold">No hay alojamientos registrados.</p>
                  <p className="text-[10px] text-muted/60 font-medium mt-1">Añade uno manualmente o importa una reserva desde PDF.</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-[10px] font-black uppercase tracking-widest text-accent hover:bg-accent/10 rounded-xl mx-auto"
                  onClick={() => setEditingHotel({
                    plan_id: selectedPlan.id,
                    guest_name: `${selectedPlan.profiles?.nombre || ''} ${selectedPlan.profiles?.apellidos || ''}`.trim(),
                    hotel_name: '',
                    booking_reference: '',
                    check_in: '',
                    check_out: '',
                    breakfast_included: false,
                    status: 'confirmed',
                    source: 'manual'
                  })}
                >
                  <Plus size={14} /> Añadir Primer Hotel
                </Button>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase text-muted tracking-widest flex items-center gap-2">
            <FileText size={14} className="text-accent" /> Documentación
          </h3>
          <div className="bg-background border border-border rounded-2xl divide-y divide-border">
            {selectedPlan.documents?.map((doc: any) => (
              <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${doc.visible_to_client ? 'bg-accent/5 text-accent' : 'bg-muted text-muted-foreground opacity-50'}`}>
                    <FileBadge size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-foreground">{doc.display_title || doc.title}</p>
                      {!doc.visible_to_client && <span className="text-[8px] font-black uppercase bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Privado</span>}
                    </div>
                    <p className="text-[9px] text-muted font-black uppercase tracking-widest">
                      {doc.document_type === 'boarding_pass' ? 'Tarjeta de Embarque' : 
                       doc.document_type === 'flight_confirmation' ? 'Reserva de Vuelo' : 
                       doc.document_type === 'hotel' ? 'Reserva de Hotel' : 
                       (doc.document_type || 'Documento')} {doc.description ? `· ${doc.description}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="rounded-lg h-8 w-8 p-0">
                      <Download size={16} />
                    </Button>
                  </a>
                  <Button variant="ghost" size="sm" className="rounded-lg h-8 w-8 p-0" onClick={() => setEditingDocument(doc)}>
                    <Edit2 size={14} className="text-muted" />
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-lg h-8 w-8 p-0" onClick={() => handleDelete('document', doc.id)}>
                    <Trash2 size={16} className="text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            {!selectedPlan.documents?.length && (
              <div className="p-10 text-center text-xs text-muted">No hay documentos registrados para este plan.</div>
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
        const tableMap: any = { flight: 'travel_flights', hotel: 'hotel_stays', transfer: 'travel_transfers', document: 'travel_documents' };
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
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-black uppercase text-muted tracking-widest">Pasajero / Usuario</label>
                          <button 
                            onClick={() => setShowQuickUser(!showQuickUser)} 
                            className="text-[9px] font-bold text-accent hover:underline"
                          >
                            {showQuickUser ? '- Cancelar' : '+ Alta Rápida'}
                          </button>
                        </div>
                        <select 
                          disabled={showQuickUser}
                          className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent appearance-none disabled:opacity-50"
                          value={selectedUser}
                          onChange={e => setSelectedUser(e.target.value)}
                        >
                          <option value="">Seleccionar...</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellidos}</option>)}
                        </select>
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

                    {showQuickUser && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-5 rounded-2xl bg-accent/5 border border-accent/20 space-y-4"
                      >
                        <p className="text-[10px] font-black uppercase text-accent tracking-widest">Datos del Nuevo Contacto</p>
                        <div className="grid grid-cols-2 gap-4">
                          <input 
                            placeholder="Nombre" 
                            className="bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent"
                            value={quickUser.name}
                            onChange={e => setQuickUser({...quickUser, name: e.target.value})}
                          />
                          <input 
                            placeholder="Apellidos" 
                            className="bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent"
                            value={quickUser.surname}
                            onChange={e => setQuickUser({...quickUser, surname: e.target.value})}
                          />
                        </div>
                        <input 
                          placeholder="Email (Obligatorio)" 
                          className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent"
                          value={quickUser.email}
                          onChange={e => setQuickUser({...quickUser, email: e.target.value})}
                        />
                        <p className="text-[9px] text-muted italic">Se creará el perfil en modo borrador y podrás asignarle la logística de inmediato.</p>
                      </motion.div>
                    )}
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Teléfono de Soporte 24h</label>
                  <input 
                    type="text" 
                    className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent"
                    value={supportInfo.phone || ''}
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
                  try {
                    setIsSubmitting(true);
                    
                    let userId = selectedUser;
                    
                    // 1. If quick user, create them first
                    if (showQuickUser) {
                      const { data: { session: currentSession } } = await supabase.auth.getSession();
                      const response = await fetch('/api/admin/create-user', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${currentSession?.access_token}`
                        },
                        body: JSON.stringify({
                          ...quickUser,
                          sendInvite: false // Create in draft
                        })
                      });
                      const result = await response.json();
                      if (!response.ok) throw new Error(result.error || 'Error al crear usuario rápido');
                      userId = result.userId;
                    }

                    if (!userId || !selectedContext) return;

                    const { data, error } = await supabase.from('contact_travel_plans').insert({
                      user_id: userId,
                      context_id: selectedContext,
                      support_phone: supportInfo.phone,
                      status: 'active',
                      source: 'manual'
                    }).select().single();
                    if (error) throw error;
                    await alert({ title: 'Éxito', message: 'Plan operativo y usuario creados.', type: 'success' });
                    setIsCreating(false);
                    setShowQuickUser(false);
                    setQuickUser({ name: '', surname: '', email: '' });
                    loadData();
                  } catch (err: any) {
                    await alert({ title: 'Error', message: err.message, type: 'danger' });
                  } finally {
                    setIsSubmitting(false);
                  }
                }} disabled={isSubmitting || (showQuickUser && !quickUser.email)}>
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
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Tipo de Documento</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'flight_confirmation', label: 'Reserva Vuelo', icon: Plane },
                              { id: 'boarding_pass', label: 'Tarjeta Embarque', icon: QrCode },
                              { id: 'hotel_booking', label: 'Reserva Hotel', icon: Hotel },
                            ].map((item) => (
                              <button 
                                key={item.id}
                                onClick={() => setImportType(item.id)} 
                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${importType === item.id ? 'border-accent bg-accent/5' : 'border-border bg-muted/10 opacity-60 hover:opacity-100'}`}
                              >
                                <item.icon size={20} className={importType === item.id ? 'text-accent' : 'text-muted'} />
                                <span className="text-[8px] font-black uppercase tracking-widest text-center">{item.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Proveedor / Aerolínea</label>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { id: 'auto', label: 'Auto' },
                              { id: 'vueling', label: 'Vueling' },
                              { id: 'air_france', label: 'Air France' },
                              { id: 'iberia', label: 'Iberia' },
                              { id: 'volotea', label: 'Volotea' },
                              { id: 'booking', label: 'Booking' },
                              { id: 'hoteles_com', label: 'Hotels.com' },
                            ].map((item) => (
                              <button 
                                key={item.id}
                                onClick={() => setImportProvider(item.id)} 
                                className={`p-3 rounded-xl border-2 transition-all text-center ${importProvider === item.id ? 'border-accent bg-accent/10 text-accent font-black' : 'border-border bg-muted/5 text-muted text-[9px] font-bold uppercase'}`}
                              >
                                <span className={importProvider === item.id ? 'text-[9px]' : ''}>{item.label}</span>
                              </button>
                            ))}
                          </div>
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

                      {/* DEBUG PANEL TEMPORAL */}
                      <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-2">
                        <p className="text-[9px] font-black uppercase text-muted tracking-widest">Panel de Depuración</p>
                        <div className="grid grid-cols-2 gap-2 text-[8px] font-mono">
                          <div className="text-muted">Tipo: <span className="text-accent">{extractionResult.type}</span></div>
                          <div className="text-muted">Raw Length: <span className="text-accent">{extractionResult.rawText?.length || 0}</span></div>
                          <div className="text-muted">QR Detectado: <span className={extractionResult.qr_detected ? 'text-green-500' : 'text-orange-500'}>{extractionResult.qr_detected ? 'SÍ' : 'NO'}</span></div>
                          <div className="text-muted">QR Decodificado: <span className={extractionResult.qr_decoded ? 'text-green-500' : 'text-red-500'}>{extractionResult.qr_decoded ? 'SÍ' : 'NO'}</span></div>
                        </div>
                        {extractionResult.qr_decoded && (
                          <div className="text-[7px] font-mono text-green-500/70 overflow-hidden whitespace-nowrap text-ellipsis bg-green-500/5 p-1 rounded">
                            PAYLOAD: {extractionResult.qr_raw_payload}
                          </div>
                        )}
                        <div className="text-[8px] font-mono text-muted overflow-hidden whitespace-nowrap text-ellipsis">
                          Campos: {Object.keys(extractionResult.data).filter(k => !!extractionResult.data[k]).join(', ')}
                        </div>
                        {(extractionResult as any).error && (
                          <p className="text-red-500 text-[9px] font-bold">ERROR: {(extractionResult as any).error}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        {/* CASO 1: VUELO (RESERVA/CONFIRMACIÓN) */}
                        {extractionResult.type === 'flight' && (
                          <>
                            <div className="col-span-2 bg-blue-500/5 p-4 rounded-xl border border-blue-500/20 mb-2">
                              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Confirmación Detectada: {extractionResult.data.airline}</p>
                              <p className="text-xs font-bold text-foreground">Reserva logística para {extractionResult.data.passenger_name || 'Pasajero'}</p>
                            </div>
                            <FieldReview label="Pasajero" value={extractionResult.data.passenger_name} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, passenger_name: v}})} />
                            <FieldReview label="Aerolínea" value={extractionResult.data.airline} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, airline: v}})} />
                            <FieldReview label="Nº de Vuelo" value={extractionResult.data.flight_number} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, flight_number: v}})} />
                            <FieldReview label="Cód. Reserva" value={extractionResult.data.booking_reference} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, booking_reference: v}})} />
                            <FieldReview label="Origen" value={extractionResult.data.departure_location} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, departure_location: v}})} />
                            <FieldReview label="Destino" value={extractionResult.data.arrival_location} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, arrival_location: v}})} />
                            <FieldReview label="Salida (Local)" value={extractionResult.data.departure_time} type="datetime-local" onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, departure_time: v}})} />
                            <FieldReview label="Llegada (Local)" value={extractionResult.data.arrival_time} type="datetime-local" onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, arrival_time: v}})} />
                            <FieldReview label="Asiento" value={extractionResult.data.seat} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, seat: v}})} />
                            <FieldReview label="Equipaje" value={extractionResult.data.baggage_info} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, baggage_info: v}})} />
                          </>
                        )}

                        {/* CASO 2: HOTEL */}
                        {extractionResult.type === 'hotel' && (
                          <>
                            <FieldReview label="Hotel" value={extractionResult.data.hotel_name} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, hotel_name: v}})} />
                            <FieldReview label="Confirmación" value={extractionResult.data.confirmation_number} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, confirmation_number: v}})} />
                            <FieldReview label="Check-in" value={extractionResult.data.check_in} type="datetime-local" onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, check_in: v}})} />
                            <FieldReview label="Check-out" value={extractionResult.data.check_out} type="datetime-local" onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, check_out: v}})} />
                            <div className="col-span-2">
                              <FieldReview label="Dirección" value={extractionResult.data.address} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, address: v}})} />
                            </div>
                          </>
                        )}

                        {/* CASO 3: TARJETA DE EMBARQUE */}
                        {extractionResult.type === 'boarding_pass' && (
                          <>
                            <div className="col-span-2 bg-accent/5 p-4 rounded-xl border border-accent/20 mb-2">
                              <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">Tarjeta Detectada: {extractionResult.data.airline}</p>
                              <p className="text-xs font-bold text-foreground">Datos operativos para {extractionResult.data.passenger_name || 'Pasajero'}</p>
                            </div>
                            <FieldReview label="Pasajero" value={extractionResult.data.passenger_name} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, passenger_name: v}})} />
                            <FieldReview label="Vuelo" value={extractionResult.data.flight_number} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, flight_number: v}})} />
                            <FieldReview label="Origen (IATA)" value={extractionResult.data.departure_location || extractionResult.data.origin} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, departure_location: v}})} />
                            <FieldReview label="Destino (IATA)" value={extractionResult.data.arrival_location || extractionResult.data.destination} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, arrival_location: v}})} />
                            <FieldReview label="Salida" value={extractionResult.data.departure_time} type="datetime-local" onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, departure_time: v}})} />
                            <FieldReview label="Llegada" value={extractionResult.data.arrival_time} type="datetime-local" onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, arrival_time: v}})} />
                            <FieldReview label="Asiento" value={extractionResult.data.seat} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, seat: v}})} />
                            <FieldReview label="Puerta (Gate)" value={extractionResult.data.gate} optional={true} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, gate: v}})} />
                            <FieldReview label="Grupo" value={extractionResult.data.boarding_group} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, boarding_group: v}})} />
                            <FieldReview label="Localizador" value={extractionResult.data.booking_reference} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, booking_reference: v}})} />
                            <div className="col-span-2">
                              <FieldReview label="Contenido QR (BCBP)" value={extractionResult.data.qr_code} optional={true} onChange={(v:any) => setExtractionResult({...extractionResult, data: {...extractionResult.data, qr_code: v}})} />
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
                            const depLoc = (editData.departure_location || editData.origin || '').toUpperCase() === 'VAL' ? 'VLC' : (editData.departure_location || editData.origin);
                            const arrLoc = (editData.arrival_location || editData.destination || '').toUpperCase() === 'VAL' ? 'VLC' : (editData.arrival_location || editData.destination);

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
                              'is_verified', 'source', 'type', 'notes', 'gate', 'boarding_group', 'qr_code',
                              'hotel_name', 'confirmation_number', 'address', 'check_in', 'check_out'
                            ];

                            const sanitizedData: any = {};
                            allowedFields.forEach(key => {
                              if (editData[key] !== undefined) sanitizedData[key] = editData[key];
                            });

                            // SMART MATCH LOGIC: Find target plan by passenger name
                            let targetPlanId = selectedPlan.id;
                            const guestName = extractionResult.data.passenger_name || (extractionResult.data.passengers ? extractionResult.data.passengers.split(',')[0].trim() : null);

                            if (guestName) {
                              const { data: matchedProfiles } = await supabase.from('profiles').select('id, nombre, apellidos');
                              const profile = matchedProfiles?.find(p => {
                                const fullName = `${p.nombre || ''} ${p.apellidos || ''}`.trim().toLowerCase();
                                return fullName === guestName.toLowerCase();
                              });

                              if (profile) {
                                // Check if user has a plan for this context
                                const { data: existingPlan } = await supabase
                                  .from('contact_travel_plans')
                                  .select('id')
                                  .eq('user_id', profile.id)
                                  .eq('context_id', selectedPlan.context_id)
                                  .is('deleted_at', null)
                                  .maybeSingle();
                                
                                if (existingPlan) {
                                  targetPlanId = existingPlan.id;
                                } else {
                                  const { data: newPlan } = await supabase
                                    .from('contact_travel_plans')
                                    .insert({
                                      user_id: profile.id,
                                      context_id: selectedPlan.context_id,
                                      status: 'active',
                                      source: 'pdf_import_auto'
                                    })
                                    .select('id')
                                    .single();
                                  if (newPlan) targetPlanId = newPlan.id;
                                }
                              }
                            }

                            // Aplicar normalizaciones sobre el objeto limpio
                            sanitizedData.departure_location = depLoc;
                            sanitizedData.arrival_location = arrLoc;
                            sanitizedData.origin = depLoc;
                            sanitizedData.destination = arrLoc;
                            sanitizedData.type = tripType;
                            sanitizedData.is_verified = true;
                            sanitizedData.plan_id = targetPlanId;
                            
                            const toISO = (dateStr: string) => {
                               if (!dateStr) return null;
                               // 1. Si ya es ISO parcial (YYYY-MM-DDTHH:mm), completar
                               if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateStr)) return `${dateStr}:00`;
                               if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateStr)) return dateStr;
                               
                               // 2. Formato DD/MM/YYYY con o sin hora
                               const match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}:\d{2}))?/);
                               if (match) {
                                 const day = match[1].padStart(2, '0');
                                 const month = match[2].padStart(2, '0');
                                 const year = match[3];
                                 const time = match[4] || '12:00';
                                 return `${year}-${month}-${day}T${time}:00`;
                               }

                               // 3. Si solo es hora HH:mm (fallo de extracción de fecha)
                               if (/^\d{1,2}:\d{2}$/.test(dateStr)) {
                                 const today = new Date().toISOString().split('T')[0];
                                 return `${today}T${dateStr.padStart(5, '0')}:00`;
                               }

                               return dateStr;
                            };

                            if (sanitizedData.departure_time) sanitizedData.departure_time = toISO(sanitizedData.departure_time);
                            if (sanitizedData.arrival_time) sanitizedData.arrival_time = toISO(sanitizedData.arrival_time);
                            if (sanitizedData.check_in) sanitizedData.check_in = toISO(sanitizedData.check_in);
                            if (sanitizedData.check_out) sanitizedData.check_out = toISO(sanitizedData.check_out);

                            let relatedFlightId = null;

                            if (extractionResult.type === 'boarding_pass' || extractionResult.type === 'flight') {
                              // 1. Try to find existing flight
                              const { data: planFlights } = await supabase.from('travel_flights').select('*').eq('plan_id', targetPlanId).is('deleted_at', null);
                              const existingFlight = planFlights?.find((f: any) => 
                                f.flight_number === sanitizedData.flight_number && 
                                (f.departure_location === sanitizedData.origin || f.origin === sanitizedData.origin)
                              );

                              if (existingFlight) {
                                relatedFlightId = existingFlight.id;
                                // UPDATE flight with new data
                                const updatePayload: any = {
                                   reservation_code: sanitizedData.booking_reference || existingFlight.reservation_code,
                                   last_updated_at: new Date().toISOString()
                                };
                                if (sanitizedData.seat) updatePayload.seat = sanitizedData.seat;
                                if (sanitizedData.gate) updatePayload.gate = sanitizedData.gate;
                                if (sanitizedData.boarding_group) updatePayload.boarding_group = sanitizedData.boarding_group;
                                if (sanitizedData.baggage_info) updatePayload.baggage_info = sanitizedData.baggage_info;
                                if (sanitizedData.departure_time) updatePayload.departure_time = sanitizedData.departure_time;
                                if (sanitizedData.arrival_time) updatePayload.arrival_time = sanitizedData.arrival_time;
                                if (extractionResult.type === 'boarding_pass') updatePayload.source = 'boarding_pass_import';
                                
                                await saveItem('travel_flights', { ...updatePayload, id: relatedFlightId });
                              } else {
                                // 2. Create flight if doesn't exist
                                const newFlight = await saveItem('travel_flights', {
                                  plan_id: targetPlanId,
                                  airline: sanitizedData.airline || 'Vueling',
                                  flight_number: sanitizedData.flight_number,
                                  departure_location: sanitizedData.origin,
                                  arrival_location: sanitizedData.destination,
                                  departure_time: sanitizedData.departure_time,
                                  arrival_time: sanitizedData.arrival_time,
                                  reservation_code: sanitizedData.booking_reference,
                                  seat: sanitizedData.seat,
                                  gate: sanitizedData.gate,
                                  boarding_group: sanitizedData.boarding_group,
                                  baggage_info: sanitizedData.baggage_info,
                                  is_verified: true,
                                  source: extractionResult.type === 'boarding_pass' ? 'boarding_pass_import' : 'flight_confirmation_import',
                                  type: tripType
                                });
                                relatedFlightId = newFlight.id;
                              }
                            } else {
                              const tableMap: any = { hotel: 'hotel_stays' };
                              const res = await saveItem(tableMap[extractionResult.type], sanitizedData);
                              if (!res || !res.id) throw new Error('La base de datos rechazó el registro.');
                            }

                            // 2. Upload and link the PDF
                            if (extractionResult.file) {
                              const fileName = `${extractionResult.type}_${Date.now()}.pdf`;
                              const { data: uploadData, error: uploadError } = await supabase.storage
                                .from('travel-documents')
                                .upload(`${targetPlanId}/${fileName}`, extractionResult.file);

                              if (uploadError) throw new Error(`Error en storage: ${uploadError.message}`);

                              const { data: { publicUrl } } = supabase.storage
                                .from('travel-documents')
                                .getPublicUrl(uploadData.path);

                               // Título inteligente
                               let suggestedTitle = sanitizedData.display_title || `Documento ${extractionResult.type}`;
                               if (extractionResult.type === 'boarding_pass') {
                                 suggestedTitle = `Tarjeta de Embarque · ${sanitizedData.airline || 'Vueling'} ${sanitizedData.flight_number}`;
                               } else if (sanitizedData.airline && sanitizedData.flight_number) {
                                 suggestedTitle = `Billete · ${sanitizedData.airline} ${sanitizedData.flight_number}`;
                               }

                               await saveTravelDocument({
                                 plan_id: targetPlanId,
                                 title: suggestedTitle,
                                 display_title: suggestedTitle,
                                 document_type: extractionResult.type === 'boarding_pass' ? 'boarding_pass' : (extractionResult.type === 'flight' ? 'flight_confirmation' : 'general'),
                                 description: extractionResult.type === 'boarding_pass' 
                                   ? `${sanitizedData.origin} → ${sanitizedData.destination} · Asiento ${sanitizedData.seat}`
                                   : (sanitizedData.airline?.toLowerCase().includes('vueling') ? 'Confirmación de reserva' : ''),
                                 file_url: publicUrl,
                                 related_flight_id: relatedFlightId,
                                 passenger_name: sanitizedData.passenger_name,
                                 seat_assignment: sanitizedData.seat,
                                 boarding_group: sanitizedData.boarding_group,
                                 qr_code: extractionResult.qr_raw_payload || sanitizedData.qr_code,
                                 qr_decoded: extractionResult.qr_decoded || false,
                                 qr_raw_payload: extractionResult.qr_raw_payload || null,
                                 visible_to_client: true
                               });
                            }

                            setImportStep('upload');
                            setExtractionResult(null);
                            handleManagePlan(selectedPlan);
                          } catch (err: any) {
                              console.error('Error Crítico Detallado:', err);
                              
                              let errorMsg = 'Error desconocido';
                              
                              // Extraer mensaje de error de forma robusta
                              if (typeof err === 'string') {
                                errorMsg = err;
                              } else if (err?.message) {
                                errorMsg = err.message;
                              } else if (err?.error_description) {
                                errorMsg = err.error_description;
                              } else if (err?.details) {
                                errorMsg = err.details;
                              } else if (err?.code) {
                                errorMsg = `Error code: ${err.code}`;
                              } else {
                                try {
                                  const stringified = JSON.stringify(err);
                                  errorMsg = stringified !== '{}' ? stringified : String(err);
                                } catch (e) {
                                  errorMsg = String(err);
                                }
                              }

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

      {/* Modal de Edición de Hotel */}
      <AnimatePresence>
        {editingHotel && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background border border-border w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl my-8"
            >
              <div className="p-8 border-b border-border flex justify-between items-center bg-muted/20">
                <div>
                  <h3 className="text-2xl font-black text-primary tracking-tighter">Gestionar Alojamiento</h3>
                  <p className="text-[10px] text-muted font-black uppercase tracking-widest mt-1">Detalles Premium del Hotel</p>
                </div>
                <Button variant="ghost" className="rounded-full h-10 w-10 p-0" onClick={() => setEditingHotel(null)}>
                  <X size={24} />
                </Button>
              </div>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                try {
                  // Validación de campos obligatorios
                  if (!editingHotel.hotel_name || !editingHotel.check_in || !editingHotel.check_out || !editingHotel.booking_reference) {
                    throw new Error('Nombre, Fechas y Localizador son obligatorios.');
                  }
                  // Save to hotel_stays (primary table)
                  const hotelPayload = {
                    ...editingHotel,
                    // hotel_stays uses guest_name (map from traveler_name if present)
                    guest_name: editingHotel.guest_name || editingHotel.traveler_name || '',
                  };
                  delete hotelPayload.traveler_name; // not a column in hotel_stays
                  await saveItem('hotel_stays', hotelPayload);
                  setEditingHotel(null);
                  handleManagePlan(selectedPlan);
                } catch (err: any) {
                  alert({ title: 'Error', message: err.message || 'No se pudo guardar el hotel.', type: 'danger' });
                } finally {
                  setIsSubmitting(false);
                }
              }} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <FieldReview label="Huésped Principal" value={editingHotel.guest_name} onChange={(v:any) => setEditingHotel({...editingHotel, guest_name: v})} />
                  </div>
                  
                  <div className="col-span-2">
                    <FieldReview label="Nombre del Hotel" value={editingHotel.hotel_name} onChange={(v:any) => setEditingHotel({...editingHotel, hotel_name: v})} />
                  </div>

                  <div className="col-span-2">
                    <FieldReview label="Dirección Completa" value={editingHotel.address} onChange={(v:any) => setEditingHotel({...editingHotel, address: v})} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Entrada (Fecha)</label>
                    <input 
                      type="date" 
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent"
                      value={editingHotel.check_in?.split('T')[0] || ''}
                      onChange={e => setEditingHotel({...editingHotel, check_in: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Salida (Fecha)</label>
                    <input 
                      type="date" 
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent"
                      value={editingHotel.check_out?.split('T')[0] || ''}
                      onChange={e => setEditingHotel({...editingHotel, check_out: e.target.value})}
                    />
                  </div>

                  <FieldReview label="Check-in (Hora)" value={editingHotel.check_in_time} onChange={(v:any) => setEditingHotel({...editingHotel, check_in_time: v})} placeholder="Ej: 15:00" />
                  <FieldReview label="Check-out (Hora)" value={editingHotel.check_out_time} onChange={(v:any) => setEditingHotel({...editingHotel, check_out_time: v})} placeholder="Ej: 12:00" />

                  <FieldReview label="Tipo de Habitación" value={editingHotel.room_type} onChange={(v:any) => setEditingHotel({...editingHotel, room_type: v})} />
                  <FieldReview label="Localizador / Ref" value={editingHotel.booking_reference} onChange={(v:any) => setEditingHotel({...editingHotel, booking_reference: v})} />

                  <div className="col-span-2 space-y-2">
                    <FieldReview 
                      label="Grupo de Habitación" 
                      value={editingHotel.room_group_id} 
                      onChange={(v:any) => setEditingHotel({...editingHotel, room_group_id: v})} 
                      placeholder="Ej: GRUPO_A o DOBLE_JUAN_PEDRO"
                    />
                    <p className="text-[9px] text-muted font-medium px-1">
                      Usa el mismo código para agrupar varios huéspedes en la misma habitación.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Desayuno</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setEditingHotel({...editingHotel, breakfast_included: true})}
                        className={`flex-1 p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${editingHotel.breakfast_included ? 'bg-accent/10 border-accent text-accent' : 'bg-background border-border text-muted'}`}
                      >
                        Incluido
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditingHotel({...editingHotel, breakfast_included: false})}
                        className={`flex-1 p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${!editingHotel.breakfast_included ? 'bg-muted/10 border-border text-muted' : 'bg-background border-border text-muted'}`}
                      >
                        No Incluido
                      </button>
                    </div>
                  </div>

                  <FieldReview label="Teléfono Hotel" value={editingHotel.phone} onChange={(v:any) => setEditingHotel({...editingHotel, phone: v})} />
                </div>

                <div className="pt-6 border-t border-border flex gap-4">
                  <Button variant="ghost" type="button" className="flex-1 rounded-2xl py-6 font-bold" onClick={() => setEditingHotel(null)}>Cancelar</Button>
                  <Button type="submit" className="flex-2 rounded-2xl py-6 font-black uppercase tracking-widest text-xs" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Guardar Hotel'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Edición de Documento */}
      <AnimatePresence>
        {editingDocument && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-background border border-border w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-border flex justify-between items-center bg-muted/20">
                <div>
                  <h3 className="text-2xl font-black text-primary tracking-tighter">Editar Documento</h3>
                  <p className="text-[10px] text-muted font-black uppercase tracking-widest mt-1">Metadatos y Visibilidad</p>
                </div>
                <Button variant="ghost" className="rounded-full h-10 w-10 p-0" onClick={() => setEditingDocument(null)}>
                  <X size={24} />
                </Button>
              </div>
              
              <form onSubmit={handleSaveDocument} className="p-8 space-y-6">
                <div className="space-y-4">
                  <FieldReview 
                    label="Título Visible (Cliente)" 
                    value={editingDocument.display_title} 
                    onChange={(v:string) => setEditingDocument({...editingDocument, display_title: v})} 
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Tipo de Documento</label>
                      <select 
                        className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent appearance-none"
                        value={editingDocument.document_type}
                        onChange={e => setEditingDocument({...editingDocument, document_type: e.target.value})}
                      >
                        <option value="general">General</option>
                        <option value="flight_confirmation">Confirmación Vuelo</option>
                        <option value="boarding_pass">Tarjeta Embarque</option>
                        <option value="hotel_booking">Reserva Hotel</option>
                        <option value="transfer_voucher">Boucher Traslado</option>
                        <option value="event_registration">Registro Evento</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Visibilidad Cliente</label>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setEditingDocument({...editingDocument, visible_to_client: true})}
                          className={`flex-1 p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${editingDocument.visible_to_client ? 'bg-green-500/10 border-green-500 text-green-600' : 'bg-background border-border text-muted'}`}
                        >
                          Visible
                        </button>
                        <button 
                          type="button"
                          onClick={() => setEditingDocument({...editingDocument, visible_to_client: false})}
                          className={`flex-1 p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${!editingDocument.visible_to_client ? 'bg-orange-500/10 border-orange-500 text-orange-600' : 'bg-background border-border text-muted'}`}
                        >
                          Oculto
                        </button>
                      </div>
                    </div>
                  </div>

                  <FieldReview 
                    label="Descripción Breve" 
                    value={editingDocument.description} 
                    onChange={(v:string) => setEditingDocument({...editingDocument, description: v})} 
                  />

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Vincular a Vuelo</label>
                    <select 
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent appearance-none"
                      value={editingDocument.related_flight_id || ''}
                      onChange={e => setEditingDocument({...editingDocument, related_flight_id: e.target.value || null})}
                    >
                      <option value="">No vinculado</option>
                      {selectedPlan.flights?.map((f: any) => (
                        <option key={f.id} value={f.id}>{f.type === 'outbound' ? 'Ida' : 'Vuelta'}: {f.airline} {f.flight_number}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Vincular a Hotel</label>
                    <select 
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent appearance-none"
                      value={editingDocument.related_hotel_stay_id || ''}
                      onChange={e => setEditingDocument({...editingDocument, related_hotel_stay_id: e.target.value || null})}
                    >
                      <option value="">No vinculado</option>
                      {selectedPlan.hotel_stays?.map((h: any) => (
                        <option key={h.id} value={h.id}>{h.hotel_name} · {h.booking_reference}</option>
                      ))}
                    </select>
                  </div>

                  {editingDocument.document_type === 'boarding_pass' && (
                    <div className="space-y-4 p-5 bg-accent/5 rounded-3xl border border-accent/10">
                      <div className="flex items-center gap-2 text-accent font-black text-[10px] uppercase tracking-widest px-1">
                        <QrCode size={14} /> Detalles de la Tarjeta de Embarque
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FieldReview 
                          label="Pasajero" 
                          value={editingDocument.passenger_name} 
                          onChange={(v:any) => setEditingDocument({...editingDocument, passenger_name: v})} 
                          placeholder="Nombre en la tarjeta"
                        />
                        <FieldReview 
                          label="Asiento" 
                          value={editingDocument.seat_assignment} 
                          onChange={(v:any) => setEditingDocument({...editingDocument, seat_assignment: v})} 
                          placeholder="Ej: 22C"
                        />
                        <FieldReview 
                          label="Grupo Embarque" 
                          value={editingDocument.boarding_group} 
                          onChange={(v:any) => setEditingDocument({...editingDocument, boarding_group: v})} 
                          placeholder="Ej: 1"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-muted tracking-widest px-1">Contenido Código QR</label>
                        <textarea 
                          className="w-full bg-background border border-accent/20 rounded-xl p-3 text-[10px] outline-none focus:border-accent font-mono h-20 resize-none"
                          value={editingDocument.qr_code || ''}
                          onChange={e => setEditingDocument({...editingDocument, qr_code: e.target.value})}
                          placeholder="M1PINAZO/JUANJO E123456..."
                        />
                        <p className="text-[8px] text-muted/60 px-1 italic">Pega aquí el texto plano que genera el código QR.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-border flex gap-4">
                  <Button variant="ghost" type="button" className="flex-1 rounded-2xl py-6 font-bold" onClick={() => setEditingDocument(null)}>Cancelar</Button>
                  <Button type="submit" className="flex-2 rounded-2xl py-6 font-black uppercase tracking-widest text-xs" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Guardar Cambios'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hotel Import Modal */}
      {showHotelImport && selectedPlan && (
        <HotelImportModal
          planId={selectedPlan.id}
          contextId={selectedPlan.context_id}
          planUserName={`${selectedPlan.profiles?.nombre || ''} ${selectedPlan.profiles?.apellidos || ''}`.trim()}
          onClose={() => setShowHotelImport(false)}
          onSuccess={() => {
            setShowHotelImport(false);
            handleManagePlan(selectedPlan);
          }}
        />
      )}
    </div>
  );
}

const FieldReview = ({ label, value, onChange, type = "text", optional = false }: any) => {
  // Normalización para el valor del input según el tipo
  let displayValue = value || '';
  if (type === 'datetime-local') {
    if (value && value.includes('T')) {
      displayValue = value.slice(0, 16);
    } else if (value && value.match(/^\d{1,2}:\d{2}$/)) {
      // Si solo tenemos hora, añadimos la fecha de hoy para que el input datetime-local sea válido
      const today = new Date().toISOString().split('T')[0];
      displayValue = `${today}T${value.padStart(5, '0')}`;
    } else {
      displayValue = '';
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black uppercase text-muted tracking-widest px-1 flex justify-between">
        {label}
        {!value && !optional && <span className="text-red-500 font-bold">Faltante</span>}
        {!value && optional && <span className="text-muted font-bold">Opcional</span>}
      </label>
      <input 
        type={type}
        className={`w-full bg-background border rounded-xl p-3 text-xs outline-none transition-all ${!value && !optional ? 'border-red-500/50 bg-red-500/5' : 'border-border focus:border-accent'}`} 
        value={displayValue} 
        onChange={e => onChange(e.target.value)}
        placeholder={`Ingresar ${label.toLowerCase()}...`}
      />
    </div>
  );
};
