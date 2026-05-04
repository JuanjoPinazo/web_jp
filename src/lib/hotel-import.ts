/**
 * hotel-import.ts
 * Utilidad para parsear Excel/CSV y mapear columnas a hotel_stays.
 */

// Column name mapping: normalized key → possible column names (ES + EN)
export const COLUMN_MAP: Record<string, string[]> = {
  guest_name:          ['guest_name', 'nombre', 'nombre completo', 'huesped', 'huésped', 'name', 'traveler', 'viajero'],
  guest_email:         ['guest_email', 'email', 'correo', 'e-mail'],
  hotel_name:          ['hotel_name', 'hotel', 'nombre hotel', 'establecimiento'],
  address:             ['address', 'dirección', 'direccion', 'domicilio'],
  phone:               ['phone', 'teléfono', 'telefono', 'tel'],
  check_in:            ['check_in', 'check in', 'fecha llegada', 'llegada', 'entrada', 'checkin'],
  check_out:           ['check_out', 'check out', 'fecha salida', 'salida', 'checkout'],
  check_in_time:       ['check_in_time', 'hora entrada', 'hora llegada', 'hora checkin'],
  check_out_time:      ['check_out_time', 'hora salida', 'hora checkout'],
  nights:              ['nights', 'noches'],
  adults:              ['adults', 'adultos'],
  room_type:           ['room_type', 'habitación', 'habitacion', 'tipo habitación', 'tipo habitacion', 'room'],
  booking_reference:   ['booking_reference', 'localizador', 'referencia', 'ref', 'booking ref', 'confirmación', 'confirmation'],
  breakfast_included:  ['breakfast_included', 'desayuno', 'breakfast'],
  cancellation_policy: ['cancellation_policy', 'cancelación', 'cancelacion', 'politica cancelacion'],
  notes:               ['notes', 'notas', 'observaciones', 'comentarios'],
  room_group_id:       ['room_group_id', 'grupo habitación', 'grupo habitacion', 'id habitación compartida', 'compartida con', 'room_group'],
};

const REQUIRED_FIELDS = ['guest_name', 'hotel_name', 'check_in', 'check_out', 'booking_reference'] as const;

export interface ImportRow {
  rowIndex: number;
  raw: Record<string, any>;
  // Mapped fields
  guest_name?: string;
  guest_email?: string;
  hotel_name?: string;
  address?: string;
  phone?: string;
  check_in?: string;
  check_out?: string;
  check_in_time?: string;
  check_out_time?: string;
  nights?: number;
  adults?: number;
  room_type?: string;
  booking_reference?: string;
  breakfast_included?: boolean;
  cancellation_policy?: string;
  notes?: string;
  room_group_id?: string;
  // Validation
  valid: boolean;
  errors: string[];
}

/** Normalize a column header to a lowercase, trimmed string */
function normalizeHeader(h: string): string {
  return (h || '').toString().toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Build a map from raw column header → normalized field key */
function buildHeaderIndex(headers: string[]): Record<string, string> {
  const index: Record<string, string> = {};
  for (const header of headers) {
    const norm = normalizeHeader(header);
    for (const [field, aliases] of Object.entries(COLUMN_MAP)) {
      if (aliases.includes(norm)) {
        index[header] = field;
        break;
      }
    }
  }
  return index;
}

/** Parse a date cell to ISO YYYY-MM-DD */
function parseDate(value: any): string | undefined {
  if (!value) return undefined;
  // If it's an Excel serial number (number)
  if (typeof value === 'number') {
    // xlsx serial: days since 1900-01-01 (Excel epoch)
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  const str = value.toString().trim();
  // Try common formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, YYYY/MM/DD
  const patterns = [
    { re: /^(\d{2})\/(\d{2})\/(\d{4})$/, fn: (m: RegExpMatchArray) => `${m[3]}-${m[2]}-${m[1]}` },
    { re: /^(\d{2})-(\d{2})-(\d{4})$/, fn: (m: RegExpMatchArray) => `${m[3]}-${m[2]}-${m[1]}` },
    { re: /^(\d{4})-(\d{2})-(\d{2})$/, fn: (m: RegExpMatchArray) => `${m[1]}-${m[2]}-${m[3]}` },
    { re: /^(\d{4})\/(\d{2})\/(\d{2})$/, fn: (m: RegExpMatchArray) => `${m[1]}-${m[2]}-${m[3]}` },
    { re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, fn: (m: RegExpMatchArray) => `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` },
  ];
  for (const { re, fn } of patterns) {
    const m = str.match(re);
    if (m) return fn(m);
  }
  // Last resort: native Date parse
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return undefined;
}

/** Parse breakfast boolean */
function parseBreakfast(value: any): boolean {
  if (value === null || value === undefined || value === '') return false;
  const s = value.toString().toLowerCase().trim();
  return ['sí', 'si', 'yes', 'true', '1', 'incluido', 'included'].includes(s);
}

/** Parse all rows from a raw JSON sheet (array of objects from xlsx) */
export function parseHotelRows(rawRows: Record<string, any>[]): ImportRow[] {
  if (!rawRows.length) return [];

  const headers = Object.keys(rawRows[0]);
  const headerIndex = buildHeaderIndex(headers);

  return rawRows.map((raw, i) => {
    // Map raw → normalized
    const mapped: Record<string, any> = {};
    for (const [rawHeader, fieldKey] of Object.entries(headerIndex)) {
      mapped[fieldKey] = raw[rawHeader];
    }

    const errors: string[] = [];

    const guest_name = mapped.guest_name?.toString().trim() || undefined;
    const hotel_name = mapped.hotel_name?.toString().trim() || undefined;
    const check_in   = parseDate(mapped.check_in);
    const check_out  = parseDate(mapped.check_out);
    const booking_reference = mapped.booking_reference?.toString().trim() || undefined;

    if (!guest_name)        errors.push('Falta nombre del huésped');
    if (!hotel_name)        errors.push('Falta nombre del hotel');
    if (!check_in)          errors.push('Fecha de entrada inválida o ausente');
    if (!check_out)         errors.push('Fecha de salida inválida o ausente');
    if (!booking_reference) errors.push('Falta localizador/referencia');

    const row: ImportRow = {
      rowIndex: i + 2, // 1-indexed + header row
      raw,
      guest_name,
      guest_email:         mapped.guest_email?.toString().trim() || undefined,
      hotel_name,
      address:             mapped.address?.toString().trim() || undefined,
      phone:               mapped.phone?.toString().trim() || undefined,
      check_in,
      check_out,
      check_in_time:       mapped.check_in_time?.toString().trim() || undefined,
      check_out_time:      mapped.check_out_time?.toString().trim() || undefined,
      nights:              mapped.nights ? parseInt(mapped.nights, 10) : undefined,
      adults:              mapped.adults ? parseInt(mapped.adults, 10) : 1,
      room_type:           mapped.room_type?.toString().trim() || undefined,
      booking_reference,
      breakfast_included:  parseBreakfast(mapped.breakfast_included),
      cancellation_policy: mapped.cancellation_policy?.toString().trim() || undefined,
      notes:               mapped.notes?.toString().trim() || undefined,
      room_group_id:       mapped.room_group_id?.toString().trim() || undefined,
      valid: errors.length === 0,
      errors,
    };

    return row;
  });
}

/** Build Supabase upsert payload from a valid ImportRow */
export function rowToHotelStayPayload(row: ImportRow, planId: string) {
  return {
    plan_id:             planId,
    guest_name:          row.guest_name!,
    guest_email:         row.guest_email,
    hotel_name:          row.hotel_name!,
    address:             row.address,
    phone:               row.phone,
    check_in:            row.check_in!,
    check_out:           row.check_out!,
    check_in_time:       row.check_in_time,
    check_out_time:      row.check_out_time,
    nights:              row.nights,
    adults:              row.adults ?? 1,
    room_type:           row.room_type,
    booking_reference:   row.booking_reference!,
    breakfast_included:  row.breakfast_included ?? false,
    cancellation_policy: row.cancellation_policy,
    notes:               row.notes,
    room_group_id:       row.room_group_id,
    source:              'excel_import',
    status:              'confirmed',
  };
}
