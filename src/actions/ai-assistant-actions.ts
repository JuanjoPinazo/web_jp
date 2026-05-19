'use server';

import OpenAI from 'openai';
import { buildUserTravelContext } from '@/ai/contextual-recommendations/context-builder';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { searchNearbyPlacesAction } from '@/actions/google-places-actions';

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no está configurada en las variables de entorno.');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

const PARIS_POIS = [
  {
    name: "Tour Eiffel",
    latitude: 48.8584,
    longitude: 2.2945,
    address: "Champ de Mars, 5 Avenue Anatole France, 75007 Paris",
    rating: 4.7,
    hours: "09:00 - 00:00",
    description: "El monumento de hierro más icónico de París, con vistas panorámicas increíbles."
  },
  {
    name: "Musée du Louvre",
    latitude: 48.8606,
    longitude: 2.3376,
    address: "Rue de Rivoli, 75001 Paris",
    rating: 4.7,
    hours: "09:00 - 18:00 (Cerrado martes)",
    description: "El museo de arte más grande del mundo, hogar de la Mona Lisa."
  },
  {
    name: "Musée d'Orsay",
    latitude: 48.8599,
    longitude: 2.3265,
    address: "1 Rue de la Légion d'Honneur, 75007 Paris",
    rating: 4.8,
    hours: "09:30 - 18:00 (Cerrado lunes)",
    description: "Instalado en una antigua estación de tren, alberga la mayor colección de obras impresionistas."
  },
  {
    name: "Petit Palais",
    latitude: 48.8660,
    longitude: 2.3145,
    address: "Avenue Winston Churchill, 75008 Paris",
    rating: 4.6,
    hours: "10:00 - 18:00 (Cerrado lunes)",
    description: "Museo de Bellas Artes con un patio ajardinado interior espectacular y entrada gratuita."
  },
  {
    name: "Sainte-Chapelle",
    latitude: 48.8554,
    longitude: 2.3444,
    address: "10 Boulevard du Palais, 75001 Paris",
    rating: 4.8,
    hours: "09:00 - 17:00",
    description: "Una joya gótica del siglo XIII famosa por sus impresionantes vidrieras de 15 metros."
  },
  {
    name: "Le Perchoir Marais (Rooftop)",
    latitude: 48.8578,
    longitude: 2.3524,
    address: "33 Rue de la Verrerie, 75004 Paris",
    rating: 4.4,
    hours: "20:15 - 02:00",
    description: "Rooftop bar premium encima del BHV Marais, con vistas espectaculares al Ayuntamiento y la Torre Eiffel."
  },
  {
    name: "L'Oiseau Blanc (Rooftop Premium)",
    latitude: 48.8708,
    longitude: 2.2936,
    address: "19 Avenue Kléber, 75116 Paris",
    rating: 4.6,
    hours: "12:00 - 14:30, 19:00 - 22:30",
    description: "Restaurante con estrella Michelin y terraza premium en el hotel The Peninsula con vistas a la Torre Eiffel."
  },
  {
    name: "Palais de Tokyo (Modern Art)",
    latitude: 48.8643,
    longitude: 2.2979,
    address: "13 Avenue du Président Wilson, 75116 Paris",
    rating: 4.4,
    hours: "12:00 - 00:00 (Cerrado martes)",
    description: "Un centro de arte contemporáneo dinámico y vanguardista, con un gran rooftop industrial."
  }
];

const ASSISTANT_SYSTEM_PROMPT = `
Eres el "AI City Companion" de JP Intelligence, un concierge digital ultra premium para viajeros corporativos y médicos VIP en París.

TU PERSONALIDAD Y TONO:
- Concierge de hotel 5 estrellas: extremadamente profesional, resolutivo, rápido, útil y atento.
- Habla en español de España de forma profesional pero muy cercana y afectuosa.
- Dirígete al usuario por su nombre de pila.
- Tu prioridad es facilitar la movilidad, el ocio y la agenda del usuario durante el congreso.

TU CONOCIMIENTO DEL CONTEXTO:
- Tienes acceso a la ubicación GPS real del usuario, su hotel asignado, la sede del congreso (Palais des Congrès) y los eventos de hospitalidad/cenas previstos.
- Conoces el clima y tráfico actuales.
- Tienes una lista curada de puntos de interés (POIs) turísticos e históricos premium en París con sus respectivas coordenadas exactas.

REGLAS DE RESPUESTA:
1. Responde de forma muy concisa. Máximo 2-3 párrafos de texto.
2. Si el usuario te pregunta qué visitar, sugiere lugares de la lista de POIs provista o restaurantes/cafés adecuados y cercanos a su ubicación GPS o a su hotel.
3. Evalúa los tiempos libres: si pregunta "¿Tengo tiempo antes de la cena?", revisa la hora local actual y el próximo evento en su agenda para calcular la diferencia de tiempo. Responde con cortesía si tiene suficiente tiempo para un paseo o café y dile exactamente a qué hora debe salir.
4. Formatea siempre tus sugerencias de lugares en el array "places" del JSON de salida para que la aplicación muestre fichas visuales interactivas, mini-mapas y ETAs.

FORMATO DE RESPUESTA (DEBES DEVOLVER EXCLUSIVAMENTE UN OBJETO JSON):
{
  "message": "Mensaje de texto premium para el usuario...",
  "places": [
    {
      "name": "Nombre del lugar",
      "latitude": 48.8584,
      "longitude": 2.2945,
      "address": "Dirección completa",
      "rating": 4.7,
      "hours": "Horario (ej: 09:00 - 18:00)",
      "description": "Breve frase atractiva del porqué visitarlo o por qué le da tiempo de ir."
    }
  ],
  "suggested_actions": [
    { "type": "map", "label": "Ver en Mapa", "payload": { "lat": 48.8584, "lng": 2.2945, "name": "Nombre" } }
  ],
  "context_alert": "Opcional: aviso operativo corto si hay mucho tráfico o va justo de tiempo"
}
`;

export async function askContextualAssistantAction(params: {
  planId: string;
  profileId: string;
  userName: string;
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
  weather?: any;
  traffic?: any;
}) {
  const { planId, profileId, userName, message, history, userLocation, weather, traffic } = params;

  try {
    const openai = getOpenAIClient();
    const supabaseAdmin = getSupabaseAdmin();
    
    // 1. Build context
    const context = await buildUserTravelContext(planId, profileId, supabaseAdmin);

     // Get current local Paris time
    const now = new Date();
    const localTimeStr = now.toLocaleTimeString('es-ES', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
    const localDateStr = now.toLocaleDateString('es-ES', { timeZone: 'Europe/Paris' });

    // 1.5. Detect Category Intent and Search Google Places in real time
    let detectedType = '';
    const msgLower = message.toLowerCase();
    if (msgLower.includes('museo') || msgLower.includes('museum')) {
      detectedType = 'museum';
    } else if (msgLower.includes('café') || msgLower.includes('cafe') || msgLower.includes('coffee') || msgLower.includes('desayun')) {
      detectedType = 'cafe';
    } else if (msgLower.includes('restaurante') || msgLower.includes('cenar') || msgLower.includes('comer') || msgLower.includes('restaurant') || msgLower.includes('gastronom')) {
      detectedType = 'restaurant';
    } else if (msgLower.includes('farmacia') || msgLower.includes('pharmacy') || msgLower.includes('médico') || msgLower.includes('medico') || msgLower.includes('hospital')) {
      detectedType = 'pharmacy';
    } else if (msgLower.includes('metro') || msgLower.includes('subway') || msgLower.includes('tren') || msgLower.includes('estación') || msgLower.includes('estacion')) {
      detectedType = 'subway_station';
    } else if (msgLower.includes('taxi') || msgLower.includes('uber')) {
      detectedType = 'taxi_stand';
    } else if (msgLower.includes('supermercado') || msgLower.includes('súper') || msgLower.includes('super') || msgLower.includes('supermarket') || msgLower.includes('tienda')) {
      detectedType = 'supermarket';
    } else if (msgLower.includes('atracción') || msgLower.includes('atraccion') || msgLower.includes('turístico') || msgLower.includes('turistico') || msgLower.includes('visitar') || msgLower.includes('monumento') || msgLower.includes('attraction')) {
      detectedType = 'tourist_attraction';
    }

    let placesContext: any[] = [];
    if (detectedType) {
      try {
        const refLocation = userLocation || { lat: 48.8833, lng: 2.2833 }; // default to Paris Palais des Congrès
        const searchResult = await searchNearbyPlacesAction({ lat: refLocation.lat, lng: refLocation.lng }, detectedType, 1500);
        if (searchResult.success && searchResult.results) {
          placesContext = searchResult.results.slice(0, 5).map((p: any) => ({
            name: p.name,
            latitude: p.geometry?.location?.lat,
            longitude: p.geometry?.location?.lng,
            rating: p.rating,
            address: p.vicinity || p.formatted_address,
            open_now: p.opening_hours?.open_now
          }));
        }
      } catch (err) {
        console.error('Error fetching Google Places for assistant:', err);
      }
    }

    // 2. Prepare Context System Messages
    const contextPrompts: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: ASSISTANT_SYSTEM_PROMPT },
      { role: 'system', content: `USUARIO ACTUAL: ${userName}` },
      { role: 'system', content: `HORA LOCAL EN PARÍS: ${localTimeStr} (Fecha: ${localDateStr})` },
      { role: 'system', content: `UBICACIÓN GPS REAL DEL USUARIO: ${userLocation ? `${userLocation.lat}, ${userLocation.lng} (Precisión: ${userLocation.accuracy || 'desconocida'}m)` : 'No disponible'}` },
      { role: 'system', content: `CLIMA ACTUAL EN DESTINO: ${weather ? JSON.stringify(weather) : 'Sin datos actuales'}` },
      { role: 'system', content: `TRÁFICO ACTUAL EN DESTINO: ${traffic ? JSON.stringify(traffic) : 'Tráfico regular'}` },
      { role: 'system', content: `CATÁLOGO DE POIs PREMIUM EN PARÍS DISPONIBLES:\n${JSON.stringify(PARIS_POIS, null, 2)}` },
      { role: 'system', content: `CONTEXTO OPERATIVO DEL VIAJE:\n${JSON.stringify(context, null, 2)}` }
    ];

    if (placesContext.length > 0) {
      contextPrompts.push({
        role: 'system',
        content: `RESULTADOS DE BÚSQUEDA DE GOOGLE PLACES EN VIVO EN PARÍS PARA INTENCIÓN DE CATEGORÍA "${detectedType}":\n${JSON.stringify(placesContext, null, 2)}\nUsa estos lugares reales en tu respuesta en lugar de inventarlos, y colócalos en el array "places" de tu salida JSON.`
      });
    }

    // 3. Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        ...contextPrompts,
        ...history.slice(-8), // Keep last 8 messages for context
        { role: 'user' as const, content: message }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Sin respuesta del asistente.');

    const result = JSON.parse(content);

    // 4. Enrich recommended places with precise mobility calculations on the server side
    if (result.places && Array.isArray(result.places) && userLocation) {
      result.places = result.places.map((place: any) => {
        if (typeof place.latitude === 'number' && typeof place.longitude === 'number') {
          const dist = calculateHaversineDistance(userLocation.lat, userLocation.lng, place.latitude, place.longitude);
          
          // Haversine estimates: 80m/min walking speed (4.8 km/h), 300m/min driving (18 km/h) + congestion factor
          const walkTime = Math.max(1, Math.round((dist * 1000) / 80));
          const trafficDelay = traffic?.delayMinutes || (traffic?.congestionLevel === 'high' ? 8 : traffic?.congestionLevel === 'medium' ? 4 : 0);
          const driveTime = Math.max(1, Math.round((dist * 1000) / 300) + trafficDelay);
          const transitTime = Math.max(1, Math.round((dist * 1000) / 220) + 5); // transit time estimate including wait
          
          return {
            ...place,
            distance_km: parseFloat(dist.toFixed(2)),
            walking_time_min: walkTime,
            driving_time_min: driveTime,
            transit_time_min: transitTime,
            uber_price_range: `${Math.round(6 + dist * 1.4)}-${Math.round(9 + dist * 1.8)}€`
          };
        }
        return place;
      });
    }

    return {
      success: true,
      answer: result.message,
      places: result.places || [],
      actions: result.suggested_actions || [],
      alert: result.context_alert
    };
  } catch (error: any) {
    console.error('[AI City Companion Server Action] Error:', error);
    return { success: false, error: error.message || 'Error al conectar con el asistente.' };
  }
}
