import { NextRequest, NextResponse } from 'next/server';
import { buildTravelDossierData } from '@/modules/travel-dossier/dossier-builder';
import { renderTravelDossierEmailHtml } from '@/modules/travel-dossier/email-renderer';

export async function GET(request: NextRequest) {
  const planId = request.nextUrl.searchParams.get('planId');
  const jsonMode = request.nextUrl.searchParams.get('json') === 'true';
  
  if (!planId) {
    return NextResponse.json({ error: 'planId required' }, { status: 400 });
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const data = await buildTravelDossierData(planId);

    if (jsonMode) {
      // Generate clean sorted attachments list without downloading full PDF binary buffers
      const { getSupabaseAdmin } = await import('@/lib/supabase-admin');
      const supabase = getSupabaseAdmin();
      
      const { data: documents } = await supabase
        .from('travel_documents')
        .select('*')
        .eq('plan_id', planId)
        .eq('visible_to_client', true)
        .is('deleted_at', null);

      const [flightsRes, transfersRes] = await Promise.all([
        supabase.from('travel_flights').select('*').eq('plan_id', planId).is('deleted_at', null),
        supabase.from('travel_transfers').select('*').eq('plan_id', planId).is('deleted_at', null),
      ]);

      const flights = flightsRes.data || [];
      const transfers = transfersRes.data || [];

      const sanitizeName = (str: string) => {
        return str
          .toUpperCase()
          .replace(/[\s\-]+/g, '_')
          .replace(/[^A-Z0-9_]/g, '')
          .replace(/__+/g, '_');
      };

      const mappedDocs = (documents || []).map(doc => {
        let nameTag = 'TRAVEL_DOCUMENT';
        let sortKey = 999;
        const docType = doc.document_type || '';
        const titleUpper = (doc.title || doc.display_title || '').toUpperCase();

        if (docType === 'boarding_pass' || titleUpper.includes('BOARDING') || titleUpper.includes('EMBARQUE')) {
          const flightId = doc.related_flight_id || doc.related_entity_id;
          const flight = flights.find(f => f.id === flightId);
          if (flight) {
            if (flight.type === 'salida' || (flight.departure_location && !flight.departure_location.includes('CDG') && !flight.departure_location.includes('PAR'))) {
              nameTag = 'BOARDING_PASS_IDA';
              sortKey = 10;
            } else {
              nameTag = 'BOARDING_PASS_RETURN';
              sortKey = 90;
            }
          } else {
            nameTag = 'BOARDING_PASS_IDA';
            sortKey = 15;
          }
        } else if (docType === 'transfer_voucher' || titleUpper.includes('TRANSFER') || titleUpper.includes('TRASLADO')) {
          const transferId = doc.related_transfer_id || doc.related_entity_id;
          const transfer = transfers.find(t => t.id === transferId);
          if (transfer) {
            const pickup = sanitizeName(transfer.pickup_location || transfer.pickup_address || '').substring(0, 8);
            const dropoff = sanitizeName(transfer.dropoff_location || transfer.destination_address || '').substring(0, 8);
            if (pickup && dropoff) nameTag = `TRANSFER_${pickup}_${dropoff}`;
            else nameTag = transfer.transfer_type === 'airport_to_hotel' ? 'TRANSFER_CDG_HOTEL' : 'TRANSFER_HOTEL_CDG';
            sortKey = (transfer.transfer_type === 'airport_to_hotel') ? 20 : 80;
          } else {
            nameTag = 'TRANSFER_VOUCHER';
            sortKey = 25;
          }
        } else if (docType === 'hotel_booking' || docType === 'hotel_voucher' || titleUpper.includes('HOTEL')) {
          nameTag = 'HOTEL_VOUCHER';
          sortKey = 30;
        } else if (docType === 'hospitality_voucher' || docType === 'hospitality_event' || titleUpper.includes('HOSPITALITY') || titleUpper.includes('EVENT')) {
          const cleanTitle = sanitizeName(doc.title || doc.display_title || '').replace('DOCUMENTO_', '');
          nameTag = cleanTitle ? `HOSPITALITY_${cleanTitle}` : 'HOSPITALITY_EVENT';
          sortKey = 50;
        } else if (docType === 'restaurant_booking' || titleUpper.includes('RESTAURANT')) {
          nameTag = 'RESTAURANT_BOOKING';
          sortKey = 60;
        } else {
          const cleanTitle = sanitizeName(doc.title || doc.display_title || '').replace('DOCUMENTO_', '');
          nameTag = cleanTitle || 'TRAVEL_DOCUMENT';
          sortKey = 100;
        }

        return { doc, nameTag, sortKey };
      });

      mappedDocs.sort((a, b) => a.sortKey - b.sortKey);
      const attachments = mappedDocs.map((item, i) => {
        const indexStr = String(i + 1).padStart(2, '0');
        return {
          id: item.doc.id,
          index: i,
          title: item.doc.title || item.doc.display_title || item.doc.document_type,
          type: item.doc.document_type,
          filename: `${indexStr}_${item.nameTag}.pdf`
        };
      });

      return NextResponse.json({ dossierData: data, attachments });
    }

    const html = await renderTravelDossierEmailHtml(data, siteUrl);

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
