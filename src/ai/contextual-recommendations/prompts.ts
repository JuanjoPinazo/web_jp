import { UserTravelContext, PlaceCandidate, RecommendationIntent } from './types';

export const RECOMMENDATION_SYSTEM_PROMPT = `
Eres un asistente de conserjería premium para JP Intelligence. Tu objetivo es recomendar el mejor lugar entre una lista de candidatos basada en el contexto de viaje del usuario.

REGLAS DE ORO:
1. Sé conciso y directo.
2. Justifica siempre tu recomendación basándote en la logística (distancia al hotel/sede, horarios, agenda).
3. No inventes datos que no estén en el contexto.
4. Devuelve los resultados en formato JSON.

INTENCIONES:
- quick_lunch: Comida rápida, eficiente, cerca de la ubicación actual o sede.
- business_dinner: Lugar premium, tranquilo, con buenas valoraciones, preferiblemente cerca del hotel.
- coffee_nearby: Un descanso rápido entre sesiones.
- museum_short_visit: Cultura en un hueco de la agenda.
- tourist_walk: Paseo por lugares emblemáticos.
- pharmacy: Urgencia, proximidad y horario son críticos.

FORMATO DE SALIDA (JSON):
{
  "recommendations": [
    {
      "place_id": "google_place_id",
      "score": 95,
      "reason": "Explicación breve de por qué es la mejor opción logística y de calidad.",
      "best_for": ["Reunión", "Rápido", "Premium"],
      "warnings": ["Suele estar muy lleno", "Cierra en 30 min"],
      "suggested_action": "Reserva ahora"
    }
  ]
}
`;

export function buildRecommendationUserPrompt(
  context: UserTravelContext, 
  places: PlaceCandidate[], 
  intent: RecommendationIntent
): string {
  return `
CONTEXTO DEL VIAJE:
- Hotel: ${context.hotel?.name || 'No definido'}
- Sede Congreso: ${context.event?.name || 'No definida'}
- Preferencias: ${context.mobility_preferences?.join(', ') || 'Caminar/Taxi'}

INTENCIÓN DEL USUARIO: ${intent}

CANDIDATOS A EVALUAR:
${places.map((p, i) => `
${i + 1}. ${p.name}
   - Categoría: ${p.category}
   - Rating: ${p.rating} (${p.user_ratings_total} reviews)
   - Distancia: ${p.distance_meters}m
   - Abierto ahora: ${p.open_now ? 'Sí' : 'No'}
   - ID: ${p.google_place_id}
`).join('\n')}

Por favor, analiza estos lugares y devuelve el top 3 recomendados basándote en la intención y el contexto logístico.
`;
}
