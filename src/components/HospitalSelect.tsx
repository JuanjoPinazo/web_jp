'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, Building2, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface Hospital {
  id: string;
  name: string;
  city?: string;
  code?: string;
}

interface HospitalSelectProps {
  value: string;
  onChange: (id: string, name: string) => void;
  className?: string;
}

export function HospitalSelect({ value, onChange, className }: HospitalSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchHospitals = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('hospitals')
          .select('id, name, city, code')
          .order('name');
        
        if (error) throw error;
        setHospitals(data || []);
      } catch (err) {
        console.error('Error fetching hospitals:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHospitals();
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

  const filteredHospitals = hospitals.filter(h => 
    h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.city && h.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedHospital = hospitals.find(h => h.id === value);

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
          <Building2 size={16} className={selectedHospital ? "text-accent" : "text-muted"} />
          <span className={cn(selectedHospital ? "text-foreground font-bold" : "text-muted")}>
            {selectedHospital ? selectedHospital.name : "Seleccionar Hospital"}
          </span>
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
                placeholder="Buscar hospital o ciudad..."
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
            ) : filteredHospitals.length > 0 ? (
              filteredHospitals.map((hospital) => (
                <button
                  key={hospital.id}
                  type="button"
                  onClick={() => {
                    onChange(hospital.id, hospital.name);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl text-left text-[11px] font-bold transition-all group hover:bg-accent/5",
                    value === hospital.id ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground"
                  )}
                >
                  <div className="flex flex-col gap-0.5">
                    <span>{hospital.name}</span>
                    {(hospital.city || hospital.code) && (
                      <span className="text-[9px] opacity-60 font-medium flex gap-2">
                        {hospital.code && <span className="text-accent/80 font-bold">[{hospital.code}]</span>}
                        {hospital.city}
                      </span>
                    )}
                  </div>
                  {value === hospital.id && <Check size={14} />}
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-[10px] text-muted font-medium italic">
                No se encontraron hospitales
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
                No encuentro mi hospital
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
