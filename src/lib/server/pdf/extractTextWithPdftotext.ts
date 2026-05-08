import 'server-only';

/**
 * Extrae el texto de un PDF utilizando la utilidad de sistema 'pdftotext'.
 * Esta herramienta es mucho más robusta y preserva mejor el layout que las librerías de Node.
 */
export async function extractTextWithPdftotext(buffer: Buffer): Promise<string> {
  // Importaciones dinámicas para evitar que el empaquetador del navegador intente procesar módulos de Node
  const { writeFile, readFile, unlink } = await import('node:fs/promises');
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const { tmpName } = await import('tmp-promise');

  const execFileAsync = promisify(execFile);

  const input = await tmpName({ postfix: '.pdf' });
  const output = await tmpName({ postfix: '.txt' });

  console.log('>>> [extractTextWithPdftotext] INICIANDO EXTRACCIÓN <<<');
  try {
    // 1. Guardar el buffer en un archivo temporal
    await writeFile(input, buffer);

    // 2. Ejecutar pdftotext (requiere poppler instalado: brew install poppler)
    // FORZAMOS RUTA ABSOLUTA PARA DEBUG
    const cmd = '/opt/homebrew/bin/pdftotext';
    
    console.log(`[DEBUG] Ejecutando: ${cmd}`);

    const env = { 
      ...process.env, 
      PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin` 
    };

    await execFileAsync(cmd, [
      '-layout',
      '-enc',
      'UTF-8',
      input,
      output,
    ], { env });

    // 3. Leer el resultado
    const text = await readFile(output, 'utf8');
    
    // Limpieza básica
    return text.replace(/\0/g, '').trim();
  } catch (err: any) {
    const debugId = Math.random().toString(36).substring(7);
    console.error(`[extractTextWithPdftotext][${debugId}] Error:`, err);
    return `__ERROR__: [ID:${debugId}] pdftotext no disponible o fallo en ejecución. ${err.message}`;
  } finally {
    // 4. Limpiar archivos temporales
    await unlink(input).catch(() => {});
    await unlink(output).catch(() => {});
  }
}
