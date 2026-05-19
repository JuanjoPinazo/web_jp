'use client';

import React from 'react';
import { TimelineEvent } from './TimelineEvent';
import { LucideIcon } from 'lucide-react';

interface Event {
  id: string;
  time: string;
  title: string;
  location?: string;
  description?: string;
  icon: LucideIcon;
  color?: string;
  isActive?: boolean;
}

interface TimelineSectionProps {
  title: string;
  events: Event[];
  onEventClick?: (event: Event) => void;
}

export const TimelineSection = ({ title, events, onEventClick }: TimelineSectionProps) => {
  if (events.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 px-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted">{title}</h3>
        <div className="flex-1 h-px bg-border/40" />
      </div>
      
      <div className="pl-2">
        {events.map((event, index) => (
          <TimelineEvent
            key={event.id}
            time={event.time}
            title={event.title}
            location={event.location}
            description={event.description}
            icon={event.icon}
            color={event.color}
            isActive={event.isActive}
            isLast={index === events.length - 1}
            onClick={() => onEventClick?.(event)}
            type={(event as any).type}
          />
        ))}
      </div>
    </div>
  );
};
