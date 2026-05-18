import { getSupabaseAdmin } from '@/lib/supabase-admin';

export interface DossierEvent {
  type: 'flight' | 'transfer' | 'hotel' | 'hospitality' | 'restaurant';
  time: string; // ISO string
  formattedTime: string; // "14:30"
  title: string;
  subtitle?: string;
  icon: string;
  dateKey: string; // "18 MAY" or "18 de mayo"
  originalObject: any;
}

export interface DossierData {
  planId: string;
  userId: string;
  userName: string;
  userEmail: string;
  tempPassword?: string;
  eventName: string;
  eventDates: string; // "18 - 21 May 2026"
  eventCity: string;
  hasFlights: boolean;
  hasTransfers: boolean;
  hasHospitality: boolean;
  mainHotelName: string;
  supportPhone?: string;
  coordinator: {
    name: string;
    role?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    avatarUrl?: string;
  } | null;
  timelineDays: {
    dateLabel: string; // "18 MAY"
    events: DossierEvent[];
  }[];
}

function getMonthAbbreviation(date: Date): string {
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  return months[date.getUTCMonth()];
}

function formatDateLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const day = d.getUTCDate();
    const month = getMonthAbbreviation(d);
    return `${day} ${month}`;
  } catch {
    return 'DÍA';
  }
}

function formatEventTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '—';
  }
}

export async function buildTravelDossierData(planId: string): Promise<DossierData> {
  const supabase = getSupabaseAdmin();

  // 1. Fetch main plan, profile, context, and coordinator
  const { data: plan, error: planError } = await supabase
    .from('contact_travel_plans')
    .select(`
      *,
      profiles:user_id (*),
      contexts:context_id (*),
      logistic_contact:logistic_contact_id (*)
    `)
    .eq('id', planId)
    .is('deleted_at', null)
    .single();

  if (planError || !plan) {
    throw new Error(`Plan de viaje no encontrado: ${planError?.message || 'Error desconocido'}`);
  }

  const profile = plan.profiles;
  const context = plan.contexts;

  if (!profile) {
    throw new Error(`Perfil de usuario no asociado al plan con ID ${planId}`);
  }

  // 2. Fetch unified travel timeline events using our central engine
  const { buildTravelTimeline } = await import('@/core/services/travel-timeline.service');
  const timeline = await buildTravelTimeline(planId);

  // 3. Coordinator details or default fallback
  let coordinator = plan.logistic_contact || null;
  if (!coordinator) {
    const { data: defaultCoord } = await supabase
      .from('logistic_contacts')
      .select('*')
      .eq('is_default', true)
      .limit(1)
      .maybeSingle();
    coordinator = defaultCoord;
  }

  // 4. Determine operational summary data
  const userName = `${profile.nombre || ''} ${profile.apellidos || ''}`.trim() || 'Estimado Cliente';
  const eventName = context?.name || 'Evento Especial';
  
  // Format event dates range
  let eventDates = 'Por confirmar';
  if (context?.start_date) {
    const start = new Date(context.start_date);
    const startDay = start.getUTCDate();
    const startMonth = getMonthAbbreviation(start);
    
    if (context.end_date) {
      const end = new Date(context.end_date);
      const endDay = end.getUTCDate();
      const endMonth = getMonthAbbreviation(end);
      
      if (startMonth === endMonth) {
        eventDates = `${startDay} - ${endDay} ${startMonth} ${start.getUTCFullYear()}`;
      } else {
        eventDates = `${startDay} ${startMonth} - ${endDay} ${endMonth} ${start.getUTCFullYear()}`;
      }
    } else {
      eventDates = `${startDay} ${startMonth} ${start.getUTCFullYear()}`;
    }
  }

  // Gather features from unified timeline
  const flightEvents = timeline.filter(e => e.event_type === 'flight');
  const hotelEvents = timeline.filter(e => e.event_type === 'hotel');
  const transferEvents = timeline.filter(e => e.event_type === 'transfer');
  const hospitalityEvents = timeline.filter(e => e.event_type === 'hospitality' || e.event_type === 'agenda');

  const hasFlights = flightEvents.length > 0;
  const hasTransfers = transferEvents.length > 0;
  const hasHospitality = hospitalityEvents.length > 0;

  // Get main hotel name from first hotel stay check-in
  const firstHotelStay = hotelEvents.find(e => e.id.includes('in'))?.metadata;
  const mainHotelName = firstHotelStay ? firstHotelStay.hotel_name : 'No asignado';

  // Determine city (from main hotel's address, context name, or flight arrival)
  let eventCity = 'París'; // default fallback for EuroPCR style
  if (firstHotelStay && firstHotelStay.address) {
    const parts = firstHotelStay.address.split(',');
    if (parts.length > 1) {
      eventCity = parts[parts.length - 1].replace(/\d+/g, '').trim();
    } else {
      eventCity = firstHotelStay.address;
    }
  } else if (flightEvents.length > 0 && flightEvents[0].metadata?.arrival_location) {
    eventCity = flightEvents[0].metadata.arrival_location;
  }

  // 5. Gather raw dossier events to build timeline
  const dossierEvents: DossierEvent[] = timeline.map(e => {
    // Determine the emoji icon
    let emojiIcon = '🩺';
    if (e.event_type === 'flight') {
      emojiIcon = e.id.includes('arr') ? '🛬' : '✈️';
    } else if (e.event_type === 'transfer') {
      emojiIcon = '🚘';
    } else if (e.event_type === 'hotel') {
      emojiIcon = e.id.includes('in') ? '🏨' : '🔑';
    } else if (e.event_type === 'restaurant') {
      emojiIcon = '🍽️';
    } else if (e.event_type === 'hospitality') {
      emojiIcon = '🥂';
    }

    return {
      type: e.event_type === 'agenda' ? 'hospitality' : e.event_type,
      time: e.start_datetime,
      formattedTime: formatEventTime(e.start_datetime),
      title: e.title,
      subtitle: e.subtitle,
      icon: emojiIcon,
      dateKey: formatDateLabel(e.start_datetime),
      originalObject: e.metadata
    };
  });

  // 6. Sort all timeline events chronologically
  dossierEvents.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  // 7. Group events by date labels
  const timelineDaysMap = new Map<string, DossierEvent[]>();
  dossierEvents.forEach(e => {
    if (!timelineDaysMap.has(e.dateKey)) {
      timelineDaysMap.set(e.dateKey, []);
    }
    timelineDaysMap.get(e.dateKey)!.push(e);
  });

  const timelineDays = Array.from(timelineDaysMap.entries()).map(([dateLabel, events]) => ({
    dateLabel,
    events
  }));

  // Clean coordinator values
  const formattedCoordinator = coordinator ? {
    name: coordinator.name,
    role: coordinator.role,
    phone: coordinator.phone,
    whatsapp: coordinator.whatsapp,
    email: coordinator.email,
    avatarUrl: coordinator.avatar_url
  } : null;

  return {
    planId,
    userId: profile.id,
    userName,
    userEmail: profile.email,
    tempPassword: profile.temp_password,
    eventName,
    eventDates,
    eventCity,
    hasFlights,
    hasTransfers,
    hasHospitality,
    mainHotelName,
    supportPhone: plan.support_phone,
    coordinator: formattedCoordinator,
    timelineDays
  };
}
