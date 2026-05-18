import { getSupabaseAdmin } from '@/lib/supabase-admin';

export interface DossierAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export async function getTravelDossierAttachments(planId: string): Promise<DossierAttachment[]> {
  const supabase = getSupabaseAdmin();

  // 1. Fetch visible travel documents
  const { data: documents, error: docsError } = await supabase
    .from('travel_documents')
    .select('*')
    .eq('plan_id', planId)
    .eq('visible_to_client', true)
    .is('deleted_at', null);

  if (docsError) {
    console.error(`[AttachmentEngine] Error fetching documents: ${docsError.message}`);
    return [];
  }

  if (!documents || documents.length === 0) {
    return [];
  }

  // 2. Fetch flights, transfers, and hotels to check linkages for smart renaming
  const [flightsRes, transfersRes, hotelsRes] = await Promise.all([
    supabase.from('travel_flights').select('*').eq('plan_id', planId).is('deleted_at', null),
    supabase.from('travel_transfers').select('*').eq('plan_id', planId).is('deleted_at', null),
    supabase.from('hotel_stays').select('*').eq('plan_id', planId).is('deleted_at', null),
  ]);

  const flights = flightsRes.data || [];
  const transfers = transfersRes.data || [];
  const hotels = hotelsRes.data || [];

  // Helper function to sanitize names
  const sanitizeName = (str: string) => {
    return str
      .toUpperCase()
      .replace(/[\s\-]+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .replace(/__+/g, '_');
  };

  // 3. Map documents to structured, sortable details with custom names
  const mappedDocs = documents.map(doc => {
    let nameTag = 'TRAVEL_DOCUMENT';
    let sortKey = 999; // fallback sort key

    const docType = doc.document_type || '';
    const titleUpper = (doc.title || doc.display_title || '').toUpperCase();

    // Boarding Pass Smart Rename
    if (docType === 'boarding_pass' || titleUpper.includes('BOARDING') || titleUpper.includes('EMBARQUE') || titleUpper.includes('TICKET')) {
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
        // Fallback check based on flight numbers or title
        if (titleUpper.includes('IDA') || titleUpper.includes('OUTWARD') || titleUpper.includes('VALENCIA')) {
          nameTag = 'BOARDING_PASS_IDA';
          sortKey = 10;
        } else if (titleUpper.includes('VUELTA') || titleUpper.includes('RETURN') || titleUpper.includes('PARIS') || titleUpper.includes('CDG')) {
          nameTag = 'BOARDING_PASS_RETURN';
          sortKey = 90;
        } else {
          nameTag = 'BOARDING_PASS_IDA';
          sortKey = 15;
        }
      }
    }
    // Transfer Voucher Smart Rename
    else if (docType === 'transfer_voucher' || titleUpper.includes('TRANSFER') || titleUpper.includes('TRASLADO') || titleUpper.includes('VOUCHER_TRANSFER')) {
      const transferId = doc.related_transfer_id || doc.related_entity_id;
      const transfer = transfers.find(t => t.id === transferId);

      if (transfer) {
        const pickup = sanitizeName(transfer.pickup_location || transfer.pickup_address || '').substring(0, 8);
        const dropoff = sanitizeName(transfer.dropoff_location || transfer.destination_address || '').substring(0, 8);
        
        if (pickup && dropoff) {
          nameTag = `TRANSFER_${pickup}_${dropoff}`;
        } else {
          nameTag = transfer.transfer_type === 'airport_to_hotel' ? 'TRANSFER_CDG_HOTEL' : 'TRANSFER_HOTEL_CDG';
        }
        sortKey = (transfer.transfer_type === 'airport_to_hotel') ? 20 : 80;
      } else {
        if (titleUpper.includes('IDA') || titleUpper.includes('OUTWARD')) {
          nameTag = 'TRANSFER_CDG_HOTEL';
          sortKey = 20;
        } else if (titleUpper.includes('VUELTA') || titleUpper.includes('RETURN')) {
          nameTag = 'TRANSFER_HOTEL_CDG';
          sortKey = 80;
        } else {
          nameTag = 'TRANSFER_VOUCHER';
          sortKey = 25;
        }
      }
    }
    // Hotel Stay Smart Rename
    else if (docType === 'hotel_booking' || docType === 'hotel_voucher' || titleUpper.includes('HOTEL') || titleUpper.includes('ALOJAMIENTO') || titleUpper.includes('VOUCHER_HOTEL')) {
      nameTag = 'HOTEL_VOUCHER';
      sortKey = 30;
    }
    // Hospitality Event Smart Rename
    else if (docType === 'hospitality_voucher' || docType === 'hospitality_event' || titleUpper.includes('HOSPITALITY') || titleUpper.includes('EVENT') || titleUpper.includes('DINNER') || titleUpper.includes('CENA')) {
      const cleanTitle = sanitizeName(doc.title || doc.display_title || '').replace('DOCUMENTO_', '');
      nameTag = cleanTitle ? `HOSPITALITY_${cleanTitle}` : 'HOSPITALITY_EVENT';
      sortKey = 50;
    }
    // Restaurant Booking Smart Rename
    else if (docType === 'restaurant_booking' || titleUpper.includes('RESTAURANT') || titleUpper.includes('RESTAURANTE') || titleUpper.includes('MESA') || titleUpper.includes('RESERVA')) {
      nameTag = 'RESTAURANT_BOOKING';
      sortKey = 60;
    }
    // General fallback
    else {
      const cleanTitle = sanitizeName(doc.title || doc.display_title || '').replace('DOCUMENTO_', '');
      nameTag = cleanTitle || 'TRAVEL_DOCUMENT';
      sortKey = 100;
    }

    return {
      doc,
      nameTag,
      sortKey
    };
  });

  // 4. Sort mapped documents by their professional hierarchy/chronology
  mappedDocs.sort((a, b) => a.sortKey - b.sortKey);

  // 5. Download document buffers and assign professional filenames
  const attachments: DossierAttachment[] = [];

  for (let i = 0; i < mappedDocs.length; i++) {
    const item = mappedDocs[i];
    const indexStr = String(i + 1).padStart(2, '0');
    
    // Systematic professional filename
    const filename = `${indexStr}_${item.nameTag}.pdf`;

    try {
      console.log(`[AttachmentEngine] Downloading: ${item.doc.file_url}`);
      
      const response = await fetch(item.doc.file_url);
      if (!response.ok) {
        throw new Error(`HTTP error downloading file: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const content = Buffer.from(arrayBuffer);

      attachments.push({
        filename,
        content,
        contentType: 'application/pdf'
      });
      console.log(`[AttachmentEngine] Successfully prepared attachment: ${filename} (${content.length} bytes)`);
    } catch (err: any) {
      console.error(`[AttachmentEngine] Failed to download document "${item.doc.title}" from url: ${item.doc.file_url}`, err);
    }
  }

  return attachments;
}
