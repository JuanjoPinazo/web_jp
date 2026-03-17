export type IconType = 'Anchor' | 'Waves' | 'Utensils' | 'TreePine' | 'Baby';

export interface Restaurant {
  id: string;
  name: string;
  tagline: string;
  specialty: string; // JP Insight
  kidsFactor: string; // Operational Fit
  address: string;
  mapsUrl: string;
  phone: string;
  web: string;
  webUrl: string;
  bookingUrl: string;
  color: string;
  borderColor: string;
  iconName: IconType;
  badge: string;
  rating: string;
  imageUrl: string;
}

export const restaurants: Restaurant[] = [
  {
    id: '1',
    name: "Gran Azul",
    tagline: "Alta Cocina de Mercado y Brasa",
    specialty: "Arroces técnicos, pescados salvajes y carnes premium",
    kidsFactor: "Local amplio y moderno con techos altos. Su variada carta permite opciones sencillas para niños con una calidad excepcional.",
    address: "Av. de Aragó, 10, 46021 València",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Restaurante+Gran+Azul+Valencia",
    phone: "961 47 45 23",
    web: "granazulrestaurante.com",
    webUrl: "https://granazulrestaurante.com/",
    bookingUrl: "https://granazulrestaurante.com/reserva-tu-mesa/",
    color: "blue",
    borderColor: "border-blue-500/20",
    iconName: 'Anchor',
    badge: "Top Valoración",
    rating: "4.5",
    imageUrl: "/restaurants/gran_azul.png"
  },
  {
    id: '2',
    name: "Casa Carmela",
    tagline: "El Templo de la Leña",
    specialty: "La mejor Paella Valenciana tradicional a leña",
    kidsFactor: "Frente a la Malvarrosa. La playa es el desahogo perfecto para los niños antes o después de la comida.",
    address: "C/ d'Isabel de Villena, 155, 46011 València",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Casa+Carmela+Valencia",
    phone: "963 71 00 73",
    web: "casa-carmela.com",
    webUrl: "https://www.casa-carmela.com/",
    bookingUrl: "https://www.casa-carmela.com/es/reservar/",
    color: "orange",
    borderColor: "border-orange-500/20",
    iconName: 'Waves',
    badge: "Icono Histórico",
    rating: "4.4",
    imageUrl: "/restaurants/casa_carmela.png"
  },
  {
    id: '3',
    name: "La Principal",
    tagline: "Elegancia y Variedad Urbana",
    specialty: "Cocina mediterránea tradicional y tapeo de calidad",
    kidsFactor: "Ubicación céntrica y local espacioso. Carta muy flexible que se adapta a todos los paladares infantiles.",
    address: "C/ de l'Arquebisbe Mayoral, 14, 46002 València",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=La+Principal+Valencia",
    phone: "963 52 35 30",
    web: "laprincipalrestaurante.es",
    webUrl: "https://www.laprincipalrestaurante.es/",
    bookingUrl: "https://www.laprincipalrestaurante.es/reservas/",
    color: "slate",
    borderColor: "border-slate-500/20",
    iconName: 'Utensils',
    badge: "Versatilidad",
    rating: "4.2",
    imageUrl: "/restaurants/la_principal.png"
  },
  {
    id: '4',
    name: "Nou Racó",
    tagline: "Naturaleza en la Albufera",
    specialty: "Arroces clásicos en entorno privilegiado",
    kidsFactor: "Entorno inigualable con jardines y paseos en barca. El mejor para que los niños conecten con la naturaleza.",
    address: "Carretera del Palmar, 21, 46012 València",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Nou+Raco+Valencia",
    phone: "961 62 01 72",
    web: "nouraco.com",
    webUrl: "https://nouraco.com/",
    bookingUrl: "https://nouraco.com/reservas/",
    color: "emerald",
    borderColor: "border-emerald-500/20",
    iconName: 'TreePine',
    badge: "Entorno Único",
    rating: "4.1",
    imageUrl: "/restaurants/nou_raco.png"
  },
  {
    id: '5',
    name: "Mas Blayet",
    tagline: "Oasis Familiar",
    specialty: "Arroces y brasas en masía urbana",
    kidsFactor: "Zona infantil privada con juegos. Es el más cómodo logísticamente para padres con niños pequeños.",
    address: "Av. de la Plata, 12, 46013 València",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Mas+Blayet+Valencia",
    phone: "963 95 02 15",
    web: "masblayet.com",
    webUrl: "https://masblayet.com/",
    bookingUrl: "https://masblayet.com/reservas/",
    color: "amber",
    borderColor: "border-amber-500/20",
    iconName: 'Baby',
    badge: "Family Friendly",
    rating: "4.1",
    imageUrl: "/restaurants/mas_blayet.png"
  }
];
