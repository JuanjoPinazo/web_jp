import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { ApplePassService } from '@/modules/wallet/apple-pass-service';
import { GoogleWalletService } from '@/modules/wallet/google-wallet-service';
import { BoardingPassData, HospitalityPassData, TransferPassData } from '@/modules/wallet/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type, id } = await params;
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || 'apple';
    const supabase = getSupabaseAdmin();

    let passBuffer: Buffer | null = null;
    let googleSaveLink: string | null = null;
    let filename: string = '';
    let passData: any = null;

    if (type === 'flight') {
      const { data: flight, error } = await supabase
        .from('contact_travel_flights')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !flight) return NextResponse.json({ error: 'Flight not found' }, { status: 404 });

      // Fetch passenger name from profile
      const { data: plan } = await supabase
        .from('contact_travel_plans')
        .select('profiles(nombre, apellidos)')
        .eq('id', flight.plan_id)
        .single();
      
      const passengerName = plan?.profiles ? `${(plan.profiles as any).nombre} ${(plan.profiles as any).apellidos}` : 'Passenger';

      passData = {
        airline: flight.airline || 'Airline',
        flightNumber: flight.flight_number,
        passengerName,
        departureIata: flight.departure_iata || 'DEP',
        departureCity: flight.departure_location || 'Departure',
        arrivalIata: flight.arrival_iata || 'ARR',
        arrivalCity: flight.arrival_location || 'Arrival',
        departureTime: new Date(flight.departure_time).toLocaleString(),
        gate: flight.gate,
        seat: flight.seat,
        qrCode: flight.boarding_pass_url || flight.id
      };

      if (platform === 'apple') {
        passBuffer = await ApplePassService.generateBoardingPass(passData);
        filename = `boarding-pass-${flight.flight_number}.pkpass`;
      } else {
        googleSaveLink = await GoogleWalletService.generateSaveLink('flight', passData);
      }

    } else if (type === 'hospitality') {
      const { data: event, error } = await supabase
        .from('hospitality_events')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

      passData = {
        eventTitle: event.title,
        venueName: event.venue_name || 'Venue',
        address: event.address,
        datetime: new Date(event.start_datetime).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' }),
        reservationName: 'Guest', // Could fetch from plan
        qrCode: event.id
      };

      if (platform === 'apple') {
        passBuffer = await ApplePassService.generateHospitalityPass(passData);
        filename = `invitation-${event.title.replace(/\s+/g, '-')}.pkpass`;
      } else {
        googleSaveLink = await GoogleWalletService.generateSaveLink('hospitality', passData);
      }

    } else if (type === 'transfer') {
      const { data: transfer, error } = await supabase
        .from('contact_travel_transfers')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });

      passData = {
        pickupLocation: transfer.pickup_location,
        dropoffLocation: transfer.dropoff_location,
        datetime: new Date(transfer.pickup_datetime).toLocaleString('es-ES', { timeStyle: 'short' }),
        driverName: transfer.driver_name,
        vehicleInfo: transfer.vehicle_model
      };

      if (platform === 'apple') {
        passBuffer = await ApplePassService.generateTransferPass(passData);
        filename = `transfer-${transfer.id.slice(0, 8)}.pkpass`;
      } else {
        googleSaveLink = await GoogleWalletService.generateSaveLink('transfer', passData);
      }

    } else {
      return NextResponse.json({ error: 'Invalid pass type' }, { status: 400 });
    }

    if (platform === 'google' && googleSaveLink) {
      return NextResponse.redirect(googleSaveLink);
    }

    if (passBuffer) {
      return new Response(new Uint8Array(passBuffer), {
        headers: {
          'Content-Type': 'application/vnd.apple.pkpass',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    return NextResponse.json({ error: 'Could not generate pass' }, { status: 500 });

  } catch (error: any) {
    console.error('Wallet API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
