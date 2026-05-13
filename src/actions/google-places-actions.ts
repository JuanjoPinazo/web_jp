'use server';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Searches for places using Google Places API (Text Search)
 * @param query The search term
 * @param city Optional city to refine the search
 */
export async function searchPlacesAction(query: string, city?: string) {
  if (!API_KEY) {
    console.error('GOOGLE_MAPS_API_KEY is missing in environment variables');
    throw new Error('Configuración de API de Google Maps no encontrada. Por favor, configura GOOGLE_MAPS_API_KEY.');
  }

  try {
    const fullQuery = city ? `${query} in ${city}` : query;
    const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    url.searchParams.append('query', fullQuery);
    url.searchParams.append('key', API_KEY);
    // Prefer results in Spanish if possible
    url.searchParams.append('language', 'es');

    console.log(`[GooglePlaces] Searching for: "${fullQuery}"`);

    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google API status error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    return {
      success: true,
      results: data.results || [],
      status: data.status
    };
  } catch (error: any) {
    console.error('[GooglePlaces] Search Error:', error.message);
    return {
      success: false,
      error: error.message || 'Error desconocido al buscar lugares'
    };
  }
}

/**
 * Gets detailed information for a specific place
 * @param placeId The Google Place ID
 */
export async function getPlaceDetailsAction(placeId: string) {
  if (!API_KEY) {
    throw new Error('Configuración de API de Google Maps no encontrada.');
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.append('place_id', placeId);
    url.searchParams.append('key', API_KEY);
    url.searchParams.append('language', 'es');
    // Fields we want to retrieve
    url.searchParams.append('fields', 'name,formatted_address,address_components,place_id,rating,geometry,formatted_phone_number,website');

    console.log(`[GooglePlaces] Fetching details for: ${placeId}`);

    const response = await fetch(url.toString(), {
      next: { revalidate: 86400 } // Cache for 24 hours
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Google API status error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    return {
      success: true,
      place: data.result
    };
  } catch (error: any) {
    console.error('[GooglePlaces] Details Error:', error.message);
    return {
      success: false,
      error: error.message || 'Error desconocido al obtener detalles'
    };
  }
}

/**
 * Saves a place from Google details to the hotels_master table
 * @param place The place object from Google API
 */
export async function saveHotelMasterFromPlaceAction(place: any) {
  if (!place || !place.place_id || !place.name || !place.formatted_address) {
    return { success: false, error: 'Datos incompletos para guardar el hotel.' };
  }

  const { getSupabaseAdmin } = await import('@/lib/supabase-admin');
  const supabaseAdmin = getSupabaseAdmin();

  // Extract address components
  const components = place.address_components || [];
  const getComponent = (type: string) => {
    return components.find((c: any) => c.types.includes(type))?.long_name || '';
  };

  const city = getComponent('locality') || getComponent('administrative_area_level_2');
  const country = getComponent('country');
  const postalCode = getComponent('postal_code');

  const latitude = place.geometry?.location?.lat;
  const longitude = place.geometry?.location?.lng;

  if (latitude === undefined || longitude === undefined) {
    return { success: false, error: 'Coordenadas (lat/lng) no encontradas.' };
  }

  try {
    const hotelData = {
      name: place.name,
      address: place.formatted_address,
      city: city,
      country: country,
      postal_code: postalCode,
      latitude: latitude,
      longitude: longitude,
      rating: place.rating || null,
      google_place_id: place.place_id,
      phone: place.formatted_phone_number || null,
      website: place.website || null,
      metadata: {
        raw_google_data: place,
        saved_at: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('hotels_master')
      .upsert(hotelData, { onConflict: 'google_place_id' })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      hotel: data,
      message: 'Hotel guardado correctamente en el catálogo maestro.'
    };
  } catch (error: any) {
    console.error('[GooglePlaces] Save Master Error:', error.message);
    return {
      success: false,
      error: error.message || 'Error al guardar el hotel en el catálogo'
    };
  }
}
