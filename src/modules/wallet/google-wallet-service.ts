import { JWT } from 'google-auth-library';
import { BoardingPassData, HospitalityPassData, TransferPassData } from './types';

export class GoogleWalletService {
  private static issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  private static serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  private static privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

  private static async getClient() {
    if (!this.serviceAccountEmail || !this.privateKey) {
      throw new Error('Google Wallet credentials missing');
    }
    return new JWT({
      email: this.serviceAccountEmail,
      key: this.privateKey,
      scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
    });
  }

  static async generateSaveLink(type: 'flight' | 'hospitality' | 'transfer', data: any): Promise<string> {
    const claims = {
      iss: this.serviceAccountEmail,
      aud: 'google',
      origins: [],
      typ: 'savetowallet',
      payload: {
        flightObjects: type === 'flight' ? [this.createFlightObject(data)] : [],
        eventTicketObjects: type === 'hospitality' ? [this.createEventObject(data)] : [],
        genericObjects: type === 'transfer' ? [this.createGenericObject(data)] : []
      }
    };

    const token = await this.signToken(claims);
    return `https://pay.google.com/gp/v/save/${token}`;
  }

  private static async signToken(claims: any): Promise<string> {
    const client = await this.getClient();
    // In a real implementation, we would use a JWT library to sign this with the private key
    // For now, this represents the architecture. Google requires a specific JWT format.
    // We'll use the 'google-auth-library' or 'jsonwebtoken' to sign.
    const jwt = require('jsonwebtoken');
    return jwt.sign(claims, this.privateKey, { algorithm: 'RS256' });
  }

  private static createFlightObject(data: BoardingPassData) {
    return {
      id: `${this.issuerId}.flight_${Date.now()}`,
      classId: `${this.issuerId}.flight_class`,
      state: 'ACTIVE',
      passengerName: data.passengerName,
      reservationInfo: {
        confirmationCode: data.flightNumber
      },
      boardingAndSeatingInfo: {
        seatNumber: data.seat || '--',
        boardingGroup: data.gate || '--'
      },
      reservationDetail: {
        origin: { iataCode: data.departureIata, terminal: 'T1' },
        destination: { iataCode: data.arrivalIata }
      }
    };
  }

  private static createEventObject(data: HospitalityPassData) {
    return {
      id: `${this.issuerId}.event_${Date.now()}`,
      classId: `${this.issuerId}.event_class`,
      state: 'ACTIVE',
      eventName: { defaultValue: { language: 'es-ES', value: data.eventTitle } },
      venue: { name: { defaultValue: { language: 'es-ES', value: data.venueName } } },
      dateTime: { start: data.datetime }
    };
  }

  private static createGenericObject(data: TransferPassData) {
    return {
      id: `${this.issuerId}.transfer_${Date.now()}`,
      classId: `${this.issuerId}.transfer_class`,
      state: 'ACTIVE',
      title: { defaultValue: { language: 'es-ES', value: 'VIP Transfer' } },
      header: { defaultValue: { language: 'es-ES', value: data.pickupLocation } },
      subheader: { defaultValue: { language: 'es-ES', value: data.dropoffLocation } }
    };
  }
}
