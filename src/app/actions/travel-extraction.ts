'use server';

import { PDFParse } from 'pdf-parse';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import path from 'path';
import { parseVuelingBoardingPass } from '@/lib/vueling-parser';

export interface ExtractedData {
  type: 'hotel' | 'flight' | 'transfer' | 'document' | 'boarding_pass';
  data: any;
  confidence: number;
  rawText: string;
}

const PROVIDERS = {
  VUELING: { name: 'Vueling', flightPrefix: /^VY\d{4}$/, keywords: ['vueling', 'vy816', 'vy817', 'vy81'] },
  AIR_FRANCE: { name: 'Air France', flightPrefix: /^AF\d{4}$/, keywords: ['air france', 'airfrance', 'hop!'] },
  IBERIA: { name: 'Iberia', flightPrefix: /^IB\d{4}$/, keywords: ['iberia', 'air nostrum', 'nostrum'] },
  VOLOTEA: { name: 'Volotea', flightPrefix: /^V7\s?\d{4}$/, keywords: ['volotea'] },
  BOOKING: { name: 'Booking.com', keywords: ['booking.com'] },
  HOTELS: { name: 'Hotels.com', keywords: ['hotels.com', 'expedia'] }
};

function detectProvider(text: string): string {
  const t = text.toLowerCase();
  for (const [key, p] of Object.entries(PROVIDERS)) {
    if (p.keywords.some(k => t.includes(k))) return key;
  }
  return 'GENERIC';
}

function cleanLogisticsNoise(text: string): string {
  // Noise removal BEFORE extraction
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '') // Emails
    .replace(/(?:De|From|Para|To|CC|Asunto|Subject|Enviado el|Sent|Date|Fecha):\s*[^\n\r]+/gi, '') // Outlook headers
    .replace(/(?:Visa|Mastercard|Amex|Pago|Total|EUR|Price|Precio|XXXXXXXXXXXX)\s*[^\n\r]+/gi, '') // Payment info
    .replace(/(?:Aviso legal|Condiciones|T\u00e9rminos|Privacy|Pol\u00edtica|Derechos|No-reply)[^\n\r]+/gi, '') // Legal junk
    .trim();
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    if (typeof window === 'undefined') {
      const workerPath = path.resolve(process.cwd(), 'node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs');
      (pdfjs as any).GlobalWorkerOptions.workerSrc = workerPath;
    }
    const parser = new PDFParse({ data: new Uint8Array(buffer), disableWorker: true, verbosity: 0 } as any);
    const pdfData = await parser.getText();
    return pdfData.text;
  } catch (err: any) {
    console.error('PDF Parsing Error:', err);
    return '';
  }
}

export async function extractTravelInfo(formData: FormData): Promise<ExtractedData> {
  const file = formData.get('file') as File;
  const forcedType = formData.get('type') as string;
  const userName = formData.get('userName') as string;

  if (!file) throw new Error('No se ha subido ningún archivo.');

  const buffer = Buffer.from(await file.arrayBuffer());
  const rawText = await extractTextFromPdf(buffer);
  const providerKey = detectProvider(rawText);
  const provider = (PROVIDERS as any)[providerKey];
  const cleanText = cleanLogisticsNoise(rawText);

  console.log(`\n--- [INICIO EXTRACCIÓN] ---`);
  console.log(`[DEBUG] Proveedor Detectado: ${providerKey}`);
  console.log(`[DEBUG] Texto Limpio Analizado:\n${cleanText.substring(0, 1500)}...\n`);

  let type: 'hotel' | 'flight' | 'transfer' | 'document' | 'boarding_pass' = 'document';
  
  // 1. Detect Boarding Pass (Vueling Specific)
  const vuelingData = parseVuelingBoardingPass(rawText);
  if (vuelingData) {
    return { 
      type: 'boarding_pass', 
      data: vuelingData, 
      confidence: 0.98, 
      rawText 
    };
  }

  if (forcedType && forcedType !== 'auto') {
    type = forcedType as any;
  } else {
    if (rawText.toLowerCase().includes('flight') || rawText.toLowerCase().includes('vuelo') || providerKey !== 'GENERIC' && providerKey !== 'BOOKING' && providerKey !== 'HOTELS') {
      type = 'flight';
    } else if (rawText.toLowerCase().includes('hotel') || rawText.toLowerCase().includes('reserva') || providerKey === 'BOOKING' || providerKey === 'HOTELS') {
      type = 'hotel';
    }
  }

  const data: any = {};
  let confidence = 0.5;

  if (type === 'flight') {
    // 1. Identify the Flight Block (Flexible for Vueling dots/newlines)
    // We look for the area containing hours (XX:XXh) and Flight number (VYXXXX)
    const lines = cleanText.split('\n');
    let blockStartIndex = -1;
    let blockEndIndex = -1;

    // Vueling precision: Look for IATA codes (3 letters) near times and VY code
    for (let i = 0; i < lines.length; i++) {
      const hasIata = /\b[A-Z]{3}\b/.test(lines[i]);
      const hasTime = /\d{2}:\d{2}h/.test(lines[i]);
      const hasFlight = /VY\d{4}/i.test(lines[i]);

      if (hasIata || hasTime || hasFlight) {
        // If we find a line with these, we look around it
        if (blockStartIndex === -1) blockStartIndex = Math.max(0, i - 4);
        blockEndIndex = Math.min(lines.length, i + 6);
        
        // If we find both time and flight code, we have a high confidence block
        if (hasTime && hasFlight) break;
      }
    }

    const flightBlock = blockStartIndex !== -1 ? lines.slice(blockStartIndex, blockEndIndex).join('\n') : cleanText;
    console.log(`\n--------------------------------------------------`);
    console.log(`[DEBUG] BLOQUE DE EXTRACCIÓN SELECCIONADO:`);
    console.log(`--------------------------------------------------\n${flightBlock}\n--------------------------------------------------\n`);

    // 2. Extract Data from Block
    data.flight_number = extractPattern(flightBlock, /\b(VY\d{4})\b/i) || extractPattern(cleanText, /\b(VY\d{4})\b/i);
    data.reservation_code = extractPattern(cleanText, /(?:C\u00f3digo de reserva|Localizador|Locator|Pnr):\s*([A-Z0-9]{6})/i) || 
                           extractPattern(cleanText, /\b([A-Z0-9]{6})\b/i);
    
    // Origin/Destination: All 3-letter uppercase words in block
    const iataCodes = flightBlock.match(/\b[A-Z]{3}\b/g) || [];
    data.departure_location = iataCodes[0] || null;
    data.arrival_location = iataCodes[1] || null;

    const times = flightBlock.match(/(\d{2}:\d{2}h?)/g) || [];
    // Buscar fecha con o sin prefijo (Fecha, Date, Día)
    const dateMatch = cleanText.match(/(?:Fecha|Date|D\u00eda):\s*(\d{1,2}\s+[a-z]+\s+\d{4})/i) || 
                      cleanText.match(/\b(\d{1,2}\s+[a-z]+\s+\d{4})\b/i);
    const dateStr = dateMatch ? dateMatch[1] : '';

    data.departure_time = times[0] ? parseSpanishDate(`${dateStr} ${times[0]}`) : null;
    data.arrival_time = times[1] ? parseSpanishDate(`${dateStr} ${times[1]}`) : null;
    
    // Vueling Specifics
    data.airline = 'Vueling';
    data.seat = extractPattern(flightBlock, /(?:Asiento|Seat)[\s\t]*:?[\s\t]*([A-Z0-9]{2,3})/i) || 
                extractPattern(cleanText, /(?:Asiento|Seat)[\s\t]*:?[\s\t]*([A-Z0-9]{2,3})/i);
    
    data.baggage_info = flightBlock.toLowerCase().includes('equipaje') || flightBlock.toLowerCase().includes('maleta') ? 'Incluido' : 'No especificado';
    
    // Passengers (More robust extraction)
    const passengersMatch = cleanText.match(/(?:Pasajeros|Passenger List|Viajeros)(?:.*Ida)?([\s\S]*?)(?:Asiento|Seat|Informaci\u00f3n|Documentaci\u00f3n)/i);
    if (passengersMatch) {
      data.passengers = passengersMatch[1].trim().split(/[\n\t]/).filter(l => l.trim().length > 5 && !l.includes('Ida') && !l.includes('SERVICIOS')).join(', ');
    }

    // Intelligent Trip Type Detection (Outbound/Return)
    let tripType = 'outbound';
    const isFromSpain = /VLC|Valencia|MAD|Madrid|ALC|Alicante|BCN|Barcelona/i.test(data.departure_location || '');
    const isToFrance = /ORY|Orly|CDG|Paris|Par\u00eds/i.test(data.arrival_location || '');
    const isFromFrance = /ORY|Orly|CDG|Paris|Par\u00eds/i.test(data.departure_location || '');
    const isToSpain = /VLC|Valencia|MAD|Madrid|ALC|Alicante|BCN|Barcelona/i.test(data.arrival_location || '');

    if (isFromSpain && isToFrance) tripType = 'outbound';
    else if (isFromFrance && isToSpain) tripType = 'return';
    
    data.type = tripType;
    
    // 3. Confidence Checklist
    const criticalFields = ['reservation_code', 'flight_number', 'departure_location', 'arrival_location', 'departure_time', 'arrival_time'];
    const presentCount = criticalFields.filter(f => data[f]).length;
    
    if (presentCount === 6) confidence = 0.95;
    else if (presentCount >= 4) confidence = 0.8;
    else confidence = 0.3;

    console.log(`[DEBUG] Campos Extra\u00eddos:`, data);
    console.log(`[DEBUG] Score Confianza: ${confidence} (${presentCount}/6 campos cr\u00edticos)`);
  } 
  
  else if (type === 'hotel') {
    data.hotel_name = extractPattern(cleanText, /(?:Hotel|Alojamiento|Accommodation):\s*([^\n\r]+)/i);
    data.check_in = extractDate(cleanText, /(?:Check-in|Entrada|Arrival):\s*([^\n\r]+)/i);
    data.check_out = extractDate(cleanText, /(?:Check-out|Salida|Departure):\s*([^\n\r]+)/i);
    data.confirmation_number = extractPattern(cleanText, /(?:Confirmation|Reserva|Ref\.?):\s*([A-Z0-9-]+)/i);
    if (data.hotel_name && data.check_in) confidence = 0.9;
  }

  data.is_verified = false;
  data.source = 'agency_pdf';
  data.provider = provider?.name || 'Generic';

  return { type, data, confidence, rawText };
}

function parseSpanishDate(str: string): string | null {
  if (!str || str.trim() === '') return null;
  const months: { [key: string]: string } = {
    enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
    julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
  };
  try {
    const normalized = str.toLowerCase().replace(/[\u00C0-\u017F]/g, (c) => c.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    const match = normalized.match(/(?:\w+,\s*)?(\d{1,2})\s+([a-z]+)\s+(\d{4})\s+(\d{2}:\d{2})/);
    if (match) {
      const [, day, monthName, year, time] = match;
      const month = months[monthName] || '01';
      return `${day.padStart(2, '0')}/${month}/${year} ${time}h`;
    }
    return str;
  } catch { return str; }
}

function extractPattern(text: string, regex: RegExp): string | null {
  const match = text.match(regex);
  if (!match) return null;
  return match[1].trim();
}

function extractDate(text: string, regex: RegExp): string | null {
  const match = text.match(regex);
  if (!match) return null;
  return match[1].trim();
}
