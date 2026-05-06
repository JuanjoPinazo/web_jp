import 'server-only';

/**
 * Intenta decodificar un código de barras (PDF417, QR, Aztec, etc.) de la primera página de un PDF.
 * Utiliza pdftocairo para renderizar el PDF y zxing-wasm para la decodificación.
 */
export async function decodeBarcodeFromPdf(buffer: Buffer): Promise<{ 
  success: boolean; 
  payload: string | null; 
  format: string | null;
  error?: string;
}> {
  const { writeFile, unlink, readFile } = await import('node:fs/promises');
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const { tmpName } = await import('tmp-promise');
  const { readBarcodes } = await import('zxing-wasm/reader');
  const sharp = (await import('sharp')).default;

  const execFileAsync = promisify(execFile);

  const inputPdf = await tmpName({ postfix: '.pdf' });
  const outputBase = await tmpName(); // Base para pdftocairo (añadirá -1.png)
  const outputPng = `${outputBase}-1.png`;

  try {
    // 1. Guardar PDF temporal
    await writeFile(inputPdf, buffer);

    // 2. Convertir primera página a imagen (PNG) usando pdftocairo (Poppler)
    // -r 600: Muy alta resolución para códigos complejos (PDF417/Aztec)
    await execFileAsync('pdftocairo', [
      '-png',
      '-f', '1',
      '-l', '1',
      '-r', '600',
      inputPdf,
      outputBase
    ]);

    // 3. Procesar imagen con Sharp para optimizar lectura
    // Grayscale, Sharpen y Contrast Boost (normalize) ayudan a zxing
    const imageBuffer = await readFile(outputPng);
    const processedImage = await sharp(imageBuffer)
      .grayscale()
      .sharpen()
      .normalize() // Mejora el contraste
      .toBuffer();

    // 4. Decodificar usando zxing-wasm
    // Las tarjetas de embarque suelen usar PDF417 o Aztec
    const barcodes = await readBarcodes(processedImage, {
      formats: ['PDF417', 'QRCode', 'Aztec', 'DataMatrix'],
      tryHarder: true,
      tryRotate: true
    });

    if (barcodes && barcodes.length > 0) {
      const bestMatch = barcodes[0];
      console.log(`[QR/Barcode] Detectado: ${bestMatch.format} - Payload: ${bestMatch.text.substring(0, 20)}...`);
      return {
        success: true,
        payload: bestMatch.text,
        format: bestMatch.format
      };
    }

    return { success: false, payload: null, format: null };
  } catch (err: any) {
    console.error('[decodeBarcodeFromPdf] Error:', err);
    return { success: false, payload: null, format: null, error: err.message };
  } finally {
    // Limpieza
    await unlink(inputPdf).catch(() => {});
    await unlink(outputPng).catch(() => {});
    await unlink(outputBase).catch(() => {});
  }
}
