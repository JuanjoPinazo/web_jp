'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Building2, 
  Stethoscope, 
  Briefcase, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  MoreVertical,
  User as UserIcon,
  Globe,
  Utensils,
  LayoutGrid,
  List
} from 'lucide-react';
import { Button } from '@/components/Button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialog } from '@/context/DialogContext';
import { searchPlacesAction, getPlaceDetailsAction } from '@/actions/google-places-actions';

type CatalogType = 'hospitals' | 'departments' | 'roles' | 'companies' | 'hotels' | 'restaurants';

export default function CatalogsPage() {
  const [activeTab, setActiveTab] = useState<CatalogType>('hospitals');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Form states
  const [formData, setFormData] = useState<any>({});
  const { confirm, alert } = useDialog();
  
  // Google Import State
  const [importSearch, setImportSearch] = useState('');
  const [importResults, setImportResults] = useState<any[]>([]);
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
  const [isSelectingPlace, setIsSelectingPlace] = useState(false);
  const [showImportList, setShowImportList] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setImportSearch('');
    setImportResults([]);
    setShowImportList(false);
    try {
      let query;
      if (activeTab === 'hospitals') {
        query = supabase.from('hospitals').select('*').order('name');
      } else if (activeTab === 'departments') {
        query = supabase.from('departments').select('*').order('name');
      } else if (activeTab === 'companies') {
        query = supabase.from('companies').select('*').order('name');
      } else if (activeTab === 'hotels') {
        query = supabase.from('hotels_master').select('*').order('name');
      } else if (activeTab === 'restaurants') {
        query = supabase.from('restaurants_master').select('*').order('name');
      } else {
        query = supabase.from('professional_roles').select('*').order('name');
      }

      const { data: result, error } = await query;
      if (error) throw error;
      setData(result || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      if (err.message) console.error('Error Message:', err.message);
      if (err.details) console.error('Error Details:', err.details);
      if (err.hint) console.error('Error Hint:', err.hint);
      if (err.code) console.error('Error Code:', err.code);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item: any = null) => {
    setEditingItem(item);
    if (item) {
      setFormData(item);
    } else {
      setFormData(activeTab === 'roles' ? { scope: 'hospital' } : {});
    }
    setImportSearch('');
    setImportResults([]);
    setShowImportList(false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const isRole = activeTab === 'roles';
      const isHotel = activeTab === 'hotels';
      const isRestaurant = activeTab === 'restaurants';
      
      const table = isRole ? 'professional_roles' : (isHotel ? 'hotels_master' : (isRestaurant ? 'restaurants_master' : activeTab));
      
      // Limpiar y preparar datos según la tabla
      const { id, created_at, updated_at, ...rawUpdateData } = formData;
      const updateData: any = {};

      // Campos comunes
      if (rawUpdateData.name) updateData.name = rawUpdateData.name;
      if (rawUpdateData.city) updateData.city = rawUpdateData.city;
      
      if (isHotel || isRestaurant) {
        if (rawUpdateData.address) updateData.address = rawUpdateData.address;
        if (rawUpdateData.phone) updateData.phone = rawUpdateData.phone;
        if (rawUpdateData.website) updateData.website = rawUpdateData.website;
        if (rawUpdateData.latitude !== undefined) updateData.latitude = rawUpdateData.latitude;
        if (rawUpdateData.longitude !== undefined) updateData.longitude = rawUpdateData.longitude;
        if (rawUpdateData.rating !== undefined) updateData.rating = rawUpdateData.rating;
        if (rawUpdateData.google_place_id) updateData.google_place_id = rawUpdateData.google_place_id;
      }

      if (isHotel) {
        if (rawUpdateData.stars !== undefined) updateData.stars = rawUpdateData.stars;
        if (rawUpdateData.country) updateData.country = rawUpdateData.country;
        if (rawUpdateData.postal_code) updateData.postal_code = rawUpdateData.postal_code;
        if (rawUpdateData.preferred !== undefined) updateData.preferred = rawUpdateData.preferred;
      }

      if (isRestaurant) {
        if (rawUpdateData.cuisine_type) updateData.cuisine_type = rawUpdateData.cuisine_type;
        if (rawUpdateData.price_level !== undefined) updateData.price_level = rawUpdateData.price_level;
        if (rawUpdateData.preferred !== undefined) updateData.preferred = rawUpdateData.preferred;
      }

      if (isRole) {
        if (rawUpdateData.scope) updateData.scope = rawUpdateData.scope;
      }

      if (activeTab === 'hospitals') {
        if (rawUpdateData.code) updateData.code = rawUpdateData.code;
      }

      if (activeTab === 'companies') {
        if (rawUpdateData.tax_id) updateData.tax_id = rawUpdateData.tax_id;
      }

      let error;
      if (editingItem) {
        const { error: err } = await supabase
          .from(table)
          .update(updateData)
          .eq('id', editingItem.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from(table)
          .insert([updateData]);
        error = err;
      }

      if (error) {
        console.error('Detailed Supabase Error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          table: table,
          dataSent: updateData
        });
        throw new Error(error.message || 'Error desconocido en la base de datos');
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Full Error Object:', err);
      await alert({ 
        title: 'Error al Guardar', 
        message: `No se pudo guardar el registro: ${err.message || 'Error de conexión'}`, 
        type: 'danger' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Eliminar registro',
      message: '¿Estás seguro de que deseas eliminar este elemento?',
      type: 'danger',
      confirmText: 'Eliminar'
    });
    if (!isConfirmed) return;
    
    try {
      const table = activeTab === 'roles' ? 'professional_roles' : (activeTab === 'hotels' ? 'hotels_master' : (activeTab === 'restaurants' ? 'restaurants_master' : activeTab));
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === '23503') {
          await alert({ 
            title: 'No se puede eliminar', 
            message: 'No se puede eliminar este elemento porque está siendo utilizado por otros registros.', 
            type: 'warning' 
          });
        } else {
          throw error;
        }
      } else {
        fetchData();
      }
    } catch (err) {
      console.error('Error deleting:', err);
      await alert({ title: 'Error', message: 'Error al eliminar el registro.', type: 'danger' });
    }
  };

  const filteredData = data.filter(item => 
    (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.tax_id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black font-heading tracking-tight text-white">Catálogos del Sistema</h1>
          <p className="text-xs font-bold text-muted uppercase tracking-[0.2em]">Gestión de datos maestros y diccionarios</p>
        </div>
        <Button 
          onClick={() => handleOpenModal()}
          className="gap-2 rounded-2xl py-6 px-8 shadow-xl shadow-accent/20"
        >
          <Plus size={18} />
          {activeTab === 'hospitals' ? 'Nuevo Hospital' : activeTab === 'companies' ? 'Nueva Empresa' : activeTab === 'departments' ? 'Nuevo Servicio' : activeTab === 'hotels' ? 'Nuevo Hotel' : activeTab === 'restaurants' ? 'Nuevo Restaurante' : 'Nuevo Cargo'}
        </Button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-surface/50 p-2 rounded-[2rem] border border-border/50 backdrop-blur-sm">
        <div className="flex gap-1 p-1 bg-background/50 rounded-2xl w-full lg:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'hotels', label: 'Hoteles', icon: Building2 },
            { id: 'restaurants', label: 'Restaurantes', icon: Utensils },
            { id: 'hospitals', label: 'Hospitales', icon: Globe },
            { id: 'companies', label: 'Empresas', icon: Briefcase },
            { id: 'departments', label: 'Servicios', icon: Stethoscope },
            { id: 'roles', label: 'Cargos', icon: UserIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as CatalogType);
                  setSearchTerm('');
                }}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex-1 lg:flex-none whitespace-nowrap",
                  isActive 
                    ? "bg-accent text-background shadow-lg shadow-accent/20" 
                    : "text-muted hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-96">
            <input
              type="text"
              placeholder={`Buscar en ${activeTab === 'hospitals' ? 'hospitales' : activeTab === 'companies' ? 'empresas' : activeTab === 'departments' ? 'servicios' : activeTab === 'hotels' ? 'hoteles' : activeTab === 'restaurants' ? 'restaurantes' : 'cargos'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background/50 border border-border rounded-2xl py-3 pl-11 pr-4 text-xs font-bold outline-none focus:border-accent/40 transition-all placeholder:text-muted/50"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
          </div>

          <div className="flex gap-1 p-1 bg-background/50 rounded-xl border border-border/50">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'grid' ? "bg-accent text-background shadow-md" : "text-muted hover:text-white"
              )}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'list' ? "bg-accent text-background shadow-md" : "text-muted hover:text-white"
              )}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative min-h-[400px]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-accent" size={40} />
              <p className="text-[10px] font-black text-muted uppercase tracking-widest">Cargando registros...</p>
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" 
                : "flex flex-col gap-3"
            )}
          >
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                viewMode === 'grid' ? (
                  <div 
                    key={item.id}
                    className="group bg-surface border border-border rounded-[2rem] p-6 hover:border-accent/30 transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none group-hover:bg-accent/10 transition-colors" />
                    
                    <div className="flex items-start justify-between relative z-10">
                      <div className="space-y-4 flex-1">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {activeTab === 'hospitals' && <Globe className="text-accent" size={14} />}
                            {activeTab === 'hotels' && <Building2 className="text-accent" size={14} />}
                            {activeTab === 'restaurants' && <Utensils className="text-accent" size={14} />}
                            {activeTab === 'companies' && <Briefcase className="text-accent" size={14} />}
                            {activeTab === 'departments' && <Stethoscope className="text-accent" size={14} />}
                            {activeTab === 'roles' && <UserIcon className="text-accent" size={14} />}
                            <h3 className="font-bold text-white leading-tight flex items-center gap-2">
                              {item.name}
                              {item.preferred && <span className="text-[8px] bg-amber-500/20 text-amber-500 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase font-black tracking-tighter">Top</span>}
                            </h3>
                          </div>
                          
                          {(activeTab === 'hospitals' || activeTab === 'companies' || activeTab === 'hotels' || activeTab === 'restaurants') && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {(item.code || item.tax_id) && (
                                <span className="px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent text-[8px] font-black uppercase tracking-widest">
                                  [{item.code || item.tax_id}]
                                </span>
                              )}
                              {item.city && (
                                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted text-[8px] font-bold uppercase tracking-widest">
                                  {item.city}
                                </span>
                              )}
                              {activeTab === 'restaurants' && item.cuisine_type && (
                                <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[8px] font-black uppercase tracking-widest">
                                  {item.cuisine_type}
                                </span>
                              )}
                              {activeTab === 'restaurants' && item.price_level && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest">
                                  {'€'.repeat(item.price_level)}
                                </span>
                              )}
                              {activeTab === 'hotels' && item.stars && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] font-black uppercase tracking-widest">
                                  {item.stars} ★
                                </span>
                              )}
                            </div>
                          )}

                          {activeTab === 'roles' && item.scope && (
                            <span className={cn(
                              "inline-block px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest",
                              item.scope === 'hospital' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            )}>
                              {item.scope}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 pt-2">
                          <button 
                            onClick={() => handleOpenModal(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-border text-muted hover:text-accent hover:border-accent/40 transition-all text-[10px] font-bold uppercase tracking-widest"
                          >
                            <Edit2 size={12} />
                            Editar
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-border text-muted hover:text-red-500 hover:border-red-500/40 transition-all text-[10px] font-bold uppercase tracking-widest"
                          >
                            <Trash2 size={12} />
                            Borrar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div 
                    key={item.id}
                    className="group bg-surface/40 hover:bg-surface border border-border rounded-2xl p-4 flex items-center justify-between gap-4 transition-all hover:border-accent/30"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-accent shrink-0 group-hover:bg-accent/5 group-hover:border-accent/20 transition-all">
                        {activeTab === 'hospitals' && <Globe size={18} />}
                        {activeTab === 'hotels' && <Building2 size={18} />}
                        {activeTab === 'restaurants' && <Utensils size={18} />}
                        {activeTab === 'companies' && <Briefcase size={18} />}
                        {activeTab === 'departments' && <Stethoscope size={18} />}
                        {activeTab === 'roles' && <UserIcon size={18} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white truncate">{item.name}</p>
                          {item.preferred && <span className="text-[7px] bg-amber-500/20 text-amber-500 px-1 py-0.5 rounded uppercase font-black">Top</span>}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted">
                          {item.city && <span>{item.city}</span>}
                          {(item.code || item.tax_id) && <span className="font-mono text-accent/60">[{item.code || item.tax_id}]</span>}
                          {activeTab === 'hotels' && item.stars && <span className="text-amber-500/60">{item.stars}★</span>}
                          {activeTab === 'restaurants' && item.cuisine_type && <span>{item.cuisine_type}</span>}
                          {activeTab === 'roles' && item.scope && <span className="uppercase text-[8px] font-black">{item.scope}</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={() => handleOpenModal(item)}
                        className="p-2 rounded-lg bg-background border border-border text-muted hover:text-accent hover:border-accent/40 transition-all"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-lg bg-background border border-border text-muted hover:text-red-500 hover:border-red-500/40 transition-all"
                        title="Borrar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              ))
            ) : (
              <div className="col-span-full py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-muted">
                  <Search size={30} />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-white text-lg">No se encontraron resultados</p>
                  <p className="text-muted text-xs">Intenta con otros términos de búsqueda o añade un nuevo registro.</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Modal CRUD */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative w-full bg-surface border border-border rounded-[2.5rem] p-8 shadow-2xl",
                (activeTab === 'hotels' || activeTab === 'restaurants') ? "max-w-2xl" : "max-w-md"
              )}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent" />
              
              <div className="flex justify-between items-center mb-8">
                <div className="space-y-1">
                  <h3 className="text-xl font-black font-heading text-white">
                    {editingItem ? 'Editar' : 'Nuevo'} {activeTab === 'hospitals' ? 'Hospital' : activeTab === 'companies' ? 'Empresa' : activeTab === 'departments' ? 'Servicio' : activeTab === 'hotels' ? 'Hotel' : activeTab === 'restaurants' ? 'Restaurante' : 'Cargo'}
                  </h3>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Introduce los datos del registro</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full bg-background border border-border text-muted hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-4">
                  {(activeTab === 'hotels' || activeTab === 'restaurants') && !editingItem && (
                    <div className="p-5 bg-accent/5 rounded-3xl border border-accent/10 space-y-3 relative">
                      <label className="text-[10px] font-black uppercase text-accent tracking-widest px-1 flex items-center gap-2">
                        <Search size={12} /> Importar datos desde Google
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input 
                            type="text"
                            placeholder={activeTab === 'hotels' ? "Buscar hotel en Google..." : "Buscar restaurante en Google..."}
                            value={importSearch}
                            onChange={(e) => setImportSearch(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                setIsSearchingGoogle(true);
                                const res = await searchPlacesAction(importSearch);
                                if (res.success) {
                                  setImportResults(res.results || []);
                                  setShowImportList(true);
                                  if (res.results?.length === 0) {
                                    await alert({ title: 'Sin resultados', message: 'No se encontraron lugares con ese nombre.', type: 'warning' });
                                  }
                                } else {
                                  await alert({ 
                                    title: 'Error de Google', 
                                    message: res.error || 'Error al buscar en Google Places. Verifica que la Places API esté habilitada.', 
                                    type: 'danger' 
                                  });
                                }
                                setIsSearchingGoogle(false);
                              }
                            }}
                            onFocus={() => importResults.length > 0 && setShowImportList(true)}
                            className="w-full bg-background border border-border rounded-xl py-3 pl-10 pr-4 text-xs font-bold outline-none focus:border-accent transition-all"
                          />
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                            {isSearchingGoogle ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                          </div>
                        </div>
                        <Button 
                          type="button"
                          variant="outline"
                          className="rounded-xl px-6 border-accent/20 text-accent hover:bg-accent/10"
                          onClick={async () => {
                            setIsSearchingGoogle(true);
                            const res = await searchPlacesAction(importSearch);
                            if (res.success) {
                              setImportResults(res.results || []);
                              setShowImportList(true);
                              if (res.results?.length === 0) {
                                await alert({ title: 'Sin resultados', message: 'No se encontraron lugares con ese nombre.', type: 'warning' });
                              }
                            }
                            setIsSearchingGoogle(false);
                          }}
                        >
                          Buscar
                        </Button>
                      </div>

                      <AnimatePresence>
                        {showImportList && importResults.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute left-0 right-0 top-full mt-2 bg-surface border border-border rounded-2xl shadow-2xl z-[150] max-h-60 overflow-y-auto"
                          >
                            {importResults.map(result => (
                              <button
                                key={result.place_id}
                                type="button"
                                className="w-full text-left p-4 hover:bg-accent/10 border-b border-border/50 last:border-0 flex justify-between items-center group"
                                onMouseDown={async (e) => {
                                  e.preventDefault();
                                  setIsSelectingPlace(true);
                                  try {
                                    const details = await getPlaceDetailsAction(result.place_id);
                                    if (details.success && details.place) {
                                      const p = details.place;
                                      const getComponent = (type: string) => 
                                        p.address_components?.find((c: any) => c.types.includes(type))?.long_name || '';

                                      const city = getComponent('locality') || getComponent('administrative_area_level_2');
                                      const country = getComponent('country');
                                      const postalCode = getComponent('postal_code');
                                      
                                      const newFormData = {
                                        ...formData,
                                        name: p.name,
                                        address: p.formatted_address,
                                        city: city,
                                        phone: p.international_phone_number || p.formatted_phone_number,
                                        website: p.website,
                                        google_place_id: p.place_id,
                                        latitude: p.geometry?.location?.lat,
                                        longitude: p.geometry?.location?.lng,
                                        country: country || 'España', // Fallback for mandatory field
                                        postal_code: postalCode,
                                        rating: p.rating
                                      };

                                      if (activeTab === 'restaurants') {
                                        (newFormData as any).price_level = p.price_level;
                                      }

                                      setFormData(newFormData);
                                      setImportSearch('');
                                      setShowImportList(false);
                                    } else {
                                      await alert({ 
                                        title: 'Error de Google', 
                                        message: details.error || 'No se pudieron obtener los detalles del lugar.', 
                                        type: 'danger' 
                                      });
                                    }
                                  } catch (err: any) {
                                    await alert({ title: 'Error', message: 'Ocurrió un error inesperado al importar.', type: 'danger' });
                                  } finally {
                                    setIsSelectingPlace(false);
                                  }
                                }}
                              >
                                <div>
                                  <p className="text-xs font-black text-foreground group-hover:text-accent transition-colors">{result.name}</p>
                                  <p className="text-[10px] text-muted">{result.formatted_address}</p>
                                </div>
                                {isSelectingPlace ? <Loader2 size={16} className="animate-spin text-accent" /> : <Plus size={16} className="text-accent opacity-0 group-hover:opacity-100 transition-all" />}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {activeTab === 'hotels' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Nombre del Hotel</label>
                        <input required type="text" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="Ej: Hotel Palace" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Ciudad</label>
                        <input required type="text" value={formData.city || ''} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="Ciudad" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">País</label>
                        <input required type="text" value={formData.country || ''} onChange={(e) => setFormData({...formData, country: e.target.value})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="País" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">CP</label>
                        <input type="text" value={formData.postal_code || ''} onChange={(e) => setFormData({...formData, postal_code: e.target.value})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="Código Postal" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Dirección</label>
                        <input type="text" value={formData.address || ''} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="Dirección completa" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Teléfono</label>
                        <input type="text" value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="+34..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Email</label>
                        <input type="email" value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="reservas@hotel.com" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Estrellas</label>
                        <select value={formData.stars || ''} onChange={(e) => setFormData({...formData, stars: e.target.value ? parseInt(e.target.value) : undefined})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all">
                          <option value="">Seleccionar...</option>
                          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Estrellas</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Rating (0-10)</label>
                        <input type="number" step="0.1" min="0" max="10" value={formData.rating || ''} onChange={(e) => setFormData({...formData, rating: parseFloat(e.target.value)})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="Ej: 8.5" />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Sitio Web</label>
                        <input type="url" value={formData.website || ''} onChange={(e) => setFormData({...formData, website: e.target.value})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="https://..." />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Google Place ID</label>
                        <input type="text" value={formData.google_place_id || ''} onChange={(e) => setFormData({...formData, google_place_id: e.target.value})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="ChI..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Latitud</label>
                        <input type="number" step="any" value={formData.latitude || ''} onChange={(e) => setFormData({...formData, latitude: parseFloat(e.target.value)})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="0.000000" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Longitud</label>
                        <input type="number" step="any" value={formData.longitude || ''} onChange={(e) => setFormData({...formData, longitude: parseFloat(e.target.value)})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="0.000000" />
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <input 
                          type="checkbox" 
                          id="preferred_hotel"
                          checked={formData.preferred || false}
                          onChange={e => setFormData({...formData, preferred: e.target.checked})}
                        />
                        <label htmlFor="preferred_hotel" className="text-[10px] font-black uppercase text-muted tracking-widest">Hotel Preferente</label>
                      </div>
                    </div>
                  ) : activeTab === 'restaurants' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Nombre del Restaurante</label>
                        <input required type="text" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="Ej: Restaurante KONG" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Ciudad</label>
                        <input required type="text" value={formData.city || ''} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="Ciudad" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">País</label>
                        <input type="text" value={formData.country || ''} onChange={(e) => setFormData({...formData, country: e.target.value})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="País" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">CP</label>
                        <input type="text" value={formData.postal_code || ''} onChange={(e) => setFormData({...formData, postal_code: e.target.value})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="Código Postal" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Tipo de Cocina</label>
                        <input type="text" value={formData.cuisine_type || ''} onChange={(e) => setFormData({...formData, cuisine_type: e.target.value})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="Ej: Fusión Japonesa" />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Dirección</label>
                        <input type="text" value={formData.address || ''} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="Dirección completa" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Teléfono</label>
                        <input type="text" value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="+34..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Rating (0-5)</label>
                        <input type="number" step="0.1" min="0" max="5" value={formData.rating || ''} onChange={(e) => setFormData({...formData, rating: parseFloat(e.target.value)})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="Ej: 4.8" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Precio (1-4)</label>
                        <select value={formData.price_level || ''} onChange={(e) => setFormData({...formData, price_level: e.target.value ? parseInt(e.target.value) : undefined})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all">
                          <option value="">Seleccionar...</option>
                          <option value="1">€ (Económico)</option>
                          <option value="2">€€ (Medio)</option>
                          <option value="3">€€€ (Caro)</option>
                          <option value="4">€€€€ (Lujo)</option>
                        </select>
                      </div>
                      <div className="space-y-2 col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Sitio Web</label>
                        <input type="url" value={formData.website || ''} onChange={(e) => setFormData({...formData, website: e.target.value})} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all" placeholder="https://..." />
                      </div>
                      <div className="flex items-center gap-2 pt-2 col-span-2">
                        <input 
                          type="checkbox" 
                          id="preferred_restaurant"
                          checked={formData.preferred || false}
                          onChange={e => setFormData({...formData, preferred: e.target.checked})}
                        />
                        <label htmlFor="preferred_restaurant" className="text-[10px] font-black uppercase text-muted tracking-widest">Restaurante Preferente</label>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Nombre</label>
                        <input
                          required
                          type="text"
                          value={formData.name || ''}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all"
                          placeholder={`Nombre`}
                        />
                      </div>

                      {(activeTab === 'hospitals' || activeTab === 'companies') && (
                        <>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">
                              {activeTab === 'hospitals' ? 'Código' : 'CIF / NIF'}
                            </label>
                            <input
                              type="text"
                              value={activeTab === 'hospitals' ? (formData.code || '') : (formData.tax_id || '')}
                              onChange={(e) => setFormData({
                                ...formData, 
                                [activeTab === 'hospitals' ? 'code' : 'tax_id']: e.target.value
                              })}
                              className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all uppercase"
                              placeholder={activeTab === 'hospitals' ? "Código identificativo" : "CIF o NIF de la empresa"}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Ciudad</label>
                            <input
                              type="text"
                              value={formData.city || ''}
                              onChange={(e) => setFormData({...formData, city: e.target.value})}
                              className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all"
                              placeholder="Ciudad"
                            />
                          </div>
                        </>
                      )}

                      {activeTab === 'roles' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Ámbito</label>
                          <select
                            required
                            value={formData.scope || 'hospital'}
                            onChange={(e) => setFormData({...formData, scope: e.target.value})}
                            className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all"
                          >
                            <option value="hospital">Hospitalario</option>
                            <option value="empresa">Empresa</option>
                            <option value="otro">Otro / Agencia</option>
                          </select>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="pt-4 flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    variant="outline"
                    className="flex-1 rounded-xl py-6 font-black uppercase tracking-widest text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 rounded-xl py-6 font-black uppercase tracking-widest text-xs shadow-xl shadow-accent/20"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Guardar Datos'}
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
