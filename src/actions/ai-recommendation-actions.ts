'use server';

import { createHash } from 'crypto';
import { buildUserTravelContext } from '@/ai/contextual-recommendations/context-builder';
import { rankPlacesWithContext } from '@/ai/contextual-recommendations/recommendation-engine';
import { RecommendationIntent, AIRecommendation, PlaceCandidate } from '@/ai/contextual-recommendations/types';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * Gets contextual AI recommendations for a list of places
 */
export async function getAIRecommendationsAction(params: {
  planId: string;
  profileId: string;
  places: PlaceCandidate[];
  intent: RecommendationIntent;
  category: string;
}) {
  const { planId, profileId, places, intent, category } = params;
  
  if (!places || places.length === 0) return { success: true, recommendations: [] };

  const supabaseAdmin = getSupabaseAdmin();

  // 1. Check Cache
  const inputHash = createHash('md5')
    .update(JSON.stringify(places.map(p => p.google_place_id).sort()))
    .digest('hex');
    
  const { data: cached } = await supabaseAdmin
    .from('ai_recommendation_cache')
    .select('result')
    .eq('plan_id', planId)
    .eq('intent', intent)
    .eq('category', category)
    .eq('input_hash', inputHash)
    .maybeSingle();

  if (cached) {
    console.log('[AI] Cache HIT for recommendations');
    return { success: true, recommendations: cached.result as AIRecommendation[] };
  }

  try {
    // 2. Build Context
    const context = await buildUserTravelContext(planId, profileId);

    // 3. Get AI Recommendations
    // Limit to 10 places as requested
    const candidates = places.slice(0, 10);
    const recommendations = await rankPlacesWithContext({
      context,
      places: candidates,
      intent
    });

    // 4. Save to Cache
    await supabaseAdmin
      .from('ai_recommendation_cache')
      .insert({
        plan_id: planId,
        profile_id: profileId,
        intent,
        category,
        input_hash: inputHash,
        result: recommendations
      });

    return { success: true, recommendations };
  } catch (error: any) {
    console.error('[AI] Action Error:', error);
    return { success: false, error: error.message || 'Error al obtener recomendaciones con IA' };
  }
}
