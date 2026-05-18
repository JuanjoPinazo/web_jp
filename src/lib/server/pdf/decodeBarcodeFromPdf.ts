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
  const outputBase = await tmpName(); // Base para pdftocairo

  const filesToCleanup = new Set<string>([inputPdf]);

  try {
    // 1. Guardar PDF temporal
    await writeFile(inputPdf, buffer);

    // 2. Obtener número de páginas usando pdf-parse
    let numPages = 1;
    try {
      const pdfParseImport = (await import('pdf-parse') as any);
      const pdfParse = typeof pdfParseImport === 'function' ? pdfParseImport : (pdfParseImport.default || pdfParseImport);
      const pdfData = await pdfParse(buffer);
      numPages = pdfData.numpages || 1;
      console.log(`[QR/Barcode] El PDF tiene ${numPages} página(s).`);
    } catch (parseErr) {
      console.warn('[QR/Barcode] No se pudo analizar el total de páginas, por defecto 1.', parseErr);
    }

    // 3. Determinar comando pdftocairo
    let cmd = 'pdftocairo';
    
    if (process.platform === 'darwin') {
      const fs = await import('node:fs');
      if (fs.existsSync('/opt/homebrew/bin/pdftocairo')) {
        cmd = '/opt/homebrew/bin/pdftocairo';
      } else if (fs.existsSync('/usr/local/bin/pdftocairo')) {
        cmd = '/usr/local/bin/pdftocairo';
      }
    }

    const env = { 
      ...process.env, 
      PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin` 
    };

    // 4. Escanear páginas de manera progresiva
    const pagesToScan = Math.min(numPages, 5);
    for (let page = 1; page <= pagesToScan; page++) {
      console.log(`[QR/Barcode] Intentando escanear página ${page}/${pagesToScan}...`);
      const outputPng = `${outputBase}-${page}.png`;
      filesToCleanup.add(outputPng);

      try {
        await execFileAsync(cmd, [
          '-png',
          '-f', String(page),
          '-l', String(page),
          '-r', '600',
          inputPdf,
          outputBase
        ], { env });

        // 5. Procesar imagen con Sharp para optimizar lectura
        const imageBuffer = await readFile(outputPng);
        const processedImage = await sharp(imageBuffer)
          .grayscale()
          .sharpen()
          .normalize()
          .toBuffer();

        // 6. Decodificar usando zxing-wasm
        let barcodes = await readBarcodes(processedImage, {
          formats: ['PDF417', 'QRCode', 'Aztec', 'DataMatrix'],
          tryHarder: true,
          tryRotate: true
        });

        // Si no se detectó nada, probamos a rotar la imagen por si el código está en vertical
        if (!barcodes || barcodes.length === 0) {
          console.log(`[QR/Barcode] No se detectó código en página ${page} en orientación original. Probando rotaciones...`);
          const rotations = [90, 180, 270];
          for (const angle of rotations) {
            try {
              const rotatedBuffer = await sharp(processedImage)
                .rotate(angle)
                .toBuffer();
              
              const rotatedBarcodes = await readBarcodes(rotatedBuffer, {
                formats: ['PDF417', 'QRCode', 'Aztec', 'DataMatrix'],
                tryHarder: true,
                tryRotate: true
              });

              if (rotatedBarcodes && rotatedBarcodes.length > 0) {
                barcodes = rotatedBarcodes;
                console.log(`[QR/Barcode] ¡ÉXITO! Código detectado en página ${page} tras rotar ${angle} grados.`);
                break;
              }
            } catch (rotErr) {
              console.error(`[QR/Barcode] Error en rotación de ${angle} grados en página ${page}:`, rotErr);
            }
          }
        }

        if (barcodes && barcodes.length > 0) {
          const bestMatch = barcodes[0];
          console.log(`[QR/Barcode] ¡Encontrado! Formato: ${bestMatch.format} - Comienzo: ${bestMatch.text.substring(0, 20)}...`);
          return {
            success: true,
            payload: bestMatch.text,
            format: bestMatch.format
          };
        }
      } catch (pageErr: any) {
        console.error(`[QR/Barcode] Error procesando página ${page}:`, pageErr.message);
      }
    }

    return { success: false, payload: null, format: null };
  } catch (err: any) {
    console.error('[decodeBarcodeFromPdf] Error crítico:', err);
    return { success: false, payload: null, format: null, error: err.message };
  } finally {
    // Limpieza de todos los archivos temporales generados
    for (const file of filesToCleanup) {
      await unlink(file).catch(() => {});
    }
    await unlink(outputBase).catch(() => {});
  }
}
