import { supabase } from '@/lib/supabase';
import { sendPushToProfile } from '@/modules/push/push-service';
import { 
  DepartureCalculationParams, RecommendedDeparture, 
  Location, CongestionLevel 
} from './types';
import { estimateTravelTime } from './eta-engine';
import { evaluateTrafficAndWeather } from './traffic-evaluator';
import { calculateBuffers, buildRecommendationMessage } from './recommendation-builder';

/**
 * Calculates the recommended departure time for a traveler given origin, destination, 
 * target arrival time, congestion levels, weather modifiers, and specific buffers.
 */
export async function calculateRecommendedDeparture(
  params: DepartureCalculationParams
): Promise<RecommendedDeparture> {
  const { 
    origin, destination, targetArrivalTime, 
    travelMode = 'driving', planId, profileId, 
    eventType = 'congress', metadata 
  } = params;

  // 1. Calculate travel duration & distance
  const etaRes = await estimateTravelTime(origin, destination, travelMode);
  
  // 2. Fetch current weather for the destination if a plan is provided
  let weatherCondition = 'SUNNY';
  if (planId) {
    try {
      const { data: weatherAlerts } = await supabase
        .from('weather_alerts')
        .select('*')
        .eq('plan_id', planId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (weatherAlerts?.condition) {
        weatherCondition = weatherAlerts.condition;
      }
    } catch (e) {
      console.warn('[SmartDeparture Service] Weather check failed:', e);
    }
  }

  // 3. Evaluate Traffic and Weather modifiers
  const trafficRes = evaluateTrafficAndWeather(etaRes.distanceKm, weatherCondition);

  // 4. Calculate event-specific buffers
  const buffers = calculateBuffers(eventType, metadata);

  // 5. Compute total offset
  const totalOffsetMinutes = 
    etaRes.durationMinutes + 
    trafficRes.delayMinutes + 
    trafficRes.weatherImpactMinutes +
    buffers.airportBufferMinutes +
    buffers.securityBufferMinutes +
    buffers.checkInBufferMinutes +
    buffers.boardingBufferMinutes +
    buffers.walkingBufferMinutes +
    buffers.customBufferMinutes;

  const arrivalDate = new Date(targetArrivalTime);
  const recommendedTime = new Date(arrivalDate.getTime() - totalOffsetMinutes * 60 * 1000);

  const now = new Date();
  const recommendedDepartureMinutes = Math.max(0, Math.round((recommendedTime.getTime() - now.getTime()) / (1000 * 60)));

  // 6. Build the premium recommendation message
  const recommendationMessage = buildRecommendationMessage(
    destination.address,
    recommendedTime,
    etaRes.durationMinutes + trafficRes.delayMinutes,
    trafficRes.congestionLevel,
    eventType
  );

  const result: RecommendedDeparture = {
    recommendedTime,
    estimatedTravelTimeMinutes: etaRes.durationMinutes + trafficRes.delayMinutes,
    distanceKm: etaRes.distanceKm,
    origin: origin.address,
    destination: destination.address,
    congestionLevel: trafficRes.congestionLevel,
    trafficDelayMinutes: trafficRes.delayMinutes,
    weatherDelayMinutes: trafficRes.weatherImpactMinutes,
    buffers,
    recommendationMessage,
    recommendedDepartureMinutes,
    alertTriggered: null
  };

  // 7. Manage database operational alerts
  if (planId && profileId) {
    await processDepartureAlerts(planId, profileId, result, eventType, destination.address);
  }

  return result;
}

/**
 * Handles automated alert creation and push notifications in Supabase.
 */
async function processDepartureAlerts(
  planId: string,
  profileId: string,
  rec: RecommendedDeparture,
  eventType: string,
  destinationName: string
) {
  const now = new Date();
  const recommendedTime = rec.recommendedTime;
  const timeDiffMins = (recommendedTime.getTime() - now.getTime()) / (1000 * 60);

  const destBrief = destinationName.split(',')[0].trim();

  // A. departure_now Alert: trigger if departure time is within 10 minutes
  if (timeDiffMins <= 10 && timeDiffMins >= -15) {
    const dedupeKey = `dep_now_${planId}_${eventType}_${recommendedTime.getTime()}`;
    const alertData = {
      plan_id: planId,
      profile_id: profileId,
      type: eventType === 'flight' ? 'flight' : 'transfer',
      title: 'Sal ahora hacia tu destino',
      message: `Es hora de salir hacia ${destBrief}. Duración estimada de viaje: ${rec.estimatedTravelTimeMinutes} min.`,
      priority: 'urgent',
      action_label: 'Ver Mapa Live',
      action_url: `/dashboard?tab=home&view=map`,
      metadata: { dedupe_key: dedupeKey, alert_type: 'departure_now' }
    };
    rec.alertTriggered = 'departure_now';
    await insertOperationalAlert(profileId, alertData);
  }

  // B. heavy_traffic Alert: trigger if traffic delay is significant (>15 mins)
  if (rec.trafficDelayMinutes >= 15) {
    const dedupeKey = `heavy_traffic_${planId}_${eventType}_${rec.trafficDelayMinutes}`;
    const alertData = {
      plan_id: planId,
      profile_id: profileId,
      type: 'transfer',
      title: 'Demoras por Tráfico Elevado',
      message: `Detectada alta congestión en tu trayecto a ${destBrief}. Retraso estimado: +${rec.trafficDelayMinutes} min.`,
      priority: 'high',
      action_label: 'Ver Alternativas',
      action_url: `/dashboard?tab=home&view=map`,
      metadata: { dedupe_key: dedupeKey, alert_type: 'heavy_traffic' }
    };
    rec.alertTriggered = 'heavy_traffic';
    await insertOperationalAlert(profileId, alertData);
  }

  // C. airport_congestion Alert: trigger for airport trips under heavy weather/traffic
  if (eventType === 'flight' && (rec.trafficDelayMinutes > 10 || rec.weatherDelayMinutes > 0)) {
    const dedupeKey = `airport_congest_${planId}_${rec.weatherDelayMinutes}`;
    const alertData = {
      plan_id: planId,
      profile_id: profileId,
      type: 'flight',
      title: 'Congestión de Accesos al Aeropuerto',
      message: `Precaución en los accesos al aeropuerto por climatología adversa. Se han aplicado buffers extra.`,
      priority: 'high',
      action_label: 'Ver Vuelo',
      action_url: `/dashboard?tab=home&view=airport`,
      metadata: { dedupe_key: dedupeKey, alert_type: 'airport_congestion' }
    };
    rec.alertTriggered = 'airport_congestion';
    await insertOperationalAlert(profileId, alertData);
  }
}

/**
 * Inserts alert in DB and triggers push notifications if priority is high/urgent
 */
async function insertOperationalAlert(profileId: string, alert: any) {
  try {
    const { data: existing } = await supabase
      .from('alerts')
      .select('id')
      .eq('metadata->>dedupe_key', alert.metadata.dedupe_key)
      .maybeSingle();

    if (!existing) {
      await supabase.from('alerts').insert(alert);

      // Trigger premium Push alert
      if (alert.priority === 'high' || alert.priority === 'urgent') {
        await sendPushToProfile(profileId, {
          title: alert.title,
          body: alert.message,
          data: { url: alert.action_url || '/dashboard' }
        });
      }
    }
  } catch (error) {
    console.error('[SmartDeparture Service] Error inserting departure alert:', error);
  }
}
