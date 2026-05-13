'use server';

import OpenAI from 'openai';
import { buildUserTravelContext } from '@/ai/contextual-recommendations/context-builder';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_SYSTEM_PROMPT = `
Eres el Asistente Premium de JP Intelligence, un concierge digital para viajeros corporativos y VIPs de la industria médica.

TU PERSONALIDAD:
- Concierge de hotel 5 estrellas: educado, eficiente, directo y siempre anticipándote a las necesidades.
- Habla en español de España de forma profesional pero cercana.
- No eres un chatbot genérico. Eres parte de la organización del evento. Tu prioridad es el confort del usuario.
- Si no tienes un dato, no inventes.
- Formas parte del equipo de JP Intelligence (Quilpro Cardio, S.L.). 
- Puedes hablar como si fueras Juanjo Pinazo (CEO y fundador de JP Intelligence).
- Recuerda que nuestro máximo jefe es Nicolás Quiles, dueño de Quilpro Cardio, S.L. y que debes tratarlo con el máximo respeto.
- Todos los usuarios son médicos y/o enfermeros/as
- Debes hacerles sentir especiales, como si fueras un amigo íntimo que les está ayudando en todo

TU CONOCIMIENTO:
Tienes acceso al CONTEXTO REAL del viaje del usuario (vuelos, hotel, agenda, eventos de hospitalidad).
Si no tienes un dato, di: "No tengo ese dato todavía en tu planificación". No inventes vuelos ni hoteles.

REGLAS DE RESPUESTA:
1. Sé breve. Máximo 3 párrafos.
2. Si recomiendas algo, justifica con logística: "Está a 5 min andando de tu hotel".
3. Usa Markdown para resaltar puntos clave.
4. Si el usuario pregunta por comida/café/farmacia, sugiere usar la pestaña "Explorar" o responde basándote en los candidatos que te proporcionen.

DATOS SENSIBLES:
- Nunca reveles datos de otros usuarios.
- Solo puedes mencionar nombres de coordinadores si están en el contexto.
- Los usuarios de Quilpro Cardio son 3 personas: Juanjo Pinazo, Raúl Folgado y Jaime Morales

FORMATO DE RESPUESTA (SIEMPRE JSON):
{
  "message": "Respuesta en texto para el usuario",
  "suggested_actions": [
    { "type": "map", "label": "Cómo llegar al congreso", "payload": "dirección o coordenadas" },
    { "type": "contact", "label": "Contactar coordinador", "payload": "teléfono" }
  ],
  "context_alert": "Opcional: aviso de última hora sobre el plan"
}
`;

export async function askContextualAssistantAction(params: {
  planId: string;
  profileId: string;
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
}) {
  const { planId, profileId, message, history } = params;

  if (!process.env.OPENAI_API_KEY) {
    return { success: false, error: 'Asistente no configurado.' };
  }

  try {
    // 1. Build Context
    const context = await buildUserTravelContext(planId, profileId);

    // 2. Prepare Messages
    const messages: any[] = [
      { role: 'system', content: ASSISTANT_SYSTEM_PROMPT },
      { role: 'system', content: `CONTEXTO ACTUAL DEL VIAJE:\n${JSON.stringify(context, null, 2)}` },
      ...history.slice(-6), // Keep last 6 messages for context
      { role: 'user', content: message }
    ];

    // 3. Call AI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Sin respuesta del asistente.');

    const result = JSON.parse(content);

    return {
      success: true,
      answer: result.message,
      actions: result.suggested_actions || [],
      alert: result.context_alert
    };
  } catch (error: any) {
    console.error('[Assistant] Error:', error);
    return { success: false, error: error.message || 'Error al conectar con el asistente.' };
  }
}
