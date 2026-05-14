import { PKPass } from 'passkit-generator';
import path from 'path';
import fs from 'fs/promises';
import { BoardingPassData, HospitalityPassData, TransferPassData } from './types';

export class ApplePassService {
  private static async getBasePass() {
    // These should be in .env.local
    const passTypeIdentifier = process.env.APPLE_PASS_TYPE_IDENTIFIER;
    const teamIdentifier = process.env.APPLE_TEAM_IDENTIFIER;
    const signerCert = process.env.APPLE_PASS_SIGNING_CERTIFICATE; // Base64
    const signerKey = process.env.APPLE_PASS_SIGNING_KEY; // Base64
    const signerPassphrase = process.env.APPLE_PASS_SIGNING_PASSWORD;
    const wwdrCert = process.env.APPLE_WWDR_CERTIFICATE; // Base64

    if (!passTypeIdentifier || !teamIdentifier || !signerCert || !signerKey || !wwdrCert) {
      console.warn('⚠️ Apple Wallet certificates missing. Pass will be unsigned and may not open.');
    }

    const certificates: any = {};
    if (wwdrCert) certificates.wwdr = Buffer.from(wwdrCert, 'base64');
    if (signerCert) certificates.signerCert = Buffer.from(signerCert, 'base64');
    if (signerKey) certificates.signerKey = Buffer.from(signerKey, 'base64');
    if (signerPassphrase) certificates.signerPassphrase = signerPassphrase;

    const pass = new PKPass({
      passTypeIdentifier: passTypeIdentifier || 'pass.com.placeholder',
      teamIdentifier: teamIdentifier || 'TEAMID',
      organizationName: 'JP Intelligence',
      description: 'Operational Intelligence Pass',
      backgroundColor: 'rgb(0, 0, 0)',
      foregroundColor: 'rgb(255, 255, 255)',
      labelColor: 'rgb(0, 229, 255)'
    } as any, certificates);

    pass.type = 'generic'; // Default, will change per type

    // Add Resources (Logo/Icon)
    try {
      const logoPath = path.join(process.cwd(), 'public/logo_jp_blanco.png');
      const logoBuffer = await fs.readFile(logoPath);
      (pass as any).addResource('logo.png', logoBuffer);
      (pass as any).addResource('icon.png', logoBuffer); // Use same for icon as fallback
    } catch (err) {
      console.error('Error adding resources to pass:', err);
    }

    return pass;
  }

  static async generateBoardingPass(data: BoardingPassData): Promise<Buffer> {
    const pass = await this.getBasePass() as any;
    pass.type = 'boardingPass';
    pass.transitType = 'PKTransitTypeAir';
    
    // Boarding Pass Specific Fields
    pass.boardingPass = {
      primaryFields: [
        { key: 'origin', label: data.departureCity, value: data.departureIata },
        { key: 'destination', label: data.arrivalCity, value: data.arrivalIata }
      ],
      secondaryFields: [
        { key: 'gate', label: 'GATE', value: data.gate || '--' },
        { key: 'seat', label: 'SEAT', value: data.seat || '--' },
        { key: 'boarding', label: 'BOARDING', value: data.boardingTime || '--' }
      ],
      auxiliaryFields: [
        { key: 'flight', label: 'FLIGHT', value: data.flightNumber },
        { key: 'passenger', label: 'PASSENGER', value: data.passengerName }
      ],
      backFields: [
        { key: 'info', label: 'JP Intelligence', value: 'This pass is generated for operational excellence. Contact your concierge for support.' }
      ]
    };

    if (data.qrCode) {
      pass.barcodes = [{
        message: data.qrCode,
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1'
      }];
    }

    return pass.asBuffer();
  }

  static async generateHospitalityPass(data: HospitalityPassData): Promise<Buffer> {
    const pass = await this.getBasePass() as any;
    pass.type = 'generic';
    
    pass.generic = {
      primaryFields: [
        { key: 'event', label: 'EVENTO', value: data.eventTitle }
      ],
      secondaryFields: [
        { key: 'venue', label: 'ESTABLECIMIENTO', value: data.venueName },
        { key: 'time', label: 'FECHA/HORA', value: data.datetime }
      ],
      auxiliaryFields: [
        { key: 'guest', label: 'INVITADO', value: data.reservationName }
      ]
    };

    if (data.address) {
      pass.generic.backFields = [
        { key: 'location', label: 'DIRECCIÓN', value: data.address }
      ];
    }

    if (data.qrCode) {
      pass.barcodes = [{
        message: data.qrCode,
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1'
      }];
    }

    return pass.asBuffer();
  }

  static async generateTransferPass(data: TransferPassData): Promise<Buffer> {
    const pass = await this.getBasePass() as any;
    pass.type = 'generic';

    pass.generic = {
      primaryFields: [
        { key: 'type', label: 'TRASLADO', value: 'VIP Transfer' }
      ],
      secondaryFields: [
        { key: 'pickup', label: 'RECOGIDA', value: data.pickupLocation },
        { key: 'dropoff', label: 'DESTINO', value: data.dropoffLocation }
      ],
      auxiliaryFields: [
        { key: 'time', label: 'HORA', value: data.datetime },
        { key: 'driver', label: 'CONDUCTOR', value: data.driverName || 'Asignado' }
      ]
    };

    if (data.vehicleInfo) {
      pass.generic.backFields = [
        { key: 'vehicle', label: 'VEHÍCULO', value: data.vehicleInfo }
      ];
    }

    return pass.asBuffer();
  }
}
