import { extractTextWithPdftotext } from '@/lib/server/pdf/extractTextWithPdftotext';

export class PdfExtractor {
  /**
   * Main entry point to extract text from a PDF buffer.
   * Employs layered fallbacks: pdf-parse -> poppler pdftotext.
   */
  static async extractText(buffer: Buffer): Promise<string> {
    console.log('[PdfExtractor] Initiating text extraction from PDF buffer...');

    // Layer 1: pdf-parse (library extraction)
    try {
      // Dynamic import to prevent bundler compilation errors if not installed
      const pdfParse = require('pdf-parse');
      if (pdfParse) {
        console.log('[PdfExtractor] Attempting extraction with pdf-parse...');
        const parsed = await pdfParse(buffer);
        if (parsed && parsed.text && parsed.text.trim().length > 20) {
          console.log('[PdfExtractor] pdf-parse extraction succeeded.');
          return parsed.text;
        }
      }
    } catch (e: any) {
      console.warn('[PdfExtractor] pdf-parse not available or failed. Falling back...', e.message);
    }

    // Layer 2: poppler / pdftotext (native CLI tool - preserves layout perfectly)
    try {
      console.log('[PdfExtractor] Attempting extraction with pdftotext (Poppler)...');
      const text = await extractTextWithPdftotext(buffer);
      if (text && !text.startsWith('__ERROR__')) {
        console.log('[PdfExtractor] pdftotext extraction succeeded.');
        return text;
      }
      console.warn('[PdfExtractor] pdftotext returned error or empty text:', text);
    } catch (e: any) {
      console.error('[PdfExtractor] pdftotext fallback failed:', e);
    }

    return '';
  }
}
