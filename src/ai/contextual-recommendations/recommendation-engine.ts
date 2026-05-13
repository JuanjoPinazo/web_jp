import OpenAI from 'openai';
import { 
  UserTravelContext, 
  PlaceCandidate, 
  RecommendationIntent, 
  AIRecommendation 
} from './types';
import { 
  RECOMMENDATION_SYSTEM_PROMPT, 
  buildRecommendationUserPrompt 
} from './prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Ranks places based on travel context and user intent using AI
 */
export async function rankPlacesWithContext(params: {
  context: UserTravelContext;
  places: PlaceCandidate[];
  intent: RecommendationIntent;
}): Promise<AIRecommendation[]> {
  const { context, places, intent } = params;

  if (!process.env.OPENAI_API_KEY) {
    console.warn('[AI] OPENAI_API_KEY missing, using fallback ranking.');
    return fallbackRanking(places);
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: RECOMMENDATION_SYSTEM_PROMPT },
        { role: 'user', content: buildRecommendationUserPrompt(context, places, intent) }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Empty AI response');

    const result = JSON.parse(content);
    return result.recommendations || [];
  } catch (error) {
    console.error('[AI] Recommendation Engine Error:', error);
    return fallbackRanking(places);
  }
}

/**
 * Basic ranking fallback when AI is unavailable
 */
function fallbackRanking(places: PlaceCandidate[]): AIRecommendation[] {
  return places
    .sort((a, b) => {
      // Score = (Rating * 10) - (Distance / 100)
      const scoreA = (a.rating || 0) * 10 - (a.distance_meters || 0) / 100;
      const scoreB = (b.rating || 0) * 10 - (b.distance_meters || 0) / 100;
      return scoreB - scoreA;
    })
    .slice(0, 3)
    .map(p => ({
      place_id: p.google_place_id,
      score: 80,
      reason: 'Recomendación basada en distancia y valoración media de los usuarios.',
      best_for: ['Cercanía', 'Valoración'],
    }));
}
