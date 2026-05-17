/**
 * Document Intelligence Module
 * 
 * Modular architecture for document classification, parsing and extraction.
 * 
 * Supported document types:
 * - boarding_pass
 * - flight_confirmation
 * - hotel_reservation
 * - transfer_voucher
 * - restaurant_booking
 * - hospitality_event
 */

export { DocumentClassifierService } from './DocumentClassifierService';
export type { DocumentType, ClassificationResult } from './DocumentClassifierService';

export { TransferParserService } from './TransferParserService';
export type { NormalizedTransfer } from './TransferParserService';
