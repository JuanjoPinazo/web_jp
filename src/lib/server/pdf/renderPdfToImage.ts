import 'server-only';
import { writeFile, unlink, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpName } from 'tmp-promise';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);

/**
 * Renders a PDF buffer to a high-quality PNG image.
 * Uses pdftocairo (Poppler) for high-fidelity rendering.
 */
export async function renderPdfToImage(buffer: Buffer, page: number = 1): Promise<Buffer> {
  const inputPdf = await tmpName({ postfix: '.pdf' });
  const outputBase = await tmpName(); // Base for pdftocairo
  const outputPng = `${outputBase}-1.png`; // pdftocairo appends -1 for the first page in the range

  try {
    // 1. Save buffer to temporary file
    await writeFile(inputPdf, buffer);

    // 2. Render PDF page to PNG using pdftocairo
    // We use a high resolution (300 DPI) for clarity on mobile
    const cmd = '/opt/homebrew/bin/pdftocairo';
    const env = { 
      ...process.env, 
      PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin` 
    };

    await execFileAsync(cmd, [
      '-png',
      '-f', String(page),
      '-l', String(page),
      '-r', '300', // 300 DPI is enough for visual preview
      inputPdf,
      outputBase
    ], { env });

    // 3. Optional: Process with Sharp (e.g., to ensure standard orientation or compression)
    const imageBuffer = await readFile(outputPng);
    const optimizedImage = await sharp(imageBuffer)
      .png({ quality: 90 })
      .toBuffer();

    return optimizedImage;
  } catch (err: any) {
    console.error('[renderPdfToImage] Error:', err);
    throw new Error(`Failed to render PDF: ${err.message}`);
  } finally {
    // Cleanup
    await unlink(inputPdf).catch(() => {});
    await unlink(outputPng).catch(() => {});
    await unlink(outputBase).catch(() => {});
  }
}
