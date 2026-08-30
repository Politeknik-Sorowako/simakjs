import { SystemParameterService } from '../services/system-parameter.service';

const DEFAULT_TZ = 'Asia/Makassar';

export async function getAppTimezone(): Promise<string> {
  return await SystemParameterService.getTimezone();
}

export function getNowDateString(tz: string = DEFAULT_TZ, date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date);
}

export function getNowTimeString(tz: string = DEFAULT_TZ, date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatDateTimeInTimezone(
  date: Date | string,
  tz: string = DEFAULT_TZ,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
    ...options,
  }).format(d);
}
