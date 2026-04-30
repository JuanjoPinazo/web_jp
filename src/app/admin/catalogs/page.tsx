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
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/Button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialog } from '@/context/DialogContext';

type CatalogType = 'hospitals' | 'departments' | 'roles';

export default function CatalogsPage() {
  const [activeTab, setActiveTab] = useState<CatalogType>('hospitals');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState<any>({});
  const { confirm, alert } = useDialog();

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query;
      if (activeTab === 'hospitals') {
        query = supabase.from('hospitals').select('*').order('name');
      } else if (activeTab === 'departments') {
        query = supabase.from('departments').select('*').order('name');
      } else {
        query = supabase.from('professional_roles').select('*').order('name');
      }

      const { data: result, error } = await query;
      if (error) throw error;
      setData(result || []);
    } catch (err) {
      console.error('Error fetching data:', err);
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
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const table = activeTab === 'roles' ? 'professional_roles' : activeTab;
      let error;

      if (editingItem) {
        const { error: err } = await supabase
          .from(table)
          .update(formData)
          .eq('id', editingItem.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from(table)
          .insert([formData]);
        error = err;
      }

      if (error) throw error;
      
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error saving:', err);
      await alert({ title: 'Error', message: 'Error al guardar los datos.', type: 'danger' });
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
      const table = activeTab === 'roles' ? 'professional_roles' : activeTab;
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
    (item.city || '').toLowerCase().includes(searchTerm.toLowerCase())
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
          {activeTab === 'hospitals' ? 'Nuevo Hospital' : activeTab === 'departments' ? 'Nuevo Servicio' : 'Nuevo Cargo'}
        </Button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-surface/50 p-2 rounded-[2rem] border border-border/50 backdrop-blur-sm">
        <div className="flex gap-1 p-1 bg-background/50 rounded-2xl w-full lg:w-auto">
          {[
            { id: 'hospitals', label: 'Hospitales', icon: Building2 },
            { id: 'departments', label: 'Servicios', icon: Stethoscope },
            { id: 'roles', label: 'Cargos', icon: Briefcase },
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
                  "flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex-1 lg:flex-none",
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

        <div className="relative w-full lg:w-96">
          <input
            type="text"
            placeholder={`Buscar en ${activeTab === 'hospitals' ? 'hospitales' : activeTab === 'departments' ? 'servicios' : 'cargos'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-background/50 border border-border rounded-2xl py-3 pl-11 pr-4 text-xs font-bold outline-none focus:border-accent/40 transition-all placeholder:text-muted/50"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
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
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <div 
                  key={item.id}
                  className="group bg-surface border border-border rounded-[2rem] p-6 hover:border-accent/30 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none group-hover:bg-accent/10 transition-colors" />
                  
                  <div className="flex items-start justify-between relative z-10">
                    <div className="space-y-4 flex-1">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {activeTab === 'hospitals' && <Building2 className="text-accent" size={14} />}
                          {activeTab === 'departments' && <Stethoscope className="text-accent" size={14} />}
                          {activeTab === 'roles' && <Briefcase className="text-accent" size={14} />}
                          <h3 className="font-bold text-white leading-tight">{item.name}</h3>
                        </div>
                        {activeTab === 'hospitals' && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {item.code && (
                              <span className="px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent text-[8px] font-black uppercase tracking-widest">
                                [{item.code}]
                              </span>
                            )}
                            {item.city && (
                              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted text-[8px] font-bold uppercase tracking-widest">
                                {item.city}
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
              className="relative w-full max-w-md bg-surface border border-border rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent" />
              
              <div className="flex justify-between items-center mb-8">
                <div className="space-y-1">
                  <h3 className="text-xl font-black font-heading text-white">
                    {editingItem ? 'Editar' : 'Nuevo'} {activeTab === 'hospitals' ? 'Hospital' : activeTab === 'departments' ? 'Servicio' : 'Cargo'}
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
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Nombre</label>
                    <input
                      required
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all"
                      placeholder={`Nombre del ${activeTab === 'hospitals' ? 'hospital' : activeTab === 'departments' ? 'servicio' : 'cargo'}`}
                    />
                  </div>

                  {activeTab === 'hospitals' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Código</label>
                        <input
                          type="text"
                          value={formData.code || ''}
                          onChange={(e) => setFormData({...formData, code: e.target.value})}
                          className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all uppercase"
                          placeholder="Código identificativo"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Ciudad</label>
                        <input
                          type="text"
                          value={formData.city || ''}
                          onChange={(e) => setFormData({...formData, city: e.target.value})}
                          className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-accent transition-all"
                          placeholder="Ciudad del hospital"
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
