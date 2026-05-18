import { LiveWeatherStatus } from './types';

export async function monitorWeather(cityName: string, latitude: number, longitude: number): Promise<LiveWeatherStatus> {
  // Deterministic simulation based on city name hash
  const hash = cityName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  let temperatureCelsius = 18;
  let condition: LiveWeatherStatus['condition'] = 'CLEAR';
  let precipitationProbability = 10;
  let windSpeedKmh = 12;
  let description = 'Cielo despejado y clima agradable';

  // Inject different weather conditions depending on the city name hash
  if (hash % 6 === 0) {
    condition = 'RAIN';
    temperatureCelsius = 14;
    precipitationProbability = 85;
    windSpeedKmh = 22;
    description = 'Lluvia ligera prevista en la zona';
  } else if (hash % 9 === 0) {
    condition = 'WINDY';
    temperatureCelsius = 12;
    precipitationProbability = 20;
    windSpeedKmh = 45;
    description = 'Vientos fuertes racheados en las inmediaciones del aeropuerto';
  } else if (hash % 11 === 0) {
    condition = 'HEAT_WAVE';
    temperatureCelsius = 38;
    precipitationProbability = 5;
    windSpeedKmh = 8;
    description = 'Ola de calor extremo en la zona, manténgase hidratado';
  } else if (hash % 4 === 0) {
    condition = 'CLOUDY';
    temperatureCelsius = 16;
    precipitationProbability = 30;
    windSpeedKmh = 15;
    description = 'Cielo cubierto con intervalos nubosos';
  }

  return {
    location: cityName,
    temperatureCelsius,
    condition,
    precipitationProbability,
    windSpeedKmh,
    description
  };
}
