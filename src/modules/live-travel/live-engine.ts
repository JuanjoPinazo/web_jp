import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { LiveEvaluationResult, LiveRecommendation } from './types';
import { monitorFlight } from './flight-monitor';
import { monitorTraffic } from './traffic-monitor';
import { monitorWeather } from './weather-monitor';
import { generateLiveRecommendations } from './recommendation-engine';
import { processTimelineEvents } from '@/core/services/travel-timeline.service';

// Memory Cache to prevent aggressive polling and redundant API requests
const cache = new Map<string, { timestamp: number; result: LiveEvaluationResult }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function runLiveTravelEvaluation(planId: string): Promise<LiveEvaluationResult> {
  const now = new Date();
  
  // 1. Check memory cache first
  const cached = cache.get(planId);
  if (cached && (now.getTime() - cached.timestamp < CACHE_TTL_MS)) {
    console.log(`[LiveTravelEngine] Returning cached evaluation for plan: ${planId}`);
    return cached.result;
  }

  console.log(`[LiveTravelEngine] Evaluating live status for plan: ${planId}`);
  const supabase = getSupabaseAdmin();

  // 2. Load plan with relationships
  const { data: plan, error: planError } = await supabase
    .from('contact_travel_plans')
    .select('*, contexts(*)')
    .eq('id', planId)
    .is('deleted_at', null)
    .single();

  if (planError || !plan) {
    throw new Error(`[LiveTravelEngine] Plan not found: ${planError?.message || ''}`);
  }

  const [flights, stays, transfers, restaurants, hospitality, docs] = await Promise.all([
    supabase.from('travel_flights').select('*').eq('plan_id', planId).is('deleted_at', null).order('departure_time'),
    supabase.from('hotel_stays').select('*').eq('plan_id', planId).is('deleted_at', null).order('check_in'),
    supabase.from('travel_transfers').select('*').eq('plan_id', planId).is('deleted_at', null).order('pickup_datetime'),
    supabase.from('travel_restaurants').select('*').eq('plan_id', planId).is('deleted_at', null).order('reservation_time'),
    supabase.from('hospitality_events').select('*, hospitality_event_attendees(*)').eq('plan_id', planId).is('deleted_at', null).order('start_datetime'),
    supabase.from('travel_documents').select('*').eq('plan_id', planId).is('deleted_at', null)
  ]);

  const fullPlan = {
    ...plan,
    flights: flights.data || [],
    hotel_stays: stays.data || [],
    transfers: transfers.data || [],
    restaurants: restaurants.data || [],
    hospitality_events: hospitality.data || [],
    documents: docs.data || []
  };

  // 3. Process all events through Timeline Engine
  const timeline = processTimelineEvents(fullPlan, docs.data || []);
  const sortedTimeline = [...timeline].sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

  // Find next upcoming event
  const nextEvent = sortedTimeline.find(e => new Date(e.start_datetime) > now);
  // Find next flight departure
  const nextFlightEvent = sortedTimeline.find(e => e.event_type === 'flight' && !e.id.includes('arr') && new Date(e.start_datetime) > now);

  // 4. Run Flight Monitor
  let activeFlightStatus = null;
  if (nextFlightEvent) {
    const flight = nextFlightEvent.metadata;
    if (flight) {
      // Monitor flight if departure is within 8 hours
      const flightTime = new Date(nextFlightEvent.start_datetime);
      const hoursToFlight = (flightTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursToFlight > 0 && hoursToFlight <= 8) {
        activeFlightStatus = await monitorFlight(flight.id, flight.flight_number || '', flightTime);
      }
    }
  }

  // 5. Run Weather Monitor
  let activeWeatherStatus = null;
  const cityName = plan.contexts?.name || 'París';
  const lat = plan.contexts?.latitude || 48.8566;
  const lng = plan.contexts?.longitude || 2.3522;
  activeWeatherStatus = await monitorWeather(cityName, lat, lng);

  // 6. Run Traffic Monitor
  let activeTrafficStatus = null;
  if (nextEvent) {
    // Determine destination coordinates and address
    let destLat = 0;
    let destLng = 0;
    let destAddress = nextEvent.location || '';

    if (nextEvent.event_type === 'flight') {
      destLat = nextEvent.id.includes('arr') ? nextEvent.metadata?.arrival_lat : nextEvent.metadata?.departure_lat;
      destLng = nextEvent.id.includes('arr') ? nextEvent.metadata?.arrival_lng : nextEvent.metadata?.departure_lng;
    } else if (nextEvent.event_type === 'transfer') {
      destLat = nextEvent.metadata?.pickup_lat;
      destLng = nextEvent.metadata?.pickup_lng;
    } else if (nextEvent.event_type === 'hotel') {
      destLat = nextEvent.metadata?.latitude;
      destLng = nextEvent.metadata?.longitude;
    } else if (nextEvent.event_type === 'hospitality' || nextEvent.event_type === 'agenda') {
      destLat = nextEvent.metadata?.venue_lat;
      destLng = nextEvent.metadata?.venue_lng;
    } else if (nextEvent.event_type === 'restaurant') {
      destLat = nextEvent.metadata?.latitude;
      destLng = nextEvent.metadata?.longitude;
    }

    // Determine origin coordinates (Use default user location or active hotel check-in)
    const { data: userLocs } = await supabase.from('user_locations').select('*').eq('profile_id', plan.user_id);
    const defaultLoc = userLocs?.find((l: any) => l.is_default_departure) || userLocs?.[0];

    if (defaultLoc && (destLat !== 0 || destAddress)) {
      const originCoord = { lat: Number(defaultLoc.latitude), lng: Number(defaultLoc.longitude) };
      const destCoord = destLat !== 0 ? { lat: Number(destLat), lng: Number(destLng) } : originCoord; // Fallback if no coord

      const originName = defaultLoc.address || 'Ubicación de origen';
      const eventTime = new Date(nextEvent.start_datetime);

      // Only check traffic if the event occurs within 4 hours
      const hoursToEvent = (eventTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursToEvent > 0 && hoursToEvent <= 4) {
        activeTrafficStatus = await monitorTraffic(
          originCoord,
          destCoord,
          originName,
          destAddress,
          eventTime
        );
      }
    }
  }

  // 7. Compile Live Recommendations
  const recommendations = generateLiveRecommendations(
    activeFlightStatus,
    activeTrafficStatus,
    activeWeatherStatus,
    nextEvent
  );

  // 8. Generate Alerts Database Records (with dedupe key)
  const alertsToInsert = [];
  const profileId = plan.user_id;

  for (const rec of recommendations) {
    let alertType: 'flight' | 'transfer' | 'dining' | 'hotel' | 'boarding_pass' | 'document' = 'flight';
    if (rec.type === 'departure') alertType = 'transfer';
    else if (rec.type === 'transport') alertType = 'transfer';
    else if (rec.type === 'operational') alertType = 'flight';
    else if (rec.type === 'contextual') alertType = 'document';

    alertsToInsert.push({
      plan_id: planId,
      profile_id: profileId,
      type: alertType,
      title: rec.title,
      message: rec.message,
      priority: rec.priority,
      action_label: rec.actionLabel || null,
      action_url: rec.actionUrl || null,
      metadata: {
        dedupe_key: rec.id,
        live_recommendation: true,
        rec_type: rec.type
      }
    });
  }

  // Save new alerts to DB securely
  for (const alert of alertsToInsert) {
    const { data: existing } = await supabase
      .from('alerts')
      .select('id')
      .eq('metadata->>dedupe_key', alert.metadata.dedupe_key)
      .maybeSingle();

    if (!existing) {
      await supabase.from('alerts').insert(alert);
      console.log(`[LiveTravelEngine] Created alert: ${alert.title}`);
    }
  }

  const result: LiveEvaluationResult = {
    planId,
    timestamp: now.toISOString(),
    activeFlightStatus,
    activeTrafficStatus,
    activeWeatherStatus,
    recommendations
  };

  // Save to Cache
  cache.set(planId, {
    timestamp: now.getTime(),
    result
  });

  return result;
}
