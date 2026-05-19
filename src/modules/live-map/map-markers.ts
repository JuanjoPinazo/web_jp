import { MapLocationType } from './types';

// Iconos en formato Path SVG para una resolución cristalina
const SVG_PATHS = {
  hotel: 'M19 13H5v4H3V5h2v6h14V5h2v12h-2v-4zM5 9h14V7H5v2zm-2 9h18v2H3v-2z', // Cama simplificada
  airport: 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z', // Avión
  congress: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z', // Calendario / Sede
  restaurant: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8h2.5V2c-2.76 0-5 2.24-5 4z', // Tenedor y Cuchillo
  hospitality: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z', // Estrella / Gala
  transfer: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.27-3.82c.13-.38.49-.68.88-.68h9.7c.39 0 .75.3.88.68L19 11H5z', // Coche
  user: 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z', // Posición GPS
  other: 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z'
};

const MARKER_COLORS: Record<MapLocationType, string> = {
  user: '#00D1FF',        // Azul JP
  hotel: '#10B981',       // Verde Esmeralda
  airport: '#3B82F6',     // Azul Vuelo
  congress: '#A855F7',    // Violeta Sede
  restaurant: '#F97316',  // Naranja Gastro
  hospitality: '#EC4899', // Rosa Evento
  transfer: '#EAB308',    // Amarillo Chófer
  other: '#9CA3AF'
};

export class MapMarkers {
  /**
   * Genera el SVG en formato Data URI para el marcador del mapa de Google.
   */
  static getMarkerSvg(type: MapLocationType, active: boolean = false): string {
    const color = MARKER_COLORS[type] || MARKER_COLORS.other;
    const path = SVG_PATHS[type] || SVG_PATHS.user;
    
    // Si está activo, el pin es un poco más grande y tiene un efecto de brillo
    const size = active ? 48 : 40;
    const center = size / 2;
    const radius = active ? 19 : 16;
    const iconScale = active ? 'translate(12, 12) scale(1)' : 'translate(8, 8) scale(0.8)';
    const strokeWidth = active ? 3 : 2;

    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Glow exterior si está activo -->
        ${active ? `<circle cx="${center}" cy="${center}" r="22" fill="${color}" fill-opacity="0.15" />` : ''}
        <!-- Círculo base negro (para contraste premium dark) -->
        <circle cx="${center}" cy="${center}" r="${radius}" fill="#0A0A0A" stroke="${color}" stroke-width="${strokeWidth}" />
        <!-- Fondo suave del color temático -->
        <circle cx="${center}" cy="${center}" r="${radius - 4}" fill="${color}" fill-opacity="0.12" />
        <!-- Icono centrado -->
        <g transform="${iconScale}">
          <path d="${path}" fill="${color}" />
        </g>
      </svg>
    `.trim().replace(/\s+/g, ' ');

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  /**
   * Crea la configuración de MarkerOptions para un marcador personalizado de Google Maps.
   */
  static createMarkerOptions(
    googleMaps: typeof google.maps,
    type: MapLocationType,
    active: boolean = false
  ): google.maps.Icon {
    const size = active ? 48 : 40;
    return {
      url: this.getMarkerSvg(type, active),
      size: new googleMaps.Size(size, size),
      scaledSize: new googleMaps.Size(size, size),
      origin: new googleMaps.Point(0, 0),
      anchor: new googleMaps.Point(size / 2, size / 2) // Centrado perfecto
    };
  }
}
