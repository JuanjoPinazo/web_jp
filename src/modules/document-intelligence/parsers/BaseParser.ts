import { NormalizedTravelEntity } from '../types';

export interface BaseParser {
  /**
   * Parses the raw text extracted from a document into a NormalizedTravelEntity.
   * Optionally receives the original file buffer and mime type for vision fallbacks or barcode decoders.
   */
  parse(rawText: string, fileBuffer?: Buffer, mimeType?: string): Promise<NormalizedTravelEntity | null>;
}
