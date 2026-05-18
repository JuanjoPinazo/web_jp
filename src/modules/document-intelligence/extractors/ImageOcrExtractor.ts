export class ImageOcrExtractor {
  /**
   * Main entry point to extract text from a file buffer (image/rendered PDF).
   */
  static async extractText(fileBuffer: Buffer, mimeType?: string): Promise<string> {
    console.log('[ImageOcrExtractor] Starting Image OCR process...');

    // 1. Layer 1: OpenAI Vision OCR (State-of-the-art OCR)
    try {
      if (process.env.OPENAI_API_KEY) {
        console.log('[ImageOcrExtractor] Attempting OCR Vision using OpenAI...');
        let base64Image = '';

        if (mimeType && mimeType.startsWith('image/')) {
          base64Image = fileBuffer.toString('base64');
        } else {
          // Render the first page of PDF to image
          const { renderPdfToImage } = await import('@/lib/server/pdf/renderPdfToImage');
          const imageBuffer = await renderPdfToImage(fileBuffer, 1);
          base64Image = imageBuffer.toString('base64');
        }

        const { default: OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const prompt = `
Extrae todo el texto legible de la siguiente imagen de documento de viaje de forma literal, precisa y completa. 
Preserva los códigos de barras, números de vuelo, fechas, asientos, localizadores y nombres de pasajero.
No interpretes, no resumas, no devuelvas formato markdown ni comentarios. Limítate a devolver el texto plano extraído.
`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          temperature: 0.0
        });

        const extractedText = response.choices[0]?.message?.content;
        if (extractedText && extractedText.trim().length > 10) {
          console.log('[ImageOcrExtractor] OpenAI Vision OCR succeeded.');
          return extractedText.trim();
        }
      }
    } catch (e: any) {
      console.warn('[ImageOcrExtractor] OpenAI Vision OCR failed. Falling back...', e.message);
    }

    // 2. Layer 2: Tesseract OCR Fallback
    try {
      console.log('[ImageOcrExtractor] Attempting Tesseract OCR fallback...');
      const { createWorker } = require('tesseract.js');
      if (createWorker) {
        const worker = await createWorker('spa+eng');
        const { data: { text } } = await worker.recognize(fileBuffer);
        await worker.terminate();

        if (text && text.trim().length > 5) {
          console.log('[ImageOcrExtractor] Tesseract OCR succeeded.');
          return text.trim();
        }
      }
    } catch (e: any) {
      console.error('[ImageOcrExtractor] Tesseract OCR fallback failed:', e.message);
    }

    return '';
  }
}
