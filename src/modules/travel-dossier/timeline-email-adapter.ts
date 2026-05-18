import { TravelTimelineEvent } from '@/core/services/travel-timeline.service';
import { DossierEvent } from './dossier-builder';

function getMonthAbbreviation(date: Date): string {
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  return months[date.getUTCMonth()];
}

export function formatDateLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${d.getUTCDate()} ${getMonthAbbreviation(d)}`;
  } catch {
    return 'DÍA';
  }
}

export function formatEventTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  } catch {
    return '—';
  }
}

function emojiForEvent(e: TravelTimelineEvent): string {
  if (e.event_type === 'flight') return e.id.includes('arr') ? '🛬' : '✈️';
  if (e.event_type === 'transfer') return '🚘';
  if (e.event_type === 'hotel') return e.id.includes('in') ? '🏨' : '🔑';
  if (e.event_type === 'restaurant') return '🍽️';
  if (e.event_type === 'hospitality') return '🥂';
  return '🩺';
}

/**
 * Converts a sorted TravelTimelineEvent[] into grouped DossierEvent days
 * ready for the email renderer. This is the canonical adapter — all email
 * templates must go through here, never query the DB directly.
 */
export function adaptTimelineToDossierDays(
  timeline: TravelTimelineEvent[]
): { dateLabel: string; events: DossierEvent[] }[] {
  const dossierEvents: DossierEvent[] = timeline.map(e => ({
    type: (e.event_type === 'agenda' ? 'hospitality' : e.event_type) as DossierEvent['type'],
    time: e.start_datetime,
    formattedTime: formatEventTime(e.start_datetime),
    title: e.title,
    subtitle: e.subtitle,
    icon: emojiForEvent(e),
    dateKey: formatDateLabel(e.start_datetime),
    originalObject: e.metadata
  }));

  dossierEvents.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  const map = new Map<string, DossierEvent[]>();
  dossierEvents.forEach(e => {
    if (!map.has(e.dateKey)) map.set(e.dateKey, []);
    map.get(e.dateKey)!.push(e);
  });

  return Array.from(map.entries()).map(([dateLabel, events]) => ({ dateLabel, events }));
}
