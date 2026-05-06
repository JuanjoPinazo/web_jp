/**
 * Flight Utilities
 * Handle calculations for duration, distance, and check-in times.
 */

// Simple IATA database for common coordinates
// [Latitude, Longitude]
export const IATA_COORDS: Record<string, [number, number]> = {
  'VLC': [39.4893, -0.4816],  // Valencia
  'ORY': [48.7262, 2.3652],   // Paris Orly
  'CDG': [49.0097, 2.5479],   // Paris Charles de Gaulle
  'MAD': [40.4839, -3.5680],  // Madrid
  'BCN': [41.2974, 2.0833],   // Barcelona
  'ALC': [38.2822, -0.5582],  // Alicante
  'PMI': [39.5517, 2.7388],   // Palma de Mallorca
  'AGP': [36.6749, -4.4991],  // Malaga
  'BIO': [43.3011, -2.9106],  // Bilbao
  'SVQ': [37.4180, -5.8931],  // Seville
  'SCQ': [42.8963, -8.4151],  // Santiago de Compostela
  'LPA': [27.9319, -15.3866], // Gran Canaria
  'TFN': [28.4827, -16.3415], // Tenerife North
  'TFS': [28.0445, -16.5725], // Tenerife South
  'LGW': [51.1481, -0.1903],  // London Gatwick
  'LHR': [51.4700, -0.4543],  // London Heathrow
  'STN': [51.8860, 0.2389],   // London Stansted
  'FRA': [50.0379, 8.5622],   // Frankfurt
  'MUC': [48.3537, 11.7861],  // Munich
  'AMS': [52.3105, 4.7683],   // Amsterdam
  'FCO': [41.8003, 12.2389],  // Rome Fiumicino
  'LIS': [38.7756, -9.1354],  // Lisbon
};

/**
 * Calculates distance between two IATA codes in kilometers using Haversine formula.
 */
export function calculateDistance(origin: string, destination: string): number | null {
  const coord1 = IATA_COORDS[origin.toUpperCase()];
  const coord2 = IATA_COORDS[destination.toUpperCase()];

  if (!coord1 || !coord2) return null;

  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calculates duration between two dates in minutes.
 */
export function calculateDuration(departure: string, arrival: string): number {
  const dep = new Date(departure);
  const arr = new Date(arrival);
  const diffMs = arr.getTime() - dep.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60)));
}

/**
 * Formats duration in minutes to "Xh Ym" string.
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function calculateCheckinDeadline(departure: string, offsetMinutes = 40): string {
  // We MUST ignore timezones completely. 
  // If the string says 15:25, we want to subtract minutes from 15:25.
  
  try {
    const parts = departure.split('T');
    const datePart = parts[0];
    const timePart = parts[1].substring(0, 5); // HH:mm
    
    const [h, m] = timePart.split(':').map(Number);
    let totalMinutes = h * 60 + m - offsetMinutes;
    
    let finalDatePart = datePart;
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
      // Subtract one day (simplified)
      const d = new Date(datePart);
      d.setDate(d.getDate() - 1);
      finalDatePart = d.toISOString().split('T')[0];
    }
    
    const finalH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const finalM = String(totalMinutes % 60).padStart(2, '0');
    
    return `${finalDatePart}T${finalH}:${finalM}:00`;
  } catch (e) {
    // Fallback just in case
    return departure;
  }
}
