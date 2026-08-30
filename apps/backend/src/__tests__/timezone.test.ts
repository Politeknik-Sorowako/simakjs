import { describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import { systemSettings } from '../models/schema';
import { SystemParameterService } from '../services/system-parameter.service';
import { db } from '../utils/db';
import { formatDateTimeInTimezone, getAppTimezone, getNowDateString, getNowTimeString } from '../utils/timezone';

describe('Timezone Utility (Asia/Makassar WITA UTC+8)', () => {
  it('getNowDateString menghasilkan format YYYY-MM-DD valid', () => {
    const result = getNowDateString('Asia/Makassar');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('getNowTimeString menghasilkan format HH:mm valid', () => {
    const result = getNowTimeString('Asia/Makassar');
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it('perbatasan UTC 23:30 tanggal 28 -> tanggal 29 di WITA (UTC+8)', () => {
    // UTC 23:30 tanggal 28 Januari = 07:30 WITA tanggal 29 Januari
    const boundary = new Date('2026-01-28T23:30:00Z');
    expect(getNowDateString('Asia/Makassar', boundary)).toBe('2026-01-29');
    expect(getNowDateString('UTC', boundary)).toBe('2026-01-28');
  });

  it('perbatasan UTC 23:30 -> jam 07:30 WITA', () => {
    const boundary = new Date('2026-01-28T23:30:00Z');
    expect(getNowTimeString('Asia/Makassar', boundary)).toBe('07:30');
    expect(getNowTimeString('UTC', boundary)).toBe('23:30');
  });

  it('formatDateTimeInTimezone memformat datetime dengan timezone target', () => {
    const date = new Date('2026-01-28T23:30:00Z');
    const formatted = formatDateTimeInTimezone(date, 'Asia/Makassar');
    // Locale id-ID memisahkan jam-menit dengan titik: "07.30" WITA (UTC 23:30 + 8 jam)
    expect(formatted).toContain('07.30');
    expect(formatted).toContain('2026');
  });

  it('formatDateTimeInTimezone mengembalikan string kosong untuk tanggal invalid', () => {
    expect(formatDateTimeInTimezone('bukan-tanggal', 'Asia/Makassar')).toBe('');
  });

  it('getAppTimezone mengambil nilai default Asia/Makassar dari SystemParameterService', async () => {
    await db.delete(systemSettings).where(sql`${systemSettings.key} = 'TIMEZONE'`);
    const tz = await getAppTimezone();
    expect(tz).toBe('Asia/Makassar');
  });

  it('SystemParameterService.getTimezone mengembalikan default Asia/Makassar', async () => {
    await db.delete(systemSettings).where(sql`${systemSettings.key} = 'TIMEZONE'`);
    const tz = await SystemParameterService.getTimezone();
    expect(tz).toBe('Asia/Makassar');
  });
});
