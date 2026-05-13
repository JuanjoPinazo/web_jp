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
  Milestone,
  Eye,
  Users,
  UserPlus,
  RefreshCw,
  Check,
  Mail,
  Zap,
  Navigation,
  Star,
} from 'lucide-react';
import { searchPlacesAction, getPlaceDetailsAction } from '@/actions/google-places-actions';
import { Button } from '@/components/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialog } from '@/context/DialogContext';
import { useHotelsCatalog, MasterHotel } from '@/hooks/useHotelsCatalog';
import { useRestaurantsCatalog, MasterRestaurant } from '@/hooks/useRestaurantsCatalog';
import { HotelImportModal } from '@/components/HotelImportModal';
import { QRCodeSVG } from 'qrcode.react';
import { calculateRouteAction, getPlanRoutesAction } from '@/actions/travel-routes-actions';
import { TravelMode } from '@/core/types/geo';

export default function AdminPlansPage() {
  const { isAdmin, getUsers, getContexts } = useAdmin();
  const [isImporting, setIsImporting] = useState(false);
  const [importType, setImportType] = useState('flight_confirmation');
  const [importProvider, setImportProvider] = useState('auto');
  const [importStep, setImportStep] = useState<'upload' | 'extracting' | 'validating'>('upload');
  const [extractionResult, setExtractionResult] = useState<any>(null);

  const { 
    getAdminPlanForUser, saveItem, deleteItem, saveTravelDocument, 
    saveAttendee, getEventAttendees, deleteAttendee, getContextEvents 
  } = useTravelPlans();
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Hotel Catalog Integration
  const { fetchHotels: fetchCatalogHotels, saveHotel: saveToCatalog } = useHotelsCatalog();
  const { fetchRestaurants: fetchCatalogRestaurants, saveRestaurant: saveRestaurantToCatalog } = useRestaurantsCatalog();
  const [catalogHotels, setCatalogHotels] = useState<MasterHotel[]>([]);
  const [catalogRestaurants, setCatalogRestaurants] = useState<MasterRestaurant[]>([]);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [showRestaurantCatalogList, setShowRestaurantCatalogList] = useState(false);
  const [hotelSearch, setHotelSearch] = useState('');
  const [showCatalogList, setShowCatalogList] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [editingFlight, setEditingFlight] = useState<any>(null);
  const [editingHotel, setEditingHotel] = useState<any>(null);
  const [editingDocument, setEditingDocument] = useState<any>(null);
  const [showHotelImport, setShowHotelImport] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedContext, setSelectedContext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingHospitality, setEditingHospitality] = useState<any>(null);
  const [planRoutes, setPlanRoutes] = useState<any[]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<any>(null);
  const [supportInfo, setSupportInfo] = useState({ phone: '+34 600 000 000' });
  const [showQuickUser, setShowQuickUser] = useState(false);
  const [quickUser, setQuickUser] = useState({ name: '', surname: '', email: '' });
  const [contextProfiles, setContextProfiles] = useState<any[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState<any>(null);
  const [attendeeSaving, setAttendeeSaving] = useState(false);
  const [attendeeError, setAttendeeError] = useState<string | null>(null);
  const [contextEvents, setContextEvents] = useState<any[]>([]);
  const [showEventSelector, setShowEventSelector] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [hospPlaceSearch, setHospPlaceSearch] = useState('');
  const [hospPlaceResults, setHospPlaceResults] = useState<any[]>([]);
  const [isSearchingHosp, setIsSearchingHosp] = useState(false);
  const [showHospPlaceList, setShowHospPlaceList] = useState(false);

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
          profiles:user_id (id, nombre, apellidos, email, avatar_url),
          contexts:context_id (name, latitude, longitude),
          flights:travel_flights(count),
          hotels:travel_hotels(count),
          hotel_stays:hotel_stays(count),
          transfers:travel_transfers(count),
          restaurants:travel_restaurants(count),
          hospitality:hospitality_events(count),
          documents:travel_documents(count)
        `)
        .order('created_at', { ascending: false });

      if (pError) throw pError;

      // Fetch attendances separately to avoid deep nesting issues
      const { data: aData } = await supabase
        .from('hospitality_event_attendees')
        .select('profile_id')
        .is('deleted_at', null);
      
      const attendanceMap: Record<string, number> = {};
      aData?.forEach((a: any) => {
        if (a.profile_id) {
          attendanceMap[a.profile_id] = (attendanceMap[a.profile_id] || 0) + 1;
        }
      });

      const enrichedPlans = (pData || []).map(plan => ({
        ...plan,
        attendance_count: attendanceMap[plan.user_id] || 0
      }));

      setPlans(enrichedPlans);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadContextProfiles = async (contextId: string) => {
    setProfilesLoading(true);
    try {
      // Two-step join: context_users → profiles (avoids fragile nested subquery)
      const { data: cuData, error: cuError } = await supabase
        .from('context_users')
        .select('user_id')
        .eq('context_id', contextId);

      if (cuError) throw cuError;

      const userIds = (cuData ?? []).map((cu: any) => cu.user_id).filter(Boolean);

      if (userIds.length === 0) {
        setContextProfiles([]);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, apellidos, email, avatar_url')
        .in('id', userIds)
        .order('nombre');

      if (error) throw error;
      setContextProfiles(data || []);
    } catch (err) {
      console.error('Error loading context profiles:', err);
      setContextProfiles([]);
    } finally {
      setProfilesLoading(false);
    }
  };

  const handleManagePlan = async (plan: any) => {
    setLoading(true);
    try {
      const fullPlan = await getAdminPlanForUser(plan.user_id, plan.context_id);
      setSelectedPlan(fullPlan);
      setEnabledModules(fullPlan?.contexts?.modules_enabled || {});
      if (fullPlan?.context_id) {
        loadContextProfiles(fullPlan.context_id);
        const events = await getContextEvents(fullPlan.context_id);
        setContextEvents(events);
        loadPlanRoutes(fullPlan.id);
      }
      setView('detail');
    } catch (err) {
      console.error(err);
      alert({ title: 'Error', message: 'No se pudo cargar el detalle del plan.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const openHotelEdit = async (hotel: any = null) => {
    if (hotel) {
      setEditingHotel({ ...hotel });
    } else {
      setEditingHotel({ 
        plan_id: selectedPlan.id, 
        check_in: '', 
        check_out: '', 
        hotel_name: '', 
        booking_reference: '',
        master_hotel_id: null,
        latitude: null,
        longitude: null,
        visible_to_client: true,
        guest_name: `${selectedPlan.profiles?.nombre || ''} ${selectedPlan.profiles?.apellidos || ''}`.trim(),
        source: 'manual'
      });
    }
    setHotelSearch('');
    setShowCatalogList(false);
    const hotels = await fetchCatalogHotels();
    setCatalogHotels(hotels || []);
  };

  const filteredPlans = plans.filter(p => {
    const userName = `${p.profiles?.nombre} ${p.profiles?.apellidos}`.toLowerCase();
    const contextName = p.contexts?.name?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return userName.includes(query) || contextName.includes(query);
  });

  const loadPlanRoutes = async (planId: string) => {
    try {
      const res = await getPlanRoutesAction(planId);
      if (res.success) {
        setPlanRoutes(res.routes || []);
      }
    } catch (err) {
      console.error('Error loading plan routes:', err);
    }
  };

  const handleCalculateRoute = async () => {
    if (!selectedPlan) return;
    await loadPlanRoutes(selectedPlan.id);
  };

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
      loadData(); // Background refresh
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
      loadData(); // Auto-refresh dashboard counts
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
      loadData(); // Sync counts
    } catch (err: any) {
      alert({ title: 'Error', message: err.message, type: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransfer) return;
    try {
      setIsSubmitting(true);
      const data = { ...editingTransfer };
      delete data.created_at;
      delete data.updated_at;
      
      await saveItem('travel_transfers', data);
      await alert({ title: 'Éxito', message: 'Traslado guardado correctamente.', type: 'success' });
      setEditingTransfer(null);
      handleManagePlan(selectedPlan);
      loadData();
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
          <Button 
            variant="outline" 
            onClick={() => loadData().then(() => alert({ title: 'Actualizado', message: 'Datos de logística sincronizados.', type: 'success' }))} 
            className="rounded-xl px-4 flex items-center gap-2 border-border bg-surface"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> <span className="hidden md:inline">Refrescar</span>
          </Button>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <ShieldCheck size={14} className={plan.status === 'active' ? 'text-emerald-500' : 'text-orange-500'} />
                  <span>Estado: <b className="text-foreground uppercase text-[10px]">{plan.status === 'active' ? 'Publicado' : 'Borrador'}</b></span>
                </div>
              </div>

              {/* Checklist Logístico - Dashboard Rápido */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex gap-3">
                  {(() => {
                    const getCount = (arr: any) => arr?.[0]?.count || 0;
                    const fCount = getCount(plan.flights);
                    const hCount = getCount(plan.hotels) + getCount(plan.hotel_stays);
                    const tCount = getCount(plan.transfers);
                    const rCount = getCount(plan.restaurants);
                    const vCount = getCount(plan.hospitality) + (plan.attendance_count || 0);
                    
                    return (
                      <>
                        <div className={`flex flex-col items-center gap-1 ${fCount > 0 ? 'text-blue-500' : 'text-muted/30'}`} title="Vuelos">
                          <Plane size={14} />
                          <span className="text-[9px] font-black">{fCount}</span>
                        </div>
                        <div className={`flex flex-col items-center gap-1 ${hCount > 0 ? 'text-orange-500' : 'text-muted/30'}`} title="Hoteles">
                          <Hotel size={14} />
                          <span className="text-[9px] font-black">{hCount}</span>
                        </div>
                        <div className={`flex flex-col items-center gap-1 ${tCount > 0 ? 'text-purple-500' : 'text-muted/30'}`} title="Traslados">
                          <Car size={14} />
                          <span className="text-[9px] font-black">{tCount}</span>
                        </div>
                        <div className={`flex flex-col items-center gap-1 ${rCount > 0 ? 'text-emerald-500' : 'text-muted/30'}`} title="Cenas/Restaurantes">
                          <Utensils size={14} />
                          <span className="text-[9px] font-black">{rCount}</span>
                        </div>
                        <div className={`flex flex-col items-center gap-1 ${vCount > 0 ? 'text-pink-500' : 'text-muted/30'}`} title="Eventos VIP / Hospitality">
                          <Calendar size={14} />
                          <span className="text-[9px] font-black">{vCount}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
                
                <div className="h-6 w-[1px] bg-border/50 mx-1" />
                
                <div className={`flex flex-col items-center gap-1 ${plan.support_phone ? 'text-accent' : 'text-muted/30'}`} title="Soporte asignado">
                  <Phone size={14} />
                  <span className="text-[9px] font-black">{plan.support_phone ? 'SÍ' : 'NO'}</span>
                </div>
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
            <Button
              variant="outline"
              className="rounded-xl px-4 flex items-center gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={sendingEmail}
              onClick={async () => {
                if (!selectedPlan?.profiles?.email) {
                  alert({ title: 'Sin email', message: 'Este asistente no tiene email registrado.', type: 'danger' });
                  return;
                }
                setSendingEmail(true);
                try {
                  const res = await fetch('/api/send-logistics-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planId: selectedPlan.id }),
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error || 'Error desconocido');
                  alert({ title: 'Email enviado ✓', message: `Itinerario enviado a ${json.sentTo}`, type: 'success' });
                } catch (err: any) {
                  alert({ title: 'Error al enviar', message: err.message, type: 'danger' });
                } finally {
                  setSendingEmail(false);
                }
              }}
            >
              {sendingEmail ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
              {sendingEmail ? 'Enviando...' : 'Enviar Email Logístico'}
            </Button>
            <Button variant="outline" className="rounded-xl px-4 flex items-center gap-2 border-accent/20 text-accent hover:bg-accent hover:text-white" onClick={() => setShowHotelImport(true)}>
              <FileSpreadsheet size={18} /> Importar Alojamientos Excel
            </Button>
            <Button variant="outline" className="rounded-xl px-4 flex items-center gap-2 border-accent/20 text-accent hover:bg-accent hover:text-white" onClick={() => setIsImporting(true)}>
              <FileBadge size={18} /> Importar PDF de Agencia
            </Button>
          </div>
        </div>

        {/* --- SMART DISTANCES SECTION --- */}
        <SmartDistances 
          plan={selectedPlan} 
          routes={planRoutes} 
          onCalculate={handleCalculateRoute} 
          isCalculating={isCalculatingRoute} 
        />

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
              onClick={() => openHotelEdit()}
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
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start gap-3">
                            <MapPin size={12} className="text-muted mt-0.5 shrink-0" />
                            <p className="text-[10px] font-medium text-muted">{hotel.address}</p>
                          </div>
                          {(hotel.latitude && hotel.longitude) && (
                            <a 
                              href={`https://www.google.com/maps/dir/?api=1&destination=${hotel.latitude},${hotel.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-[9px] font-black text-accent uppercase tracking-widest hover:underline ml-7"
                            >
                              <ExternalLink size={10} /> Cómo llegar
                            </a>
                          )}
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
                  onClick={() => openHotelEdit()}
                >
                  <Plus size={14} /> Añadir Primer Hotel
                </Button>
              </div>
            )}
          </div>
        </section>
        
        {/* Hospitality Section */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-black uppercase text-muted tracking-widest flex items-center gap-2">
              <Utensils size={14} className="text-accent" /> Hospitality VIP
            </h3>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-[10px] font-black uppercase tracking-widest text-accent hover:bg-accent/10 rounded-xl px-3"
                onClick={() => setShowEventSelector(true)}
              >
                <Users size={14} /> Vincular Invitación
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-[10px] font-black uppercase tracking-widest text-accent hover:bg-accent/10 rounded-xl px-3"
                onClick={() => setEditingHospitality({
                  plan_id: selectedPlan.id,
                  type: 'dinner',
                  title: '',
                  venue_name: '',
                  start_datetime: '',
                  end_datetime: '',
                  visible_to_client: true,
                  private_room: false,
                  status: 'planned',
                  notes: '',
                  contact_name: '',
                  contact_phone: ''
                })}
              >
                <Plus size={14} /> Nuevo Evento Propio
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(selectedPlan.hospitality_events || []).map((event: any) => {
              const isOwner = event.plan_id === selectedPlan.id;
              // Buscamos si el usuario actual es un asistente (para poder borrar la invitación si es necesario)
              const userAttendee = event.hospitality_event_attendees?.find((a: any) => a.profile_id === selectedPlan.user_id);
              
              return (
                <div key={event.id} className={`bg-background border rounded-2xl overflow-hidden group hover:border-accent/30 transition-all ${!isOwner ? 'border-dashed border-accent/40' : 'border-border'}`}>
                  <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isOwner ? 'bg-accent/10 text-accent' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {isOwner ? <Utensils size={16} /> : <UserPlus size={16} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground line-clamp-1">{event.title || 'Evento Hospitality'}</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-accent/10 text-accent text-[8px] font-black uppercase">{event.type}</span>
                          {!isOwner && <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest">Invitado/a</span>}
                        </div>
                        <p className="text-[9px] text-muted font-medium">{event.venue_name}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {(isOwner || isAdmin) && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingHospitality(event)}>
                          <Edit2 size={12} className="text-muted hover:text-accent" />
                        </Button>
                      )}
                      {isOwner && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={async () => {
                          if (await confirm({ title: 'Eliminar Evento', message: '¿Eliminar este evento y todos sus asistentes?' })) {
                            deleteItem('hospitality_events', event.id).then(() => handleManagePlan(selectedPlan));
                          }
                        }}>
                          <Trash2 size={12} className="text-red-500" />
                        </Button>
                      )}
                      {!isOwner && userAttendee && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={async () => {
                          if (await confirm({ title: 'Eliminar Invitación', message: '¿Eliminar esta invitación del itinerario del usuario?' })) {
                            deleteAttendee(userAttendee.id).then(() => handleManagePlan(selectedPlan));
                          }
                        }}>
                          <Trash2 size={12} className="text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[9px] font-black text-muted uppercase tracking-widest">Fecha / Hora</p>
                        <p className="text-xs font-bold">
                          {event.start_datetime ? new Date(event.start_datetime).toLocaleString('es-ES', { 
                            day: '2-digit', month: '2-digit', 
                            hour: '2-digit', minute: '2-digit', 
                            timeZone: 'UTC' 
                          }) : 'S/F'}
                        </p>
                      </div>
                      {!isOwner && event.plan?.profiles && (
                        <div>
                          <p className="text-[9px] font-black text-muted uppercase tracking-widest">Anfitrión</p>
                          <p className="text-xs font-bold text-accent">{event.plan.profiles.nombre} {event.plan.profiles.apellidos}</p>
                        </div>
                      )}
                    </div>
                    {event.reservation_code && isOwner && (
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-[9px] font-black text-muted uppercase tracking-widest">Reserva</p>
                        <p className="text-xs font-mono font-bold text-accent">{event.reservation_code} {event.reservation_name ? `(${event.reservation_name})` : ''}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {(selectedPlan.hospitality_events || []).length === 0 && (
              <div className="col-span-full border border-dashed border-border rounded-2xl p-10 text-center">
                <p className="text-xs text-muted font-medium">No hay eventos de hospitality registrados.</p>
              </div>
            )}
          </div>
        </section>

        {/* Transfers Section */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-black uppercase text-muted tracking-widest flex items-center gap-2">
              <Car size={14} className="text-accent" /> Traslados & Shuttles
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-[10px] font-black uppercase tracking-widest text-accent hover:bg-accent/10 rounded-xl px-3"
              onClick={() => setEditingTransfer({
                plan_id: selectedPlan.id,
                type: 'airport_to_hotel',
                pickup_datetime: '',
                pickup_location: '',
                dropoff_location: '',
                status: 'planned',
                visible_to_client: true,
                source: 'manual'
              })}
            >
              <Plus size={14} /> Nuevo Traslado
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(selectedPlan.transfers || []).map((transfer: any) => (
              <div key={transfer.id} className="bg-background border border-border rounded-2xl overflow-hidden group hover:border-accent/30 transition-all">
                <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <Car size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {transfer.type?.replace(/_/g, ' ').toUpperCase() || 'TRASLADO'}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase ${
                          transfer.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-500' :
                          transfer.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                          'bg-amber-500/10 text-amber-500'
                        }`}>
                          {transfer.status || 'planned'}
                        </span>
                      </div>
                      <p className="text-[9px] text-muted font-medium">
                        {transfer.pickup_datetime ? new Date(transfer.pickup_datetime).toLocaleString('es-ES', { 
                          day: '2-digit', month: '2-digit', 
                          hour: '2-digit', minute: '2-digit',
                          timeZone: 'UTC'
                        }) : 'S/H'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingTransfer(transfer)}>
                      <Edit2 size={12} className="text-muted hover:text-accent" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete('transfer', transfer.id)}>
                      <Trash2 size={12} className="text-red-500" />
                    </Button>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                      <div className="w-0.5 h-6 bg-border" />
                      <div className="w-2 h-2 rounded-full border-2 border-accent" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <p className="text-[8px] font-black text-muted uppercase tracking-widest">Recogida (Origen)</p>
                        <p className="text-xs font-bold">{transfer.pickup_location || 'No especificado'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-muted uppercase tracking-widest">Destino</p>
                        <p className="text-xs font-bold">{transfer.dropoff_location || 'No especificado'}</p>
                      </div>
                    </div>
                  </div>
                  
                  {(transfer.driver_name || transfer.vehicle_type) && (
                    <div className="pt-3 border-t border-border/50 grid grid-cols-2 gap-3">
                      {transfer.driver_name && (
                        <div>
                          <p className="text-[8px] font-black text-muted uppercase tracking-widest">Chófer</p>
                          <p className="text-xs font-bold">{transfer.driver_name}</p>
                          {transfer.driver_phone && <p className="text-[10px] text-accent font-medium">{transfer.driver_phone}</p>}
                        </div>
                      )}
                      {transfer.vehicle_type && (
                        <div>
                          <p className="text-[8px] font-black text-muted uppercase tracking-widest">Vehículo</p>
                          <p className="text-xs font-bold">{transfer.vehicle_type}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(selectedPlan.transfers || []).length === 0 && (
              <div className="col-span-full border border-dashed border-border rounded-2xl p-8 text-center">
                <p className="text-xs text-muted font-medium">No hay traslados configurados.</p>
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
                     {doc.document_type === 'boarding_pass' && doc.qr_raw_payload && (
                        <div className="mt-2 flex items-center gap-3 bg-accent/5 p-2 rounded-xl border border-accent/10">
                           <div className="bg-white p-1 rounded border border-border">
                             <QRCodeSVG value={doc.qr_raw_payload} size={40} />
                           </div>
                           <div className="text-[7px] font-mono text-muted uppercase tracking-tighter max-w-[120px] truncate">
                             QR: {doc.qr_raw_payload.substring(0, 15)}...
                           </div>
                        </div>
                     )}
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
        loadData(); // Actualizar contadores del dashboard
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
                        
                        <div className="flex gap-2 pt-2">
                           <Button 
                             variant="outline" 
                             size="sm" 
                             className="h-7 text-[8px] font-black uppercase tracking-widest border-accent/20 text-accent hover:bg-accent hover:text-white"
                             onClick={() => {
                               if (extractionResult.file) {
                                 const url = URL.createObjectURL(extractionResult.file);
                                 window.open(url, '_blank');
                               }
                             }}
                           >
                             <Eye size={10} className="mr-1" /> Ver PDF Original
                           </Button>
                           
                           {extractionResult.qr_decoded && (
                             <div className="bg-white p-1 rounded-lg border border-border shadow-sm flex items-center justify-center">
                               <QRCodeSVG value={extractionResult.qr_raw_payload || ''} size={60} />
                             </div>
                           )}
                        </div>
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
                            if (!selectedPlan?.id) throw new Error('No hay un plan activo seleccionado.');
                            setIsSubmitting(true);
                            
                            const editData = extractionResult.data;
                            
                            // 1. MAPPING ROBUSTO (Punto 1 de la solicitud)
                            const depLoc = (
                              editData.departure_location || 
                              editData.origin || 
                              editData.departure_airport || 
                              editData.from || 
                              ''
                            ).trim();

                            const arrLoc = (
                              editData.arrival_location || 
                              editData.destination || 
                              editData.arrival_airport || 
                              editData.to || 
                              ''
                            ).trim();

                            // Normalización de fechas
                            const toISO = (dateStr: string) => {
                               if (!dateStr) return null;
                               if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateStr)) return dateStr.length === 16 ? `${dateStr}:00` : dateStr;
                               const match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}:\d{2}))?/);
                               if (match) {
                                 const day = match[1].padStart(2, '0');
                                 const month = match[2].padStart(2, '0');
                                 const year = match[3];
                                 const time = match[4] || '12:00';
                                 return `${year}-${month}-${day}T${time}:00`;
                               }
                               return dateStr;
                            };

                            const depTime = toISO(editData.departure_time);
                            const arrTime = toISO(editData.arrival_time);

                            // 2. VALIDACIÓN DE CAMPOS OBLIGATORIOS (Punto 2 y 7)
                            // El plan_id se resolverá a continuación
                            if (!editData.airline || !editData.flight_number || !depLoc || !arrLoc || !depTime) {
                              console.error('VALIDATION FAILED', { airline: editData.airline, flight_number: editData.flight_number, depLoc, arrLoc, depTime });
                              throw new Error('Falta origen/destino, aerolínea o número del vuelo. Revisa la extracción antes de guardar.');
                            }

                            // SMART MATCH LOGIC: Find target plan by passenger name
                            let targetPlanId = selectedPlan.id;
                            const guestName = editData.passenger_name || (editData.passengers ? editData.passengers.split(',')[0].trim() : null);
                            
                            if (guestName) {
                              const { data: matchedProfiles } = await supabase.from('profiles').select('id, nombre, apellidos');
                              const profile = matchedProfiles?.find(p => `${p.nombre || ''} ${p.apellidos || ''}`.trim().toLowerCase() === guestName.toLowerCase());
                              if (profile) {
                                const { data: existingPlan } = await supabase.from('contact_travel_plans')
                                  .select('id').eq('user_id', profile.id).eq('context_id', selectedPlan.context_id).is('deleted_at', null).maybeSingle();
                                if (existingPlan?.id) targetPlanId = existingPlan.id;
                              }
                            }

                            // 3 & 4. LÓGICA DE VINCULACIÓN (Punto 3 y 4)
                            let relatedFlightId = editData.related_flight_id;
                            
                            if (!relatedFlightId) {
                               // Buscar vuelo existente
                               const { data: planFlights } = await supabase.from('travel_flights').select('*').eq('plan_id', targetPlanId).is('deleted_at', null);
                               const existingFlight = planFlights?.find((f: any) => 
                                 f.flight_number === editData.flight_number && 
                                 (f.departure_location === depLoc || f.origin === depLoc) &&
                                 (f.arrival_location === arrLoc || f.destination === arrLoc)
                               );
                               if (existingFlight) relatedFlightId = existingFlight.id;
                            }

                            const flightPayload: any = {
                               plan_id: targetPlanId,
                               airline: editData.airline || 'Vueling',
                               flight_number: editData.flight_number,
                               departure_location: depLoc,
                               arrival_location: arrLoc,
                               origin: depLoc,
                               destination: arrLoc,
                               departure_time: depTime,
                               arrival_time: arrTime,
                               reservation_code: editData.booking_reference,
                               seat: editData.seat,
                               gate: editData.gate,
                               boarding_group: editData.boarding_group,
                               baggage_info: editData.baggage_info,
                               is_verified: true,
                               source: extractionResult.type === 'boarding_pass' ? 'boarding_pass_import' : 'flight_confirmation_import',
                               type: editData.type || 'outbound'
                            };

                            // 6. DEBUG ANTES DEL INSERT (Punto 6)
                            console.log('FLIGHT PAYLOAD BEFORE SAVE', flightPayload);

                            const savedFlight = await saveItem('travel_flights', relatedFlightId ? { ...flightPayload, id: relatedFlightId } : flightPayload);
                            if (savedFlight) relatedFlightId = savedFlight.id;

                            // 5. GUARDAR EN TRAVEL_DOCUMENTS (Punto 5)
                            if (extractionResult.file) {
                              const fileName = `${extractionResult.type}_${Date.now()}.pdf`;
                              const { data: uploadData } = await supabase.storage
                                .from('travel-documents').upload(`${targetPlanId}/${fileName}`, extractionResult.file);
                              
                              if (uploadData) {
                                const { data: { publicUrl } } = supabase.storage.from('travel-documents').getPublicUrl(uploadData.path);
                                
                                const docTitle = extractionResult.type === 'boarding_pass' 
                                  ? `Tarjeta de Embarque · ${editData.airline} ${editData.flight_number}`
                                  : `Reserva · ${editData.airline} ${editData.flight_number}`;

                                await saveTravelDocument({
                                  plan_id: targetPlanId,
                                  title: docTitle,
                                  display_title: docTitle,
                                  document_type: extractionResult.type === 'boarding_pass' ? 'boarding_pass' : 'flight_confirmation',
                                  description: `${depLoc} → ${arrLoc} · Asiento ${editData.seat || 'S/A'}`,
                                  file_url: publicUrl,
                                  related_flight_id: relatedFlightId,
                                  passenger_name: editData.passenger_name,
                                  seat_assignment: editData.seat,
                                  boarding_group: editData.boarding_group,
                                  booking_reference: editData.booking_reference,
                                  qr_code: extractionResult.qr_raw_payload || editData.qr_code,
                                  qr_decoded: extractionResult.qr_decoded || false,
                                  qr_raw_payload: extractionResult.qr_raw_payload || null,
                                  visible_to_client: true
                                });
                              }
                            }

                            setImportStep('upload');
                            setExtractionResult(null);
                            handleManagePlan(selectedPlan);
                            loadData();
                          } catch (err: any) {
                               console.error('Error Crítico Detallado:', err.message || err);
                               console.log('Error object:', err);
                              
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
                  // Reconstruir payload solo con campos válidos para hotel_stays (whitelist)
                  const hotelPayload: any = {
                    plan_id: editingHotel.plan_id,
                    guest_name: (editingHotel.guest_name || editingHotel.traveler_name || '').trim(),
                    hotel_name: editingHotel.hotel_name,
                    address: editingHotel.address,
                    phone: editingHotel.phone,
                    check_in: editingHotel.check_in,
                    check_out: editingHotel.check_out,
                    check_in_time: editingHotel.check_in_time,
                    check_out_time: editingHotel.check_out_time,
                    room_type: editingHotel.room_type,
                    booking_reference: editingHotel.booking_reference,
                    breakfast_included: editingHotel.breakfast_included,
                    room_group_id: editingHotel.room_group_id,
                    notes: editingHotel.notes,
                    status: editingHotel.status || 'confirmed',
                    source: editingHotel.source || 'manual'
                  };

                  if (editingHotel.id) hotelPayload.id = editingHotel.id;
                  
                  // New master hotel fields
                  hotelPayload.master_hotel_id = editingHotel.master_hotel_id;
                  hotelPayload.latitude = editingHotel.latitude;
                  hotelPayload.longitude = editingHotel.longitude;

                  await saveItem('hotel_stays', hotelPayload);
                  setEditingHotel(null);
                  handleManagePlan(selectedPlan);
                  loadData();
                } catch (err: any) {
                  alert({ title: 'Error', message: err.message || 'No se pudo guardar el hotel.', type: 'danger' });
                } finally {
                  setIsSubmitting(false);
                }
              }} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2 space-y-3 p-5 bg-accent/5 rounded-3xl border border-accent/10 relative">
                    <label className="text-[10px] font-black uppercase text-accent tracking-widest px-1 flex items-center gap-2">
                      <Search size={12} /> Buscar en Catálogo Maestro
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input 
                          type="text" 
                          className="w-full bg-background border border-border rounded-xl p-3 pl-10 text-xs outline-none focus:border-accent"
                          placeholder="Nombre del hotel, ciudad..."
                          value={hotelSearch}
                          onChange={e => setHotelSearch(e.target.value)}
                          onFocus={async () => {
                            if (catalogHotels.length === 0) {
                              const hotels = await fetchCatalogHotels();
                              setCatalogHotels(hotels || []);
                            }
                            if (hotelSearch.length > 0) setShowCatalogList(true);
                          }}
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                          <Search size={14} />
                        </div>
                        
                        <AnimatePresence>
                          {showCatalogList && hotelSearch.length >= 2 && (
                            <motion.div 
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              className="absolute left-0 right-0 top-full mt-2 bg-surface border border-border rounded-2xl shadow-2xl z-[80] max-h-60 overflow-y-auto"
                            >
                              {catalogHotels
                                .filter(h => {
                                  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                                  const search = normalize(hotelSearch);
                                  return normalize(h.name).includes(search) || 
                                         normalize(h.city).includes(search) ||
                                         (h.address && normalize(h.address).includes(search));
                                })
                                .map(hotel => (
                                  <button
                                    key={hotel.id}
                                    type="button"
                                    className="w-full text-left p-4 hover:bg-accent/10 border-b border-border/50 last:border-0 flex justify-between items-center group"
                                    onClick={() => {
                                      setEditingHotel({
                                        ...editingHotel,
                                        hotel_name: hotel.name,
                                        address: hotel.address || '',
                                        phone: hotel.phone || '',
                                        stars: hotel.stars,
                                        rating: hotel.rating,
                                        city: hotel.city,
                                        master_hotel_id: hotel.id,
                                        latitude: hotel.latitude,
                                        longitude: hotel.longitude
                                      });
                                      setHotelSearch('');
                                      setShowCatalogList(false);
                                    }}
                                  >
                                    <div>
                                      <p className="text-xs font-black text-foreground group-hover:text-accent transition-colors">{hotel.name}</p>
                                      <p className="text-[10px] text-muted">{hotel.city}{hotel.address ? ` · ${hotel.address}` : ''}</p>
                                    </div>
                                    <div className="text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Plus size={16} />
                                    </div>
                                  </button>
                                ))
                              }
                              {catalogHotels.filter(h => 
                                h.name.toLowerCase().includes(hotelSearch.toLowerCase()) || 
                                h.city.toLowerCase().includes(hotelSearch.toLowerCase()) ||
                                (h.address && h.address.toLowerCase().includes(hotelSearch.toLowerCase()))
                              ).length === 0 && (
                                <div className="p-4 text-center">
                                  <p className="text-[10px] font-bold text-muted uppercase">No hay coincidencias en catálogo</p>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline"
                        className="rounded-xl h-10 px-3 flex items-center gap-2 border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest hover:bg-accent/10"
                        onClick={() => {
                          // Open Google Places Search (We can reuse the test logic or just a simple alert for now)
                          window.open('/admin/google-test', '_blank');
                        }}
                      >
                        <Plane size={14} /> Google Places
                      </Button>
                    </div>
                  </div>

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

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1 flex justify-between">
                      Categoría (Estrellas)
                      <span className="text-muted font-bold">Opcional</span>
                    </label>
                    <select 
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent"
                      value={editingHotel.stars || ''}
                      onChange={e => setEditingHotel({...editingHotel, stars: e.target.value ? parseInt(e.target.value) : null})}
                    >
                      <option value="">No especificado</option>
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Estrellas</option>)}
                    </select>
                  </div>
                  <FieldReview label="Valoración (Rating)" type="number" optional={true} value={editingHotel.rating} onChange={(v:any) => setEditingHotel({...editingHotel, rating: parseFloat(v)})} placeholder="Ej: 8.5" />

                  <div className="col-span-2 space-y-2">
                    <FieldReview 
                      label="Grupo de Habitación" 
                      value={editingHotel.room_group_id} 
                      optional={true}
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

                  <FieldReview label="Teléfono Hotel" optional={true} value={editingHotel.phone} onChange={(v:any) => setEditingHotel({...editingHotel, phone: v})} />
                  
                  {(!editingHotel.master_hotel_id && editingHotel.hotel_name) && (
                    <div className="col-span-2 pt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full rounded-xl border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest hover:bg-accent/10 py-3"
                        onClick={async () => {
                          try {
                            const newHotel = await saveToCatalog({
                              name: editingHotel.hotel_name,
                              address: editingHotel.address,
                              phone: editingHotel.phone,
                              city: editingHotel.city || '',
                              stars: editingHotel.stars,
                              rating: editingHotel.rating,
                              latitude: editingHotel.latitude,
                              longitude: editingHotel.longitude
                            });
                            if (newHotel) {
                              setEditingHotel({ ...editingHotel, master_hotel_id: newHotel.id });
                              await alert({ title: 'Éxito', message: 'Hotel guardado en el catálogo maestro.', type: 'success' });
                              const hotels = await fetchCatalogHotels();
                              setCatalogHotels(hotels || []);
                            }
                          } catch (e: any) {
                            alert({ title: 'Error', message: 'No se pudo guardar en el catálogo: ' + e.message, type: 'danger' });
                          }
                        }}
                      >
                        <Star size={12} className="mr-2" /> Guardar en Catálogo Maestro
                      </Button>
                    </div>
                  )}
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

      {/* Modal de Edición de Hospitality */}
      <AnimatePresence>
        {editingHospitality && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background border border-border w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl my-8"
            >
              <div className="p-8 border-b border-border flex justify-between items-center bg-muted/20">
                <div>
                  <h3 className="text-2xl font-black text-primary tracking-tighter">Gestionar Evento Hospitality</h3>
                  <p className="text-[10px] text-muted font-black uppercase tracking-widest mt-1">Experiencia VIP y Agenda</p>
                </div>
                <Button variant="ghost" className="rounded-full h-10 w-10 p-0" onClick={() => setEditingHospitality(null)}>
                  <X size={24} />
                </Button>
              </div>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                try {
                  if (!editingHospitality.title || !editingHospitality.start_datetime) {
                    throw new Error('Título y Fecha son obligatorios.');
                  }
                  // Strip ALL joined/virtual fields — PostgREST rejects any unknown key
                  const {
                    attendees: _a,
                    hospitality_event_attendees: _hea,
                    profiles: _p,
                    contexts: _ctx,
                    ...hospitalityPayload
                  } = editingHospitality as any;
                  
                  // Clean master fields
                  hospitalityPayload.master_restaurant_id = editingHospitality.master_restaurant_id;
                  
                  await saveItem('hospitality_events', hospitalityPayload);
                  await alert({ title: 'Éxito', message: 'Evento guardado correctamente.', type: 'success' });
                  setEditingHospitality(null);
                  handleManagePlan(selectedPlan);
                } catch (err: any) {
                  await alert({ title: 'Error', message: err.message, type: 'danger' });
                } finally {
                  setIsSubmitting(false);
                }
              }} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Tipo de Evento</label>
                    <select 
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent appearance-none"
                      value={editingHospitality.type}
                      onChange={e => setEditingHospitality({...editingHospitality, type: e.target.value})}
                    >
                      <option value="dinner">Cena VIP</option>
                      <option value="lunch">Comida VIP</option>
                      <option value="meeting">Reunión de Negocios</option>
                      <option value="experience">Experiencia / Ocio</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Estado</label>
                    <select 
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent appearance-none"
                      value={editingHospitality.status || 'planned'}
                      onChange={e => setEditingHospitality({...editingHospitality, status: e.target.value})}
                    >
                      <option value="planned">Planificado</option>
                      <option value="confirmed">Confirmado</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </div>
                  
                  <FieldReview label="Título del Evento" value={editingHospitality.title} onChange={(v:any) => setEditingHospitality({...editingHospitality, title: v})} />

                  <div className="col-span-2 space-y-3 p-5 bg-purple-500/5 rounded-3xl border border-purple-500/10 relative">
                    <label className="text-[10px] font-black uppercase text-purple-400 tracking-widest px-1 flex items-center gap-2">
                      <Star size={12} /> Buscar en Catálogo Maestro
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input 
                          type="text" 
                          className="w-full bg-background border border-border rounded-xl p-3 pl-10 text-xs outline-none focus:border-purple-500/50"
                          placeholder="Buscar restaurante guardado..."
                          value={restaurantSearch}
                          onChange={e => setRestaurantSearch(e.target.value)}
                          onFocus={async () => {
                            if (catalogRestaurants.length === 0) {
                              const res = await fetchCatalogRestaurants();
                              setCatalogRestaurants(res || []);
                            }
                            if (restaurantSearch.length > 0) setShowRestaurantCatalogList(true);
                          }}
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                          <Search size={14} />
                        </div>
                        
                        <AnimatePresence>
                          {showRestaurantCatalogList && restaurantSearch.length >= 2 && (
                            <motion.div 
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              className="absolute left-0 right-0 top-full mt-2 bg-surface border border-border rounded-2xl shadow-2xl z-[130] max-h-60 overflow-y-auto"
                            >
                              {catalogRestaurants
                                .filter(r => {
                                  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                                  const search = normalize(restaurantSearch);
                                  return normalize(r.name).includes(search) || 
                                         (r.city && normalize(r.city).includes(search)) ||
                                         (r.address && normalize(r.address).includes(search));
                                })
                                .map(res => (
                                  <button
                                    key={res.id}
                                    type="button"
                                    className="w-full text-left p-4 hover:bg-purple-500/10 border-b border-border/50 last:border-0 flex justify-between items-center group"
                                    onClick={() => {
                                      setEditingHospitality({
                                        ...editingHospitality,
                                        title: editingHospitality.title || res.name,
                                        venue_name: res.name,
                                        venue_address: res.address || '',
                                        location: res.address || '',
                                        latitude: res.latitude,
                                        longitude: res.longitude,
                                        master_restaurant_id: res.id,
                                        website_url: res.website || editingHospitality.website_url
                                      });
                                      setRestaurantSearch('');
                                      setShowRestaurantCatalogList(false);
                                    }}
                                  >
                                    <div>
                                      <p className="text-xs font-black text-foreground group-hover:text-purple-400 transition-colors">{res.name}</p>
                                      <p className="text-[10px] text-muted">{res.city}{res.address ? ` · ${res.address}` : ''}</p>
                                    </div>
                                    <Plus size={16} className="text-purple-400 opacity-0 group-hover:opacity-100 transition-all" />
                                  </button>
                                ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-2 space-y-3 p-5 bg-accent/5 rounded-3xl border border-accent/10 relative">
                    <label className="text-[10px] font-black uppercase text-accent tracking-widest px-1 flex items-center gap-2">
                      <Search size={12} /> Buscar Restaurante / Ubicación
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          type="text" 
                          className="w-full bg-background border border-border rounded-xl p-3 pl-10 text-xs outline-none focus:border-accent"
                          placeholder="Nombre del restaurante, club..."
                          value={hospPlaceSearch}
                          onChange={e => setHospPlaceSearch(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const search = async () => {
                                setIsSearchingHosp(true);
                                const res = await searchPlacesAction(hospPlaceSearch);
                                if (res.success) {
                                  setHospPlaceResults(res.results || []);
                                  setShowHospPlaceList(true);
                                }
                                setIsSearchingHosp(false);
                              };
                              search();
                            }
                          }}
                          onFocus={() => hospPlaceResults.length > 0 && setShowHospPlaceList(true)}
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                          {isSearchingHosp ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        </div>
                      </div>
                      <Button 
                        type="button"
                        variant="outline" 
                        className="rounded-xl px-4 border-accent/20 text-accent hover:bg-accent/10 whitespace-nowrap"
                        onClick={async () => {
                          setIsSearchingHosp(true);
                          const res = await searchPlacesAction(hospPlaceSearch);
                          if (res.success) {
                            setHospPlaceResults(res.results || []);
                            setShowHospPlaceList(true);
                          }
                          setIsSearchingHosp(false);
                        }}
                        disabled={isSearchingHosp}
                      >
                        Buscar
                      </Button>
                    </div>

                    <AnimatePresence>
                      {showHospPlaceList && hospPlaceResults.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          className="absolute left-0 right-0 top-full mt-2 bg-surface border border-border rounded-2xl shadow-2xl z-[120] max-h-60 overflow-y-auto"
                        >
                               {hospPlaceResults.map(place => (
                                <button
                                  key={place.place_id}
                                  type="button"
                                  className="w-full text-left p-4 hover:bg-accent/10 border-b border-border/50 last:border-0 flex justify-between items-center group"
                                  onClick={async () => {
                                    const res = await getPlaceDetailsAction(place.place_id);
                                    if (res.success && res.place) {
                                      setEditingHospitality({
                                        ...editingHospitality,
                                        title: editingHospitality.title || res.place.name,
                                        venue_name: res.place.name,
                                        venue_address: res.place.formatted_address,
                                        location: res.place.formatted_address,
                                        latitude: res.place.geometry?.location?.lat,
                                        longitude: res.place.geometry?.location?.lng,
                                        google_place_id: res.place.place_id,
                                        website_url: res.place.website || editingHospitality.website_url
                                      });
                                      setHospPlaceSearch('');
                                      setShowHospPlaceList(false);
                                    }
                                  }}
                                >
                                  <div>
                                    <p className="text-xs font-black text-foreground group-hover:text-accent transition-colors">{place.name}</p>
                                    <p className="text-[10px] text-muted">{place.formatted_address}</p>
                                  </div>
                                  <Plus size={16} className="text-accent opacity-0 group-hover:opacity-100 transition-all" />
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      {editingHospitality.venue_name && !editingHospitality.master_restaurant_id && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full mt-2 border border-dashed border-purple-500/30 text-purple-400 text-[10px] font-black uppercase tracking-widest py-3 rounded-2xl hover:bg-purple-500/5"
                          onClick={async () => {
                            try {
                              const saved = await saveRestaurantToCatalog({
                                name: editingHospitality.venue_name,
                                address: editingHospitality.venue_address || editingHospitality.location,
                                google_place_id: editingHospitality.google_place_id,
                                latitude: editingHospitality.latitude,
                                longitude: editingHospitality.longitude,
                                website: editingHospitality.website_url
                              });
                              if (saved) {
                                setEditingHospitality({ ...editingHospitality, master_restaurant_id: saved.id });
                                await fetchCatalogRestaurants(); // Refresh list
                                await alert({ title: 'Éxito', message: 'Restaurante guardado en el catálogo maestro.', type: 'success' });
                              }
                            } catch (err: any) {
                              await alert({ title: 'Error', message: 'No se pudo guardar en el catálogo.', type: 'danger' });
                            }
                          }}
                        >
                          <Star size={12} className="mr-2" /> Guardar en Catálogo Maestro
                        </Button>
                      )}

                   <FieldReview label="Ubicación Detallada" value={editingHospitality.location} onChange={(v:any) => setEditingHospitality({...editingHospitality, location: v})} />
                  
                  <div className="col-span-2">
                    <FieldReview label="Descripción / Menú" value={editingHospitality.description} onChange={(v:any) => setEditingHospitality({...editingHospitality, description: v})} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Inicio (Fecha/Hora)</label>
                    <input 
                      type="datetime-local" 
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent"
                      value={editingHospitality.start_datetime?.slice(0, 16) || ''}
                      onChange={e => setEditingHospitality({...editingHospitality, start_datetime: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Fin (Opcional)</label>
                    <input 
                      type="datetime-local" 
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent"
                      value={editingHospitality.end_datetime?.slice(0, 16) || ''}
                      onChange={e => setEditingHospitality({...editingHospitality, end_datetime: e.target.value})}
                    />
                  </div>

                  <FieldReview label="Lugar (Establecimiento)" value={editingHospitality.venue_name} onChange={(v:any) => setEditingHospitality({...editingHospitality, venue_name: v})} />
                  <FieldReview label="Dirección" value={editingHospitality.venue_address} onChange={(v:any) => setEditingHospitality({...editingHospitality, venue_address: v})} />
                  
                  <FieldReview label="Dress Code" value={editingHospitality.dress_code} onChange={(v:any) => setEditingHospitality({...editingHospitality, dress_code: v})} />
                  <FieldReview label="Cód. Reserva" value={editingHospitality.reservation_code} onChange={(v:any) => setEditingHospitality({...editingHospitality, reservation_code: v})} />
                  
                  <FieldReview label="Nombre Reserva" value={editingHospitality.reservation_name} onChange={(v:any) => setEditingHospitality({...editingHospitality, reservation_name: v})} />
                  <FieldReview label="Contacto Lugar" value={editingHospitality.contact_name} onChange={(v:any) => setEditingHospitality({...editingHospitality, contact_name: v})} />
                  
                  <FieldReview label="Teléf. Contacto" value={editingHospitality.contact_phone} onChange={(v:any) => setEditingHospitality({...editingHospitality, contact_phone: v})} />
                  <FieldReview label="Dress Code" value={editingHospitality.dress_code} onChange={(v:any) => setEditingHospitality({...editingHospitality, dress_code: v})} />

                  <div className="col-span-2">
                    <FieldReview 
                      label="Notas Internas / Menú" 
                      value={editingHospitality.notes} 
                      onChange={(v:any) => setEditingHospitality({...editingHospitality, notes: v})} 
                      placeholder="Añadir detalles importantes..."
                    />
                  </div>

                  <div className="col-span-2">
                    <FieldReview 
                      label="Imagen del Evento (URL)" 
                      value={editingHospitality.image_url} 
                      onChange={(v:any) => setEditingHospitality({...editingHospitality, image_url: v})} 
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="private_room"
                        checked={editingHospitality.private_room}
                        onChange={e => setEditingHospitality({...editingHospitality, private_room: e.target.checked})}
                      />
                      <label htmlFor="private_room" className="text-[10px] font-black uppercase text-muted tracking-widest">Sala Privada</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="visible_to_client"
                        checked={editingHospitality.visible_to_client}
                        onChange={e => setEditingHospitality({...editingHospitality, visible_to_client: e.target.checked})}
                      />
                      <label htmlFor="visible_to_client" className="text-[10px] font-black uppercase text-muted tracking-widest">Visible al Cliente</label>
                    </div>
                  </div>
                </div>

                {/* BLOQUE ASISTENTES */}
                <div className="pt-8 border-t border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase text-accent tracking-[0.2em]">Asistentes ({editingHospitality.attendees?.filter((a:any) => !a.deleted_at).length || 0})</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="h-7 text-[9px] font-black uppercase tracking-widest text-accent hover:bg-accent/10 rounded-lg px-3 disabled:opacity-40"
                      disabled={!editingHospitality.id}
                      title={!editingHospitality.id ? 'Guarda el evento primero' : 'Añadir asistente'}
                      onClick={() => {
                        setAttendeeError(null);
                        setEditingAttendee({
                          event_id: editingHospitality.id,
                          attendance_status: 'pending',
                          transport_required: false,
                          guest_name: '',
                          guest_email: '',
                          dietary_restrictions: '',
                          notes: '',
                        });
                      }}
                    >
                      <Plus size={12} className="mr-1" /> Añadir Asistente
                    </Button>
                    {!editingHospitality.id && (
                      <span className="text-[8px] text-amber-500 font-bold">Guarda el evento primero</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {editingHospitality.attendees?.filter((a:any) => !a.deleted_at).map((attendee: any) => {
                      const profile = contextProfiles.find(p => p.id === attendee.profile_id);
                      return (
                        <div key={attendee.id} className="p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-[10px] font-black shrink-0">
                              {(attendee.guest_name || profile?.nombre || '?')[0].toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold text-foreground truncate">
                                {attendee.guest_name || `${profile?.nombre || ''} ${profile?.apellidos || ''}`.trim() || 'Invitado'}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                  attendee.attendance_status === 'confirmed' ? 'bg-green-500/10 text-green-500' : 
                                  attendee.attendance_status === 'declined' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'
                                }`}>
                                  {attendee.attendance_status}
                                </span>
                                {attendee.transport_required && (
                                  <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">Transporte</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              className="h-8 w-8 p-0"
                              onClick={() => { setAttendeeError(null); setEditingAttendee(attendee); }}
                            >
                              <Edit2 size={12} className="text-muted" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              className="h-8 w-8 p-0"
                              onClick={async () => {
                                if (await confirm({ title: 'Eliminar Asistente', message: `¿Eliminar a ${attendee.guest_name || 'este asistente'} del evento?` })) {
                                  try {
                                    await deleteAttendee(attendee.id);
                                    // Reload from DB
                                    const freshAttendees = await getEventAttendees(editingHospitality.id);
                                    setEditingHospitality((prev: any) => ({ ...prev, attendees: freshAttendees }));
                                  } catch (err: any) {
                                    alert({ title: 'Error', message: err.message, type: 'danger' });
                                  }
                                }
                              }}
                            >
                              <Trash2 size={12} className="text-red-500" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-6 border-t border-border flex gap-4">
                  <Button variant="ghost" type="button" className="flex-1 rounded-2xl py-6 font-bold" onClick={() => setEditingHospitality(null)}>Cancelar</Button>
                  <Button type="submit" className="flex-2 rounded-2xl py-6 font-black uppercase tracking-widest text-xs" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Guardar Evento'}
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
            loadData();
          }}
        />
      )}
      {/* Attendee Management Modal */}
      <AnimatePresence>
        {editingAttendee && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (!attendeeSaving) { setEditingAttendee(null); setAttendeeError(null); } }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-surface rounded-[32px] shadow-2xl overflow-hidden border border-border max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <UserPlus size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-foreground tracking-tight">
                      {editingAttendee.id ? 'Editar Asistente' : 'Añadir Asistente'}
                    </h3>
                    <p className="text-[9px] text-muted font-black uppercase tracking-widest">
                      {editingHospitality?.title || 'Evento Hospitality'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { if (!attendeeSaving) { setEditingAttendee(null); setAttendeeError(null); } }}
                  className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                  disabled={attendeeSaving}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">

                {/* Error banner */}
                {attendeeError && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-medium text-red-600 leading-relaxed">{attendeeError}</p>
                  </div>
                )}

                {/* Link to platform user */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1 flex items-center gap-2">
                    <Users size={11} />
                    Vincular a usuario del plan
                    {profilesLoading && <Loader2 size={10} className="animate-spin" />}
                  </label>
                  {contextProfiles.length > 0 ? (
                    <select
                      className="w-full bg-background border border-border rounded-xl p-3 text-sm outline-none focus:border-accent appearance-none transition-colors"
                      value={editingAttendee.profile_id || ''}
                      onChange={e => {
                        const profileId = e.target.value;
                        const profile = contextProfiles.find((p: any) => p.id === profileId);
                        setEditingAttendee({
                          ...editingAttendee,
                          profile_id: profileId || null,
                          guest_name: profile ? `${profile.nombre} ${profile.apellidos}` : editingAttendee.guest_name,
                          guest_email: profile ? profile.email : editingAttendee.guest_email,
                        });
                      }}
                    >
                      <option value="">— Invitado externo (sin cuenta) —</option>
                      {contextProfiles.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} {p.apellidos} · {p.email}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/50">
                      <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                      <p className="text-xs text-muted">
                        {profilesLoading ? 'Cargando usuarios…' : 'No hay usuarios asignados a este congreso. Puedes añadir un asistente externo manualmente.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[9px] font-black text-muted uppercase tracking-widest">O datos manuales</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Manual name / email */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Nombre</label>
                    <input
                      type="text"
                      value={editingAttendee.guest_name || ''}
                      onChange={e => setEditingAttendee({ ...editingAttendee, guest_name: e.target.value })}
                      placeholder="Dr. García López"
                      className="w-full bg-background border border-border rounded-xl p-3 text-sm outline-none focus:border-accent transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1 flex items-center gap-1">
                      <Mail size={9} /> Email
                    </label>
                    <input
                      type="email"
                      value={editingAttendee.guest_email || ''}
                      onChange={e => setEditingAttendee({ ...editingAttendee, guest_email: e.target.value })}
                      placeholder="dr@hospital.es"
                      className="w-full bg-background border border-border rounded-xl p-3 text-sm outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>

                {/* Status + Transport */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Estado</label>
                    <select
                      className="w-full bg-background border border-border rounded-xl p-3 text-sm outline-none focus:border-accent appearance-none transition-colors"
                      value={editingAttendee.attendance_status || 'pending'}
                      onChange={e => setEditingAttendee({ ...editingAttendee, attendance_status: e.target.value })}
                    >
                      <option value="pending">⏳ Pendiente</option>
                      <option value="confirmed">✅ Confirmado</option>
                      <option value="declined">❌ Declinado</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Transporte</label>
                    <button
                      type="button"
                      onClick={() => setEditingAttendee({ ...editingAttendee, transport_required: !editingAttendee.transport_required })}
                      className={`w-full p-3 rounded-xl border text-sm font-bold transition-all flex items-center gap-2 ${
                        editingAttendee.transport_required
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-600'
                          : 'bg-background border-border text-muted'
                      }`}
                    >
                      <Car size={14} />
                      {editingAttendee.transport_required ? 'Necesita traslado' : 'Sin traslado'}
                    </button>
                  </div>
                </div>

                {/* Dietary restrictions */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Restricciones dietéticas</label>
                  <input
                    type="text"
                    value={editingAttendee.dietary_restrictions || ''}
                    onChange={e => setEditingAttendee({ ...editingAttendee, dietary_restrictions: e.target.value })}
                    placeholder="Alérgico a frutos secos, vegano, sin gluten…"
                    className="w-full bg-background border border-border rounded-xl p-3 text-sm outline-none focus:border-accent transition-colors"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Notas internas</label>
                  <textarea
                    value={editingAttendee.notes || ''}
                    onChange={e => setEditingAttendee({ ...editingAttendee, notes: e.target.value })}
                    placeholder="Observaciones para el coordinador…"
                    rows={2}
                    className="w-full bg-background border border-border rounded-xl p-3 text-sm outline-none focus:border-accent transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border flex gap-3 flex-shrink-0 bg-surface">
                <Button
                  variant="ghost"
                  className="flex-1 rounded-2xl py-5 font-bold"
                  onClick={() => { setEditingAttendee(null); setAttendeeError(null); }}
                  disabled={attendeeSaving}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-[2] rounded-2xl py-5 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                  disabled={attendeeSaving || (!editingAttendee.guest_name && !editingAttendee.profile_id)}
                  onClick={async () => {
                    // Validate
                    if (!editingAttendee.event_id) {
                      setAttendeeError('Guarda primero el evento antes de añadir asistentes.');
                      return;
                    }
                    if (!editingAttendee.guest_name && !editingAttendee.profile_id) {
                      setAttendeeError('Indica un nombre o selecciona un usuario del plan.');
                      return;
                    }
                    setAttendeeSaving(true);
                    setAttendeeError(null);
                    try {
                      await saveAttendee({
                        id: editingAttendee.id,
                        event_id: editingAttendee.event_id,
                        profile_id: editingAttendee.profile_id || null,
                        guest_name: editingAttendee.guest_name || '',
                        guest_email: editingAttendee.guest_email || '',
                        attendance_status: editingAttendee.attendance_status || 'pending',
                        dietary_restrictions: editingAttendee.dietary_restrictions || '',
                        transport_required: editingAttendee.transport_required || false,
                        notes: editingAttendee.notes || '',
                      });
                      // Reload attendees from DB to stay in sync
                      const freshAttendees = await getEventAttendees(editingAttendee.event_id);
                      setEditingHospitality((prev: any) => ({ ...prev, attendees: freshAttendees }));
                      setEditingAttendee(null);
                    } catch (err: any) {
                      setAttendeeError(err.message || 'Error al guardar. Inténtalo de nuevo.');
                    } finally {
                      setAttendeeSaving(false);
                    }
                  }}
                >
                  {attendeeSaving ? (
                    <><Loader2 size={14} className="animate-spin" /> Guardando…</>
                  ) : (
                    <><Check size={14} /> {editingAttendee.id ? 'Guardar cambios' : 'Añadir asistente'}</>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EVENT SELECTOR MODAL --- */}
      <AnimatePresence>
        {showEventSelector && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background border border-border w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-border flex justify-between items-start bg-muted/20">
                <div>
                  <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-1">Vincular Invitación</p>
                  <h3 className="text-2xl font-black tracking-tighter">Eventos Disponibles</h3>
                  <p className="text-xs text-muted mt-1">Selecciona un evento de la lista central para este usuario.</p>
                </div>
                <button onClick={() => setShowEventSelector(false)} className="p-2.5 rounded-2xl bg-surface border border-border text-muted hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 max-h-[50vh] overflow-y-auto space-y-3">
                {contextEvents.length === 0 ? (
                  <p className="text-center py-10 text-xs text-muted">No hay eventos globales registrados para este congreso.</p>
                ) : (
                  contextEvents
                    .filter(ev => !selectedPlan.hospitality_events?.some((se: any) => se.id === ev.id))
                    .map(ev => (
                    <button
                      key={ev.id}
                      onClick={async () => {
                        try {
                          setIsSubmitting(true);
                          await saveAttendee({
                            event_id: ev.id,
                            profile_id: selectedPlan.user_id,
                            attendance_status: 'pending',
                            transport_required: false,
                          });
                          setShowEventSelector(false);
                          handleManagePlan(selectedPlan); // Refresh
                          loadData(); // Refresh counts
                        } catch (err: any) {
                          alert({ title: 'Error', message: err.message, type: 'danger' });
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      className="w-full text-left p-4 rounded-2xl border border-border bg-surface hover:border-accent/50 transition-all group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-black text-foreground">{ev.title}</span>
                            <span className="px-1.5 py-0.5 rounded-md bg-accent/10 text-accent text-[8px] font-black uppercase">{ev.type}</span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-[10px] text-muted">
                            <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(ev.start_datetime).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Clock size={10} /> {displayLocalTime(ev.start_datetime)}</span>
                            <span className="flex items-center gap-1"><MapPin size={10} /> {ev.venue_name}</span>
                          </div>
                        </div>
                        <Plus size={16} className="text-muted group-hover:text-accent transition-colors" />
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="p-6 border-t border-border bg-surface">
                <Button variant="ghost" className="w-full rounded-2xl" onClick={() => setShowEventSelector(false)}>
                  Cerrar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Edición de Traslado */}
      <AnimatePresence>
        {editingTransfer && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background border border-border w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl my-8"
            >
              <div className="p-8 border-b border-border flex justify-between items-center bg-muted/20">
                <div>
                  <h3 className="text-2xl font-black text-primary tracking-tighter">Gestionar Traslado</h3>
                  <p className="text-[10px] text-muted font-black uppercase tracking-widest mt-1">Logística de Desplazamiento</p>
                </div>
                <Button variant="ghost" className="rounded-full h-10 w-10 p-0" onClick={() => setEditingTransfer(null)}>
                  <X size={24} />
                </Button>
              </div>
              
              <form onSubmit={handleSaveTransfer} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Tipo de Trayecto</label>
                    <select 
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent appearance-none"
                      value={editingTransfer.type}
                      onChange={e => setEditingTransfer({...editingTransfer, type: e.target.value})}
                    >
                      <option value="airport_to_hotel">Aeropuerto → Hotel</option>
                      <option value="hotel_to_airport">Hotel → Aeropuerto</option>
                      <option value="hotel_to_restaurant">Hotel → Restaurante</option>
                      <option value="restaurant_to_hotel">Restaurante → Hotel</option>
                      <option value="hotel_to_venue">Hotel → Venue / Sede</option>
                      <option value="venue_to_hotel">Venue / Sede → Hotel</option>
                      <option value="custom">Otro / Personalizado</option>
                    </select>
                  </div>

                  <FieldReview label="Origen / Recogida" value={editingTransfer.pickup_location} onChange={(v:any) => setEditingTransfer({...editingTransfer, pickup_location: v})} />
                  <FieldReview label="Destino / Entrega" value={editingTransfer.dropoff_location} onChange={(v:any) => setEditingTransfer({...editingTransfer, dropoff_location: v})} />
                  <FieldReview label="Fecha y Hora Recogida" type="datetime-local" value={editingTransfer.pickup_datetime} onChange={(v:any) => setEditingTransfer({...editingTransfer, pickup_datetime: v})} />
                  <FieldReview label="Nombre Pasajero/s" value={editingTransfer.passenger_name} onChange={(v:any) => setEditingTransfer({...editingTransfer, passenger_name: v})} />
                  
                  <div className="col-span-2 pt-4 border-t border-border">
                    <p className="text-[10px] font-black uppercase text-accent tracking-[0.2em] mb-4">Detalles del Servicio</p>
                    <div className="grid grid-cols-2 gap-4">
                      <FieldReview label="Nombre del Chófer" value={editingTransfer.driver_name} optional={true} onChange={(v:any) => setEditingTransfer({...editingTransfer, driver_name: v})} />
                      <FieldReview label="Teléfono Chófer" value={editingTransfer.driver_phone} optional={true} onChange={(v:any) => setEditingTransfer({...editingTransfer, driver_phone: v})} />
                      <FieldReview label="Tipo de Vehículo" value={editingTransfer.vehicle_type} optional={true} onChange={(v:any) => setEditingTransfer({...editingTransfer, vehicle_type: v})} />
                      <FieldReview label="Empresa de Transporte" value={editingTransfer.company_name} optional={true} onChange={(v:any) => setEditingTransfer({...editingTransfer, company_name: v})} />
                    </div>
                  </div>

                  <div className="col-span-2 space-y-4 pt-4 border-t border-border">
                    <p className="text-[10px] font-black uppercase text-accent tracking-[0.2em]">Asociar Logística (Opcional)</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-muted tracking-widest px-1">Vuelo Relacionado</label>
                        <select 
                          className="w-full bg-background border border-border rounded-xl p-3 text-[10px] outline-none focus:border-accent appearance-none"
                          value={editingTransfer.related_flight_id || ''}
                          onChange={e => setEditingTransfer({...editingTransfer, related_flight_id: e.target.value || null})}
                        >
                          <option value="">Ninguno</option>
                          {selectedPlan.flights?.map((f:any) => (
                            <option key={f.id} value={f.id}>{f.flight_number} · {f.departure_location} → {f.arrival_location}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-muted tracking-widest px-1">Hotel Relacionado</label>
                        <select 
                          className="w-full bg-background border border-border rounded-xl p-3 text-[10px] outline-none focus:border-accent appearance-none"
                          value={editingTransfer.related_hotel_id || ''}
                          onChange={e => setEditingTransfer({...editingTransfer, related_hotel_id: e.target.value || null})}
                        >
                          <option value="">Ninguno</option>
                          {selectedPlan.hotel_stays?.map((h:any) => (
                            <option key={h.id} value={h.id}>{h.hotel_name} · {h.booking_reference}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-muted tracking-widest px-1">Evento VIP</label>
                        <select 
                          className="w-full bg-background border border-border rounded-xl p-3 text-[10px] outline-none focus:border-accent appearance-none"
                          value={editingTransfer.related_hospitality_id || ''}
                          onChange={e => setEditingTransfer({...editingTransfer, related_hospitality_id: e.target.value || null})}
                        >
                          <option value="">Ninguno</option>
                          {selectedPlan.hospitality_events?.map((ev:any) => (
                            <option key={ev.id} value={ev.id}>{ev.title} · {ev.venue_name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <FieldReview label="Localizador / Ref. Reserva" value={editingTransfer.booking_reference} optional={true} onChange={(v:any) => setEditingTransfer({...editingTransfer, booking_reference: v})} />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <FieldReview label="Notas adicionales" value={editingTransfer.notes} optional={true} onChange={(v:any) => setEditingTransfer({...editingTransfer, notes: v})} />
                  </div>

                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-muted tracking-widest px-1">Estado</label>
                      <select 
                        className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none focus:border-accent appearance-none"
                        value={editingTransfer.status}
                        onChange={e => setEditingTransfer({...editingTransfer, status: e.target.value})}
                      >
                        <option value="planned">Planificado</option>
                        <option value="confirmed">Confirmado</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input 
                        type="checkbox" 
                        id="transfer_visible"
                        checked={editingTransfer.visible_to_client}
                        onChange={e => setEditingTransfer({...editingTransfer, visible_to_client: e.target.checked})}
                      />
                      <label htmlFor="transfer_visible" className="text-[10px] font-black uppercase text-muted tracking-widest">Visible al Cliente</label>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-border flex gap-4">
                  <Button variant="ghost" type="button" className="flex-1 rounded-2xl py-6 font-bold" onClick={() => setEditingTransfer(null)}>Cancelar</Button>
                  <Button type="submit" className="flex-2 rounded-2xl py-6 font-black uppercase tracking-widest text-xs" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Guardar Traslado'}
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

function SmartDistances({ plan, routes, onCalculate, isCalculating }: { plan: any, routes: any[], onCalculate: () => void, isCalculating: boolean }) {
  const hotel = plan.hotel_stays?.[0];
  const context = plan.contexts;
  const hospitality = plan.hospitality_events?.[0]; 
  const flight = plan.flights?.find((f: any) => f.type === 'outbound');

  const AIRPORT_COORDS: Record<string, { lat: number, lng: number }> = {
    'VLC': { lat: 39.4893, lng: -0.4816 },
    'ORY': { lat: 48.7262, lng: 2.3652 },
    'MAD': { lat: 40.4983, lng: -3.5676 },
    'BCN': { lat: 41.2974, lng: 2.0833 },
    'CDG': { lat: 49.0097, lng: 2.5479 },
    'FRA': { lat: 50.0379, lng: 8.5622 },
    'MUC': { lat: 48.3537, lng: 11.7750 },
    'AMS': { lat: 52.3105, lng: 4.7683 },
    'LHR': { lat: 51.4700, lng: -0.4543 },
    'LGW': { lat: 51.1537, lng: -0.1821 }
  };

  const airport = flight?.arrival_location ? AIRPORT_COORDS[flight.arrival_location.toUpperCase()] : null;

  const calculateRoute = (origin: any, destination: any, title: string) => {
    if (!origin.lat || !origin.lng || !destination.lat || !destination.lng) return;

    // Use the multi-mode action to get all data at once
    import('@/actions/travel-routes-actions').then(m => {
      m.calculateMultiModeRouteAction({
        planId: plan.id,
        originLabel: origin.label,
        originLat: origin.lat,
        originLng: origin.lng,
        destinationLabel: destination.label,
        destinationLat: destination.lat,
        destinationLng: destination.lng
      }).then(res => {
        if (res.success) {
          onCalculate(); // Re-fetch from parent
        } else {
          window.alert('Error al calcular: ' + (res.error || 'Error desconocido'));
        }
      }).catch(err => {
        console.error('Calculation error:', err);
      });
    });
  };

  const getRoutes = (originLabel: string, destLabel: string) => {
    return routes.filter(r => {
      const matchesOrigin = r.origin_label?.toLowerCase().includes(originLabel.toLowerCase()) || originLabel.toLowerCase().includes(r.origin_label?.toLowerCase() || '');
      const matchesDest = r.destination_label?.toLowerCase().includes(destLabel.toLowerCase()) || destLabel.toLowerCase().includes(r.destination_label?.toLowerCase() || '');
      return matchesOrigin && matchesDest;
    });
  };

  const RouteItem = ({ title, origin, destination, icon: Icon }: any) => {
    const rts = getRoutes(origin.label, destination.label);
    const hasCoords = origin.lat && origin.lng && destination.lat && destination.lng;

    const walking = rts.find(r => r.travel_mode === 'WALKING');
    const driving = rts.find(r => r.travel_mode === 'DRIVING');
    const transit = rts.find(r => r.travel_mode === 'TRANSIT');

    return (
      <div className="bg-background border border-border rounded-3xl p-5 hover:border-accent/30 transition-all group">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/5 text-accent border border-accent/10">
              <Icon size={18} />
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase text-muted tracking-widest">{title}</h4>
              <p className="text-xs font-bold text-foreground truncate max-w-[150px]">{origin.label} → {destination.label}</p>
            </div>
          </div>
          {hasCoords && (rts.length === 0 || rts.length < 3) && (
            <Button 
              size="sm" 
              variant="outline" 
              className="rounded-xl h-8 text-[9px] font-black uppercase tracking-widest border-accent/20 text-accent"
              onClick={() => calculateRoute(origin, destination, title)}
              disabled={isCalculating}
            >
              {isCalculating ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} className="mr-1" />}
              {rts.length > 0 ? 'Recalcular' : 'Calcular'}
            </Button>
          )}
        </div>

        {rts.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
            <div className="space-y-0.5">
              <p className="text-[8px] font-black text-muted uppercase">Andando</p>
              <p className="text-[10px] font-black text-foreground">{walking?.duration_text || '—'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[8px] font-black text-muted uppercase">Taxi/Coche</p>
              <p className="text-[10px] font-black text-accent">{driving?.duration_text || '—'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[8px] font-black text-muted uppercase">Transporte</p>
              <p className="text-[10px] font-black text-blue-500">{transit?.duration_text || '—'}</p>
            </div>
          </div>
        ) : !hasCoords ? (
          <div className="flex items-center gap-2 text-orange-500 bg-orange-500/5 p-3 rounded-2xl border border-orange-500/10">
            <AlertCircle size={14} />
            <p className="text-[10px] font-bold uppercase tracking-tight">Faltan coordenadas</p>
          </div>
        ) : (
          <p className="text-[10px] text-muted font-medium italic">Pendiente de cálculo</p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-surface border border-border rounded-[2.5rem] p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-black font-heading tracking-tight flex items-center gap-3">
            <Navigation className="text-accent" /> Distancias Inteligentes
          </h3>
          <p className="text-[10px] text-muted font-black uppercase tracking-widest mt-1">Sincronización con Google Distance Matrix</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hotel && context && (
          <RouteItem 
            title="Hotel → Sede"
            origin={{ label: 'Hotel', lat: hotel.latitude, lng: hotel.longitude }}
            destination={{ label: 'Sede Evento', lat: context.latitude, lng: context.longitude }}
            icon={MapPin}
          />
        )}
        
        {airport && hotel && (
          <RouteItem 
            title="Aeropuerto → Hotel"
            origin={{ label: flight.arrival_location, lat: airport.lat, lng: airport.lng }}
            destination={{ label: 'Hotel', lat: hotel.latitude, lng: hotel.longitude }}
            icon={Plane}
          />
        )}

        {hotel && hospitality && (
          <RouteItem 
            title="Hotel → Cena"
            origin={{ label: 'Hotel', lat: hotel.latitude, lng: hotel.longitude }}
            destination={{ label: hospitality.title, lat: hospitality.latitude, lng: hospitality.longitude }}
            icon={Utensils}
          />
        )}

        {airport && hotel && (
          <RouteItem 
            title="Hotel → Aeropuerto"
            origin={{ label: 'Hotel', lat: hotel.latitude, lng: hotel.longitude }}
            destination={{ label: flight.arrival_location, lat: airport.lat, lng: airport.lng }}
            icon={Plane}
          />
        )}
      </div>
    </div>
  );
}

