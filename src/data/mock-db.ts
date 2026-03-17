import { User, Dossier } from '@/types/platform';

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
        restaurantId: '4', // Nou Racó
        jpScore: { quality: 8, logistics: 7, experience: 10 },
        personalNote: "Para una experiencia diferencial en la Albufera si el tiempo acompaña."
      }
    ]
  }
];
