import { GoogleMapsService } from '../src/core/services/google-maps.service';

async function runTests() {
  // Coordenadas aproximadas de París para el test
  const hotelNapoleon = { lat: 48.8756, lng: 2.2952 };
  const palaisCongres = { lat: 48.8785, lng: 2.2835 };

  console.log('🚀 Iniciando Tests Geográficos...');

  const modes: any[] = ['WALKING', 'DRIVING', 'TRANSIT'];

  for (const mode of modes) {
    console.log(`\n--- Probando modo: ${mode} ---`);
    try {
      const start = Date.now();
      const route = await GoogleMapsService.getRoute(hotelNapoleon, palaisCongres, mode);
      const end = Date.now();

      if (route) {
        console.log(`✅ Resultado (${route.source}): ${route.distance_text} en ${route.duration_text}`);
        console.log(`⏱️ Latencia: ${end - start}ms`);
      } else {
        console.log('❌ Error al obtener ruta (probablemente API key no configurada o error de red)');
      }
    } catch (err: any) {
      console.error(`❌ Error fatal: ${err.message}`);
    }
  }
}

runTests();
