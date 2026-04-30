'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, Briefcase, Loader2, X, Building2, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface Role {
  id: string;
  name: string;
  scope: string;
}

interface RoleSelectProps {
  value: string;
  onChange: (id: string, name: string) => void;
  className?: string;
}

export function RoleSelect({ value, onChange, className }: RoleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('professional_roles')
          .select('id, name, scope')
          .order('name');
        
        if (error) throw error;
        setRoles(data || []);
      } catch (err) {
        console.error('Error fetching roles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredRoles = roles.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedRole = roles.find(r => r.id === value);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-background border border-border rounded-xl p-4 text-xs flex items-center justify-between outline-none focus:border-accent/40 transition-all text-left",
          isOpen && "border-accent/40 shadow-lg shadow-accent/5"
        )}
      >
        <div className="flex items-center gap-3">
          <Briefcase size={16} className={selectedRole ? "text-accent" : "text-muted"} />
          <div className="flex flex-col">
            <span className={cn(selectedRole ? "text-foreground font-bold" : "text-muted")}>
              {selectedRole ? selectedRole.name : "Seleccionar Cargo Profesional"}
            </span>
            {selectedRole && (
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-widest mt-0.5",
                selectedRole.scope === 'hospital' ? "text-blue-400" : "text-emerald-400"
              )}>
                Ámbito: {selectedRole.scope}
              </span>
            )}
          </div>
        </div>
        <ChevronDown size={16} className={cn("text-muted transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-2xl shadow-2xl z-[110] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="relative">
              <input
                autoFocus
                type="text"
                placeholder="Buscar cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-border rounded-xl py-2.5 pl-9 pr-4 text-[11px] outline-none focus:border-accent/30 transition-all font-medium"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-accent"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-2 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="animate-spin text-accent" size={20} />
              </div>
            ) : filteredRoles.length > 0 ? (
              filteredRoles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => {
                    onChange(role.id, role.name);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl text-left transition-all group hover:bg-accent/5",
                    value === role.id ? "bg-accent/10" : ""
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <span className={cn(
                      "text-[11px] font-bold",
                      value === role.id ? "text-accent" : "text-foreground group-hover:text-foreground"
                    )}>
                      {role.name}
                    </span>
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest flex items-center gap-1 w-max px-1.5 py-0.5 rounded border",
                      role.scope === 'hospital' 
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    )}>
                      {role.scope === 'hospital' ? <Stethoscope size={8}/> : <Building2 size={8}/>}
                      {role.scope}
                    </span>
                  </div>
                  {value === role.id && <Check size={14} className="text-accent shrink-0" />}
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-[10px] text-muted font-medium italic">
                No se encontraron cargos
              </div>
            )}
            <div className="p-2 border-t border-border mt-1">
              <button
                type="button"
                onClick={() => {
                  onChange('manual', 'Entrada Manual');
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className="w-full p-3 rounded-xl text-center text-[11px] font-bold text-accent hover:bg-accent/10 transition-all border border-accent/20"
              >
                No encuentro mi cargo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
