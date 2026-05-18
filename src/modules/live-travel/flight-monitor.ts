import { LiveFlightStatus } from './types';

/**
 * Monitors flights, detecting delays, gate changes, and cancellations.
 * If no real API, simulates realistic operational status based on flight number or random deterministic factors.
 */
export async function monitorFlight(flightId: string, flightNumber: string, scheduledTime: Date): Promise<LiveFlightStatus> {
  // Deterministic simulation based on flightId / flightNumber
  const hash = flightNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  let status: LiveFlightStatus['status'] = 'SCHEDULED';
  let delayMinutes = 0;
  let gate: string | null = 'G12';

  // Inject deterministic delays or cancellations for certain numbers
  if (hash % 7 === 0) {
    status = 'DELAYED';
    delayMinutes = 45;
    gate = 'G14';
  } else if (hash % 13 === 0) {
    status = 'CANCELLED';
    delayMinutes = 0;
    gate = null;
  } else if (hash % 5 === 0) {
    status = 'BOARDING';
    delayMinutes = 0;
    gate = 'H2';
  }

  const estimatedTime = new Date(scheduledTime.getTime() + delayMinutes * 60 * 1000);

  return {
    flightId,
    flightNumber,
    status,
    delayMinutes,
    gate,
    scheduledTime,
    estimatedTime
  };
}
