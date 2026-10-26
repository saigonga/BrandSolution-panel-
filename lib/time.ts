// All "days" in this app are India Standard Time days (UTC+05:30, no DST).
// A day is represented as a key "YYYY-MM-DD"; it is stored in the DB as the
// UTC instant of that day's IST midnight.

import { WORKING_DAYS, LOCK_HOUR, LOCK_MINUTE } from "@/config/settings";

export const TZ = "Asia/Kolkata";
const OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

export function dayKey(d: Date = new Date()): string {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

export function dayStart(key: string): Date {
  return new Date(Date.parse(`${key}T00:00:00.000Z`) - OFFSET_MS);
}

export function addDays(key: string, n: number): string {
  return dayKey(new Date(dayStart(key).getTime() + n * DAY_MS));
}

export function isValidKey(key: unknown): key is string {
  return typeof key === "string" && /^\d{4}-\d{2}-\d{2}$/.test(key) && !isNaN(Date.parse(`${key}T00:00:00Z`));
}

export function dayOfWeek(key: string): number {
  return new Date(Date.parse(`${key}T00:00:00Z`)).getUTCDay();
}

export function isWorkingDay(key: string): boolean {
  return WORKING_DAYS.includes(dayOfWeek(key));
}

export function lockInstant(key: string): Date {
  return new Date(dayStart(key).getTime() + (LOCK_HOUR * 60 + LOCK_MINUTE) * 60_000);
}

export function isLocked(now: Date = new Date()): boolean {
  return now.getTime() >= lockInstant(dayKey(now)).getTime();
}

export function msToLock(now: Date = new Date()): number {
  return lockInstant(dayKey(now)).getTime() - now.getTime();
}

export function monthStartKey(now: Date = new Date()): string {
  return `${dayKey(now).slice(0, 8)}01`;
}

// Working days in (fromKey, toKey]
export function workingDaysBetween(fromKey: string, toKey: string): number {
  let n = 0;
  let k = addDays(fromKey, 1);
  let guard = 0;
  while (k <= toKey && guard++ < 800) {
    if (isWorkingDay(k)) n++;
    k = addDays(k, 1);
  }
  return n;
}

export function calendarDaysBetween(fromKey: string, toKey: string): number {
  return Math.round((dayStart(toKey).getTime() - dayStart(fromKey).getTime()) / DAY_MS);
}

const fmtShortI = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: TZ });
const fmtLongI = new Intl.DateTimeFormat("en-IN", {
  weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: TZ,
});
const fmtTimeI = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ });
const fmtMonthI = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: TZ });

export function fmtShort(d: Date | string): string {
  return fmtShortI.format(typeof d === "string" ? new Date(d) : d);
}
export function fmtLong(d: Date | string): string {
  return fmtLongI.format(typeof d === "string" ? new Date(d) : d);
}
export function fmtTime(d: Date | string): string {
  return fmtTimeI.format(typeof d === "string" ? new Date(d) : d);
}
export function fmtMonth(d: Date | string): string {
  return fmtMonthI.format(typeof d === "string" ? new Date(d) : d);
}

export function relDay(d: Date | string, now: Date = new Date()): string {
  const n = calendarDaysBetween(dayKey(typeof d === "string" ? new Date(d) : d), dayKey(now));
  if (n <= 0) return "today";
  if (n === 1) return "1d ago";
  return `${n}d ago`;
}
