export type WalletPassType = 'boarding_pass' | 'hospitality' | 'transfer';

export interface BoardingPassData {
  airline: string;
  flightNumber: string;
  passengerName: string;
  departureIata: string;
  departureCity: string;
  arrivalIata: string;
  arrivalCity: string;
  departureTime: string;
  gate?: string;
  seat?: string;
  boardingTime?: string;
  qrCode?: string;
}

export interface HospitalityPassData {
  eventTitle: string;
  venueName: string;
  address?: string;
  datetime: string;
  reservationName: string;
  qrCode?: string;
}

export interface TransferPassData {
  pickupLocation: string;
  dropoffLocation: string;
  datetime: string;
  driverName?: string;
  vehicleInfo?: string;
  qrCode?: string;
}
