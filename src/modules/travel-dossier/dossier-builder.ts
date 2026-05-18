import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { adaptTimelineToDossierDays } from './timeline-email-adapter';

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
  attachments?: {
    id: string;
    title: string;
    type: string;
    filename: string;
  }[];
}

function getMonthAbbreviation(date: Date): string {
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  return months[date.getUTCMonth()];
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

  // 5. Build grouped timeline via the canonical adapter
  const timelineDays = adaptTimelineToDossierDays(timeline);

  // 6. Gather and professionally map attachments
  const { data: documents } = await supabase
    .from('travel_documents')
    .select('*')
    .eq('plan_id', planId)
    .eq('visible_to_client', true)
    .is('deleted_at', null);

  const [flightsRes, transfersRes] = await Promise.all([
    supabase.from('travel_flights').select('*').eq('plan_id', planId).is('deleted_at', null),
    supabase.from('travel_transfers').select('*').eq('plan_id', planId).is('deleted_at', null),
  ]);

  const flights = flightsRes.data || [];
  const transfers = transfersRes.data || [];

  const sanitizeName = (str: string) => {
    return str
      .toUpperCase()
      .replace(/[\s\-]+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .replace(/__+/g, '_');
  };

  const mappedDocs = (documents || []).map(doc => {
    let nameTag = 'TRAVEL_DOCUMENT';
    let sortKey = 999;
    const docType = doc.document_type || '';
    const titleUpper = (doc.title || doc.display_title || '').toUpperCase();

    if (docType === 'boarding_pass' || titleUpper.includes('BOARDING') || titleUpper.includes('EMBARQUE') || titleUpper.includes('TICKET')) {
      const flightId = doc.related_flight_id || doc.related_entity_id;
      const flight = flights.find(f => f.id === flightId);
      if (flight) {
        if (flight.type === 'salida' || (flight.departure_location && !flight.departure_location.includes('CDG') && !flight.departure_location.includes('PAR'))) {
          nameTag = 'BOARDING_PASS_IDA';
          sortKey = 10;
        } else {
          nameTag = 'BOARDING_PASS_RETURN';
          sortKey = 90;
        }
      } else {
        nameTag = 'BOARDING_PASS_IDA';
        sortKey = 15;
      }
    } else if (docType === 'transfer_voucher' || titleUpper.includes('TRANSFER') || titleUpper.includes('TRASLADO')) {
      const transferId = doc.related_transfer_id || doc.related_entity_id;
      const transfer = transfers.find(t => t.id === transferId);
      if (transfer) {
        const pickup = sanitizeName(transfer.pickup_location || transfer.pickup_address || '').substring(0, 8);
        const dropoff = sanitizeName(transfer.dropoff_location || transfer.destination_address || '').substring(0, 8);
        if (pickup && dropoff) nameTag = `TRANSFER_${pickup}_${dropoff}`;
        else nameTag = transfer.transfer_type === 'airport_to_hotel' ? 'TRANSFER_CDG_HOTEL' : 'TRANSFER_HOTEL_CDG';
        sortKey = (transfer.transfer_type === 'airport_to_hotel') ? 20 : 80;
      } else {
        nameTag = 'TRANSFER_VOUCHER';
        sortKey = 25;
      }
    } else if (docType === 'hotel_booking' || docType === 'hotel_voucher' || titleUpper.includes('HOTEL')) {
      nameTag = 'HOTEL_VOUCHER';
      sortKey = 30;
    } else if (docType === 'hospitality_voucher' || docType === 'hospitality_event' || titleUpper.includes('HOSPITALITY') || titleUpper.includes('EVENT')) {
      const cleanTitle = sanitizeName(doc.title || doc.display_title || '').replace('DOCUMENTO_', '');
      nameTag = cleanTitle ? `HOSPITALITY_${cleanTitle}` : 'HOSPITALITY_EVENT';
      sortKey = 50;
    } else if (docType === 'restaurant_booking' || titleUpper.includes('RESTAURANT')) {
      nameTag = 'RESTAURANT_BOOKING';
      sortKey = 60;
    } else {
      const cleanTitle = sanitizeName(doc.title || doc.display_title || '').replace('DOCUMENTO_', '');
      nameTag = cleanTitle || 'TRAVEL_DOCUMENT';
      sortKey = 100;
    }

    return { doc, nameTag, sortKey };
  });

  mappedDocs.sort((a, b) => a.sortKey - b.sortKey);
  const attachments = mappedDocs.map((item, i) => {
    const indexStr = String(i + 1).padStart(2, '0');
    return {
      id: item.doc.id,
      title: item.doc.title || item.doc.display_title || item.doc.document_type,
      type: item.doc.document_type,
      filename: `${indexStr}_${item.nameTag}.pdf`
    };
  });

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
    timelineDays,
    attachments
  };
}
