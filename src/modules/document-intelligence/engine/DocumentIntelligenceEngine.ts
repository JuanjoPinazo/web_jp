import { PdfExtractor } from '../extractors/PdfExtractor';
import { ImageOcrExtractor } from '../extractors/ImageOcrExtractor';
import { DocumentClassifierService } from '../classifiers/DocumentClassifierService';
import { DocumentNormalizer } from '../normalizers/DocumentNormalizer';
import { TimelineGenerator } from '../timeline/TimelineGenerator';
import { 
  AirFranceParser, 
  VuelingParser, 
  SunTransfersParser, 
  HotelVoucherParser, 
  HospitalityParser 
} from '../parsers';
import { 
  NormalizedTravelEntity, 
  TravelTimelineEvent, 
  ClassificationResult,
  DocumentType
} from '../types';
import { supabase } from '@/lib/supabase';

export interface ProcessedDocumentResult {
  rawText: string;
  classification: ClassificationResult;
  entity: NormalizedTravelEntity | null;
  timelineEvents: TravelTimelineEvent[];
}

export class DocumentIntelligenceEngine {
  /**
   * Primary entrypoint: Runs the full global Document Intelligence Engine pipeline.
   */
  static async processDocument(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    options?: {
      planId?: string;
      forcedType?: string; // e.g. 'boarding_pass', 'hotel'
      forcedProvider?: string; // e.g. 'Air France', 'Vueling'
    }
  ): Promise<ProcessedDocumentResult> {
    console.log(`\n--- [DocumentIntelligenceEngine] Starting Processing: ${fileName} ---`);
    const planId = options?.planId;
    const forcedType = options?.forcedType;
    const forcedProvider = options?.forcedProvider;

    // 1. Mime Detection & Text Extraction (PDF vs Image)
    const isImage = mimeType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|webp)$/i);
    let rawText = '';

    if (isImage) {
      console.log('[DocumentIntelligenceEngine] Input routed to: Image OCR Extractor');
      rawText = await ImageOcrExtractor.extractText(fileBuffer, mimeType);
    } else {
      console.log('[DocumentIntelligenceEngine] Input routed to: PDF Extractor');
      rawText = await PdfExtractor.extractText(fileBuffer);
    }

    console.log(`[DocumentIntelligenceEngine] Extracted text length: ${rawText?.length || 0} characters.`);

    // 2. Document Classification
    let classification = DocumentClassifierService.classifyText(rawText);
    if (forcedType && forcedType !== 'auto') {
      classification.type = forcedType as DocumentType;
    }
    if (forcedProvider && forcedProvider !== 'auto') {
      classification.provider = forcedProvider;
    }

    console.log(`[DocumentIntelligenceEngine] Classification Result: Type = ${classification.type}, Provider = ${classification.provider}, Confidence = ${classification.confidence}%`);

    // Clean any logistics noise
    const cleanedText = DocumentNormalizer.cleanNoise(rawText);

    // 3. Parser Dispatch
    let entity: NormalizedTravelEntity | null = null;

    try {
      // Choose parser based on classification
      if (classification.type === 'boarding_pass' || classification.type === 'flight_confirmation') {
        const provUpper = classification.provider.toUpperCase();
        if (provUpper.includes('AIR FRANCE') || provUpper.includes('AIRFRANCE')) {
          console.log('[DocumentIntelligenceEngine] Dispatching to: AirFranceParser');
          entity = await new AirFranceParser().parse(cleanedText, fileBuffer, mimeType);
        } else if (provUpper.includes('VUELING')) {
          console.log('[DocumentIntelligenceEngine] Dispatching to: VuelingParser');
          entity = await new VuelingParser().parse(cleanedText, fileBuffer, mimeType);
        } else {
          // Flight fallback: try both parsers
          console.log('[DocumentIntelligenceEngine] Unknown airline. Trying all Flight Parsers sequentially...');
          entity = await new AirFranceParser().parse(cleanedText, fileBuffer, mimeType);
          if (!entity) {
            entity = await new VuelingParser().parse(cleanedText, fileBuffer, mimeType);
          }
        }
      } else if (classification.type === 'transfer_voucher') {
        console.log('[DocumentIntelligenceEngine] Dispatching to: SunTransfersParser');
        entity = await new SunTransfersParser().parse(cleanedText, fileBuffer, mimeType);
      } else if (classification.type === 'hotel_reservation') {
        console.log('[DocumentIntelligenceEngine] Dispatching to: HotelVoucherParser');
        entity = await new HotelVoucherParser().parse(cleanedText, fileBuffer, mimeType);
      } else if (classification.type === 'restaurant_booking' || classification.type === 'hospitality_event') {
        console.log('[DocumentIntelligenceEngine] Dispatching to: HospitalityParser');
        entity = await new HospitalityParser().parse(cleanedText, fileBuffer, mimeType);
      } else {
        // Unknown classification: progressive parser sweep
        console.log('[DocumentIntelligenceEngine] Unknown category. Performing progressive parser sweep...');
        const parsers = [
          new AirFranceParser(),
          new VuelingParser(),
          new SunTransfersParser(),
          new HotelVoucherParser(),
          new HospitalityParser()
        ];

        for (const parser of parsers) {
          try {
            entity = await parser.parse(cleanedText, fileBuffer, mimeType);
            if (entity) {
              console.log(`[DocumentIntelligenceEngine] Sweeper matched successfully with parser: ${parser.constructor.name}`);
              break;
            }
          } catch (err) {
            // Keep going
          }
        }
      }
    } catch (parserError: any) {
      console.error('[DocumentIntelligenceEngine] Critical parser crash:', parserError.message);
    }

    // 4. Normalization
    if (entity) {
      entity = DocumentNormalizer.normalizeEntity(entity);
      console.log('[DocumentIntelligenceEngine] Normalization completed.');
    } else {
      console.warn('[DocumentIntelligenceEngine] No structured entity could be parsed from raw text.');
    }

    // 5. Timeline Events Generation
    let timelineEvents: TravelTimelineEvent[] = [];
    if (entity) {
      timelineEvents = TimelineGenerator.generateEvents(entity, undefined, undefined);
      console.log(`[DocumentIntelligenceEngine] Generated ${timelineEvents.length} timeline events.`);
    }

    return {
      rawText,
      classification,
      entity,
      timelineEvents
    };
  }

  /**
   * Persists both the document and the parsed entity inside the corresponding Supabase logistical tables automatically.
   * This is what turns JP Intelligence into a fully automated logistical engine.
   */
  static async saveAndProvision(
    planId: string,
    fileUrl: string,
    fileName: string,
    result: ProcessedDocumentResult,
    userId?: string
  ): Promise<any> {
    console.log(`[DocumentIntelligenceEngine] Saving and provisioning database items for Plan: ${planId}...`);
    const { entity, rawText, classification } = result;

    if (!entity) {
      throw new Error('No se puede aprovisionar la base de datos sin una entidad normalizada parsed.');
    }

    // A. 1. Assemble Travel Document Payload
    // Save metadata, raw OCR text, confidence, and normalized payload inside the 'notes' or 'description' fields to satisfy requirement #8
    const notesJson = {
      pdf_original: !fileUrl.endsWith('.pdf') ? null : fileUrl,
      image_original: fileUrl.endsWith('.pdf') ? null : fileUrl,
      raw_ocr_text: rawText,
      normalized_payload: entity,
      parsed_confidence: entity.confidence || classification.confidence,
      classification: classification
    };

    let mappedDocType = 'document';
    if (entity.type === 'boarding_pass') mappedDocType = 'boarding_pass';
    else if (entity.type === 'flight_confirmation') mappedDocType = 'flight_confirmation';
    else if (entity.type === 'hotel_reservation') mappedDocType = 'hotel_booking';
    else if (entity.type === 'transfer_voucher') mappedDocType = 'transfer_voucher';
    else if (entity.type === 'restaurant_booking') mappedDocType = 'restaurant_booking';
    else if (entity.type === 'hospitality_event') mappedDocType = 'hospitality_event';

    const documentPayload: any = {
      plan_id: planId,
      document_type: mappedDocType,
      title: fileName || `${entity.type.replace('_', ' ').toUpperCase()} - ${entity.provider}`,
      file_url: fileUrl,
      passenger_name: entity.passenger_name || '',
      booking_reference: entity.booking_reference || entity.hotel?.confirmation_number || '',
      visible_to_client: true,
      status: 'active',
      source: 'document_intelligence_engine',
      notes: JSON.stringify(notesJson)
    };

    // Populate barcode columns if flight/boarding pass QR was decoded
    if (entity.flight) {
      if (entity.flight.qr_raw_payload) {
        documentPayload.qr_raw_payload = entity.flight.qr_raw_payload;
      }
      if (entity.flight.qr_raw_payload || entity.flight.qr_code) {
        documentPayload.qr_code = entity.flight.qr_raw_payload || entity.flight.qr_code;
      }
      if (entity.flight.seat) {
        documentPayload.seat_assignment = entity.flight.seat;
      }
      if (entity.flight.cabin_class) {
        documentPayload.boarding_group = entity.flight.cabin_class;
      }
    }

    // Save the document first
    const { data: savedDoc, error: docError } = await supabase
      .from('travel_documents')
      .insert(documentPayload)
      .select()
      .single();

    if (docError) {
      console.error('[DocumentIntelligenceEngine] Error inserting travel_documents:', docError);
      throw docError;
    }

    console.log(`[DocumentIntelligenceEngine] Saved travel_documents record: ${savedDoc.id}`);

    // B. 2. Provision Logistical Table
    let provisionedId = '';
    let provisionedTable = '';

    // FLIGHTS PROVISIONING
    if ((entity.type === 'boarding_pass' || entity.type === 'flight_confirmation') && entity.flight) {
      const f = entity.flight;
      provisionedTable = 'travel_flights';
      
      const flightPayload = {
        plan_id: planId,
        flight_number: f.flight_number,
        departure_location: f.departure_location,
        arrival_location: f.arrival_location,
        departure_time: f.departure_time,
        arrival_time: f.arrival_time,
        airline: f.airline,
        seat: f.seat,
        cabin_class: f.cabin_class,
        checkin_deadline: f.checkin_deadline,
        baggage_info: f.baggage_info,
        status: f.status || 'OK',
        booking_reference: entity.booking_reference,
        reservation_code: entity.booking_reference,
        passengers: entity.passenger_name || '',
        is_verified: true,
        source: 'document_intelligence_engine'
      };

      const { data: dbFlight, error: flightError } = await supabase
        .from('travel_flights')
        .insert(flightPayload)
        .select('id')
        .single();

      if (flightError) {
        console.error('[DocumentIntelligenceEngine] Error provisioning travel_flights:', flightError);
      } else {
        provisionedId = dbFlight.id;
        console.log(`[DocumentIntelligenceEngine] Automatically provisioned travel_flights record: ${dbFlight.id}`);
        
        // Link document back to flight
        await supabase.from('travel_documents').update({ 
          related_entity: 'flight', 
          related_entity_id: dbFlight.id, 
          related_flight_id: dbFlight.id 
        }).eq('id', savedDoc.id);
      }
    }

    // HOTELS PROVISIONING
    if (entity.type === 'hotel_reservation' && entity.hotel) {
      const h = entity.hotel;
      provisionedTable = 'hotel_stays';

      const hotelPayload = {
        plan_id: planId,
        hotel_name: h.hotel_name,
        address: h.address,
        check_in: h.check_in,
        check_out: h.check_out,
        booking_reference: h.confirmation_number || entity.booking_reference || '',
        room_type: h.room_type || 'Estancia confirmada',
        guest_name: entity.passenger_name || 'Huésped',
        status: 'confirmed',
        source: 'document_intelligence_engine',
        document_id: savedDoc.id
      };

      const { data: dbHotel, error: hotelError } = await supabase
        .from('hotel_stays')
        .insert(hotelPayload)
        .select('id')
        .single();

      if (hotelError) {
        console.error('[DocumentIntelligenceEngine] Error provisioning hotel_stays:', hotelError);
      } else {
        provisionedId = dbHotel.id;
        console.log(`[DocumentIntelligenceEngine] Automatically provisioned hotel_stays record: ${dbHotel.id}`);

        // Link document back to hotel stay
        await supabase.from('travel_documents').update({ 
          related_entity: 'hotel', 
          related_entity_id: dbHotel.id, 
          related_hotel_stay_id: dbHotel.id 
        }).eq('id', savedDoc.id);
      }
    }

    // TRANSFERS PROVISIONING
    if (entity.type === 'transfer_voucher' && entity.transfer) {
      const t = entity.transfer;
      provisionedTable = 'travel_transfers';

      // Infer structured type from pickup/destination types
      let inferredType = 'airport_to_hotel';
      const pType = (t.pickup_type || '').toLowerCase();
      const dType = (t.destination_type || '').toLowerCase();
      if (pType === 'airport' && dType === 'hotel') inferredType = 'airport_to_hotel';
      else if (pType === 'hotel' && dType === 'airport') inferredType = 'hotel_to_airport';
      else if (pType === 'airport' && dType === 'venue') inferredType = 'airport_to_venue';
      else if (pType === 'venue' && dType === 'airport') inferredType = 'venue_to_airport';
      else if (pType === 'hotel' && dType === 'restaurant') inferredType = 'hotel_to_restaurant';
      else if (pType === 'restaurant' && dType === 'hotel') inferredType = 'restaurant_to_hotel';
      else if (pType === 'hotel' && dType === 'venue') inferredType = 'hotel_to_venue';
      else if (pType === 'venue' && dType === 'hotel') inferredType = 'venue_to_hotel';
      else if (pType === 'airport') inferredType = 'airport_to_hotel';
      else if (dType === 'airport') inferredType = 'hotel_to_airport';

      const flightArrivalTime = (() => {
        const fa = t.flight_linkage?.arrival_time;
        if (!fa) return null;
        if (/^\d{4}-\d{2}-\d{2}T/.test(fa)) return fa;
        if (/^\d{2}:\d{2}/.test(fa) && t.pickup_datetime) {
          return t.pickup_datetime.split('T')[0] + 'T' + (fa.length === 5 ? fa + ':00' : fa);
        }
        return fa;
      })();

      const transferPayload = {
        plan_id: planId,
        type: inferredType,
        transfer_type: inferredType,
        pickup_datetime: t.pickup_datetime,
        pickup_location: t.pickup_address,
        pickup_address: t.pickup_address,
        pickup_airport_code: t.pickup_airport_code || null,
        destination_type: t.destination_type,
        destination_address: t.destination_address,
        dropoff_location: t.destination_address,
        destination_name: t.destination_name || null,
        passenger_name: entity.passenger_name || 'Pasajero',
        vehicle_type: t.vehicle_type,
        provider: t.provider,
        company_name: t.provider,
        booking_reference: entity.booking_reference || '',
        meeting_point: t.meeting_point,
        support_phone: t.support_phone,
        support_whatsapp: t.support_whatsapp,
        whatsapp_available: !!t.support_whatsapp,
        airline: t.flight_linkage?.airline || null,
        flight_number: t.flight_linkage?.flight_number || null,
        flight_arrival_time: flightArrivalTime,
        passengers: t.passengers,
        luggage: t.luggage ? String(t.luggage) : null,
        raw_payload: t,
        parsed_confidence: entity.confidence || classification.confidence,
        status: 'confirmed',
        visible_to_client: true,
        source: 'document_intelligence_engine'
      };

      const { data: dbTransfer, error: transferError } = await supabase
        .from('travel_transfers')
        .insert(transferPayload)
        .select('id')
        .single();

      if (transferError) {
        console.error('[DocumentIntelligenceEngine] Error provisioning travel_transfers:', transferError);
      } else {
        provisionedId = dbTransfer.id;
        console.log(`[DocumentIntelligenceEngine] Automatically provisioned travel_transfers record: ${dbTransfer.id}`);

        // Link document back to transfer
        await supabase.from('travel_documents').update({ 
          related_entity: 'transfer', 
          related_entity_id: dbTransfer.id, 
          related_transfer_id: dbTransfer.id 
        }).eq('id', savedDoc.id);
      }
    }

    // RESTAURANTS PROVISIONING
    if (entity.type === 'restaurant_booking' && entity.restaurant) {
      const r = entity.restaurant;
      provisionedTable = 'travel_restaurants';

      const restaurantPayload = {
        plan_id: planId,
        restaurant_name: r.restaurant_name,
        reservation_time: r.reservation_time,
        reservation_name: r.reservation_name || 'Comensal',
        notes: r.notes || '',
        status: 'reserved',
        source: 'document_intelligence_engine'
      };

      const { data: dbRest, error: restError } = await supabase
        .from('travel_restaurants')
        .insert(restaurantPayload)
        .select('id')
        .single();

      if (restError) {
        console.error('[DocumentIntelligenceEngine] Error provisioning travel_restaurants:', restError);
      } else {
        provisionedId = dbRest.id;
        console.log(`[DocumentIntelligenceEngine] Automatically provisioned travel_restaurants record: ${dbRest.id}`);

        // Link document back to restaurant
        await supabase.from('travel_documents').update({ 
          related_entity: 'restaurant', 
          related_entity_id: dbRest.id 
        }).eq('id', savedDoc.id);
      }
    }

    // EVENTS PROVISIONING
    if (entity.type === 'hospitality_event' && entity.event) {
      const ev = entity.event;
      provisionedTable = 'hospitality_events';

      const eventPayload = {
        plan_id: planId,
        title: ev.title,
        description: ev.description || '',
        start_datetime: ev.start_datetime,
        end_datetime: ev.end_datetime,
        venue_name: ev.venue_name,
        venue_address: ev.venue_address || '',
        contact_phone: ev.contact_phone || '',
        type: ev.is_agenda ? 'meeting' : 'party',
        visible_to_client: true,
        status: 'confirmed',
        source: 'document_intelligence_engine'
      };

      const { data: dbEvent, error: eventError } = await supabase
        .from('hospitality_events')
        .insert(eventPayload)
        .select('id')
        .single();

      if (eventError) {
        console.error('[DocumentIntelligenceEngine] Error provisioning hospitality_events:', eventError);
      } else {
        provisionedId = dbEvent.id;
        console.log(`[DocumentIntelligenceEngine] Automatically provisioned hospitality_events record: ${dbEvent.id}`);

        // Link document back to event
        await supabase.from('travel_documents').update({ 
          related_entity: ev.is_agenda ? 'agenda' : 'hospitality', 
          related_entity_id: dbEvent.id 
        }).eq('id', savedDoc.id);
      }
    }

    console.log('[DocumentIntelligenceEngine] MediCRM synchronization is queued and managed client-side.');

    return {
      document: savedDoc,
      provisionedId,
      provisionedTable
    };
  }
}
