import { DateTime } from 'luxon';

export function normalizeToYMD(input: string): string {
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  // ISO timestamp
  const iso = new Date(input);
  if (!isNaN(iso.getTime())) {
    return iso.toISOString().slice(0, 10);
  }

  // timestamp en ms
  const ms = Number(input);
  if (!isNaN(ms)) {
    const d = new Date(ms);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }

  throw new Error('Invalid date. Expected YYYY-MM-DD or timestamp');
}

export function normalizeToYMDWithTZ(input: string, timezone: string): string {
  const tz = timezone || 'UTC';

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const dt = DateTime.fromFormat(input, 'yyyy-MM-dd', { zone: tz });
    if (!dt.isValid) {
      throw new Error('Invalid date');
    }
    return dt.toISODate();
  }

  const asNumber = Number(input);
  if (!Number.isNaN(asNumber)) {
    const dt = DateTime.fromMillis(asNumber, { zone: 'utc' }).setZone(tz);
    if (!dt.isValid) {
      throw new Error('Invalid date');
    }
    return dt.toISODate();
  }

  const dt = DateTime.fromISO(input, { setZone: true }).setZone(tz);
  if (!dt.isValid) {
    throw new Error('Invalid date');
  }

  return dt.toISODate();
}
