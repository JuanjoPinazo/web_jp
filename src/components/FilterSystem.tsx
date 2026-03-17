import React from 'react';

interface FiltersProps {
  currentType: string;
  setType: (type: string) => void;
  currentPrice: string;
  setPrice: (price: string) => void;
}

export const FilterSystem = ({ currentType, setType, currentPrice, setPrice }: FiltersProps) => {
  const types = ['all', 'rice', 'tapas', 'fine dining'];
  const prices = ['all', '$$', '$$$', '$$$$'];

  return (
    <div className="flex flex-col gap-8 md:flex-row md:items-center justify-between p-8 border rounded-2xl bg-surface/50 border-border mb-16 shadow-inner">
      <div className="space-y-4">
        <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted/70 flex items-center gap-2">
           <div className="w-1 h-1 rounded-full bg-accent" />
           Tipo de Cocina
        </label>
        <div className="flex flex-wrap gap-2.5">
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setType(type)}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all border uppercase tracking-widest ${
                currentType === type 
                ? 'bg-accent/10 border-accent/40 text-accent shadow-lg shadow-accent/5' 
                : 'bg-background border-border text-muted hover:border-muted/50 hover:text-foreground'
              }`}
            >
              {type === 'all' ? 'todos' : type === 'rice' ? 'arroces' : type}
            </button>
          ))}
        </div>
      </div>
      
      <div className="space-y-4">
        <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted/70 flex items-center gap-2">
           <div className="w-1 h-1 rounded-full bg-accent" />
           Rango de Precio
        </label>
        <div className="flex gap-2.5">
          {prices.map((price) => (
            <button
              key={price}
              onClick={() => setPrice(price)}
              className={`w-14 h-9 rounded-lg text-xs font-bold transition-all border uppercase ${
                currentPrice === price 
                ? 'bg-accent/10 border-accent/40 text-accent shadow-lg shadow-accent/5' 
                : 'bg-background border-border text-muted hover:border-muted/50 hover:text-foreground'
              }`}
            >
              {price === 'all' ? 'todos' : price}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
