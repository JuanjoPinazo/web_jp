
/**
 * IATA Bar Coded Boarding Pass (BCBP) Parser
 * Spec: IATA Resolution 792
 */
export function parseIataBCBP(payload: string) {
  if (!payload || payload.length < 20) return null;

  try {
    // Format: M1PASSEGNER/NAME   EABC123 LONMADVY 8162 123Y001A0001 100
    // M: Format Code (M = Multiple)
    // 1: Number of legs
    
    const passengerName = payload.substring(2, 22).trim();
    const pnr = payload.substring(23, 30).trim();
    const from = payload.substring(30, 33).trim();
    const to = payload.substring(33, 36).trim();
    const airline = payload.substring(36, 39).trim();
    const flightNumber = payload.substring(39, 44).trim();
    
    // Day of year (Julian date) - 3 chars at 44-47
    // Compartment - 1 char at 47
    const seat = payload.substring(48, 52).trim();
    const sequence = payload.substring(52, 57).trim();

    return {
      passenger_name: passengerName.replace('/', ' '),
      booking_reference: pnr,
      departure_location: from,
      arrival_location: to,
      airline_iata: airline,
      flight_number_raw: flightNumber,
      seat: seat,
      sequence: sequence
    };
  } catch (err) {
    console.error('Error parsing IATA BCBP:', err);
    return null;
  }
}
