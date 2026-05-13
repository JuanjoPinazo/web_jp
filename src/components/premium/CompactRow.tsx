'use client';

import React from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompactRowProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  subtitle?: string;
  rightText?: string;
  rightSubtext?: string;
  onClick?: () => void;
  status?: 'active' | 'pending' | 'completed';
  className?: string;
}

export const CompactRow = ({
  icon: Icon,
  iconColor = 'text-accent',
  title,
  subtitle,
  rightText,
  rightSubtext,
  onClick,
  status,
  className
}: CompactRowProps) => {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 p-4 rounded-[1.5rem] bg-surface/40 hover:bg-surface/80 active:scale-[0.98] transition-all cursor-pointer group border border-border/40",
        className
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
        iconColor.replace('text-', 'bg-').replace('500', '500/10'),
        iconColor
      )}>
        <Icon size={22} strokeWidth={2.5} />
      </div>

      <div className="flex-1 overflow-hidden">
        <h4 className="text-sm font-black text-foreground tracking-tight truncate">{title}</h4>
        {subtitle && <p className="text-[10px] font-medium text-muted uppercase tracking-widest truncate">{subtitle}</p>}
      </div>

      {(rightText || rightSubtext) && (
        <div className="text-right">
          {rightText && <p className="text-sm font-black text-foreground tabular-nums">{rightText}</p>}
          {rightSubtext && <p className="text-[9px] font-bold text-muted uppercase tracking-widest">{rightSubtext}</p>}
        </div>
      )}

      {onClick && (
        <ChevronRight size={16} className="text-muted/30 group-hover:text-accent transition-colors ml-1" />
      )}
    </div>
  );
};
