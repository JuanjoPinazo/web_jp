import { User, Dossier, Case } from '@/types/platform';

export const mockUsers: User[] = [
  {
    id: 'admin-1',
    name: "Juanjo",
    surname: "Pinazo",
    email: "juanjo@pinazo.com",
    phone: "123456789",
    role: 'admin',
    password: 'admin'
  },
  {
    id: 'client-1',
    name: "Juan Gabriel",
    surname: "Córdoba Soriano",
    email: "jgcordobas@hotmail.com",
    phone: "987654321",
    role: 'client',
    password: 'doctor'
  }
];

export const mockCases: Case[] = [
  {
    id: 'case-1',
    userId: 'client-1',
    title: "Viaje Corporativo Tech 2026",
    type: 'travel',
    description: "Planificación estratégica para el congreso anual de tecnología en Valencia, incluyendo agenda de networking y ocio de alta nivel.",
    startDate: "2026-10-15",
    endDate: "2026-10-20",
    items: [
      { id: 'item-1', caseId: 'case-1', type: 'flight', title: 'Vuelo Madrid - Valencia', description: 'IB8762 - Salida 09:00', date: '2026-10-15' },
      { id: 'item-2', caseId: 'case-1', type: 'hotel', title: 'The Westin Valencia', description: 'Reserva confirmed #78291', date: '2026-10-15' },
      { id: 'item-3', caseId: 'case-1', type: 'restaurant', title: 'Cena networking: Gran Azul', description: 'Reserva para 4 pax', date: '2026-10-16' }
    ]
  },
  {
    id: 'case-2',
    userId: 'client-1',
    title: "Fin de Semana Familiar",
    type: 'leisure',
    description: "Propuesta de ocio centrada en la logística con niños y calidad gastronómica.",
    startDate: "2026-11-05",
    endDate: "2026-11-07",
    items: [
      { id: 'item-4', caseId: 'case-2', type: 'event', title: 'Bioparc Valencia', description: 'Entradas digitales descargadas', date: '2026-11-06' }
    ]
  }
];

export const mockDossiers: Dossier[] = [
  {
    id: 'dos-1',
    userId: 'client-1',
    title: "Valencia Inteligente: Domingo Gastronómico",
    description: "Una selección de restaurantes orientada a la logística familiar, la calidad técnica y el entorno para este domingo.",
    date: "17/10/2026",
    recommendations: [
      {
        id: 'rec-1',
        restaurantId: '1', // Gran Azul
        jpScore: { quality: 9, logistics: 8, experience: 8 },
        personalNote: "La mejor opción técnica por su sistema de reservas y amplitud de sala."
      },
      {
        id: 'rec-2',
        restaurantId: '2', // Casa Carmela
        jpScore: { quality: 10, logistics: 5, experience: 9 },
        personalNote: "El referente absoluto en paella clásica. Imprescindible reservar con mucha antelación."
      },
      {
        id: 'rec-3',
        restaurantId: '3', // La Principal
        jpScore: { quality: 8, logistics: 9, experience: 7 },
        personalNote: "Máxima versatilidad en el centro. Ideal para una comida ágil y de calidad."
      },
      {
        id: 'rec-4',
        restaurantId: '4', // Nou Racó
        jpScore: { quality: 8, logistics: 7, experience: 10 },
        personalNote: "Para una experiencia diferencial en la Albufera si el tiempo acompaña."
      },
      {
        id: 'rec-5',
        restaurantId: '5', // Mas Blayet
        jpScore: { quality: 7, logistics: 10, experience: 8 },
        personalNote: "La mejor logística familiar de la ciudad. Zona de juegos imbatible para niños."
      }
    ]
  }
];
