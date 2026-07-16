/**
 * Date formatting and calculation helper utilities.
 */

export function formatDate(daysAgo: number, timeStr: string, now: Date = new Date("2026-06-27T01:27:36-07:00")): string {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  return `${d.toISOString().split('T')[0]}T${timeStr}`;
}

export function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}
