'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface TimelineEventProps {
  time: string;
  title: string;
  location?: string;
  description?: string;
  icon: LucideIcon;
  color?: string;
  isActive?: boolean;
  isLast?: boolean;
  onClick?: () => void;
}

export const TimelineEvent = ({
  time,
  title,
  location,
  description,
  icon: Icon,
  color = 'text-accent',
  isActive = false,
  isLast = false,
  onClick
}: TimelineEventProps) => {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative flex gap-6 pb-8 group cursor-pointer",
        isActive ? "opacity-100" : "opacity-60 hover:opacity-100 transition-opacity"
      )}
    >
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-[23px] top-[46px] bottom-0 w-[2px] bg-border/40 group-hover:bg-accent/20 transition-colors" />
      )}

      {/* Time Column */}
      <div className="w-12 pt-4 text-right">
        <span className="text-[10px] font-black text-muted uppercase tracking-widest tabular-nums">
          {time}
        </span>
      </div>

      {/* Icon Node */}
      <div className="relative pt-3 z-10">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center border-4 border-background transition-all shadow-sm",
          isActive ? "bg-accent text-white scale-110 shadow-lg shadow-accent/20" : "bg-surface border-border text-muted"
        )}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 pt-4 space-y-1">
        <h3 className={cn(
          "text-base font-black tracking-tight",
          isActive ? "text-foreground" : "text-muted"
        )}>
          {title}
        </h3>
        {location && (
          <p className="text-[10px] font-bold text-accent uppercase tracking-[0.15em]">
            {location}
          </p>
        )}
        {description && (
          <p className="text-xs font-medium text-muted/80 leading-relaxed max-w-xs">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};
