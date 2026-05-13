import React from 'react';
import GooglePlacesTest from '@/components/GooglePlacesTest';
import { MapPin } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Google Places Test | Admin',
  description: 'Herramienta de prueba para validación de API de Google Places',
};

export default function GooglePlacesTestPage() {
  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-1 h-12 bg-accent rounded-full hidden md:block" />
        <div className="flex items-center gap-3 mb-2">
          <Link 
            href="/admin" 
            className="text-[10px] font-black uppercase tracking-[0.3em] text-muted hover:text-accent transition-colors"
          >
            Consola
          </Link>
          <span className="text-muted/30 text-[10px]">/</span>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Google Places</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tight">Geospatial Test.</h1>
        <p className="text-muted text-xs font-bold uppercase tracking-[0.4em] opacity-70">Google Places API Autocomplete & Details</p>
      </header>

      <GooglePlacesTest />
    </div>
  );
}
