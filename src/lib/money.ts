export const APP_CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "USD";

/** Format integer cents in a currency (defaults to the app currency). */
export function formatMoney(cents: number, currency = APP_CURRENCY): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    // Use the short symbol (฿, $, €…) instead of the 3-letter code so figures
    // stay compact and don't overflow narrow cards.
    currencyDisplay: "narrowSymbol",
  }).format((cents || 0) / 100);
}

/** Compact money for chart axes, e.g. 1234567 -> "฿12.3k". */
export function formatMoneyCompact(cents: number, currency = APP_CURRENCY): string {
  const v = (cents || 0) / 100;
  const sym = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  })
    .formatToParts(0)
    .find((p) => p.type === "currency")?.value ?? "";
  const abs = Math.abs(v);
  let num: string;
  if (abs >= 1_000_000) num = `${(v / 1_000_000).toFixed(1)}M`;
  else if (abs >= 1_000) num = `${(v / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  else num = String(Math.round(v));
  return `${sym}${num}`;
}

/** Parse a user-typed amount ("5000", "5,000.50") into integer cents. */
export function parseMoneyToCents(input: string | number): number {
  const cleaned = String(input).replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** "2026-06" for the given date (defaults to now). */
export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Inclusive start / exclusive end ISO dates for a "YYYY-MM" month. */
export function monthRange(key: string): { start: string; end: string } {
  const [y, m] = key.split("-").map(Number);
  const start = `${key}-01`;
  const endDate = new Date(Date.UTC(y, m, 1));
  const end = `${endDate.getUTCFullYear()}-${String(
    endDate.getUTCMonth() + 1
  ).padStart(2, "0")}-01`;
  return { start, end };
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/** Number of days in a "YYYY-MM" month. */
export function daysInMonth(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/** Sensible default day: today's day if the month is the current one, else 1. */
export function defaultDay(key: string): number {
  const now = new Date();
  if (monthKey(now) === key) return Math.min(now.getDate(), daysInMonth(key));
  return 1;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function isMonthKey(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}$/.test(v);
}

/**
 * The budget month we're currently "living in" — the month a purchase made
 * today would count toward. Once today is past the household cutoff day, this
 * is next calendar month, so pages default there. Falls back to the calendar
 * month when no cutoff is set.
 */
export function currentBudgetMonth(cutoffDay: number | null | undefined): string {
  return billingMonthFor(todayISO(), cutoffDay);
}

/**
 * The budget ("billing") month a purchase counts toward.
 * - No cut day (cash/debit): the month of the purchase date.
 * - With a cut day (credit card): purchases AFTER the cut day roll to next month;
 *   on or before it, they stay in the purchase month. The cut day is clamped to
 *   the month's last day (so cut day 31 in February = the 28th/29th).
 */
export function billingMonthFor(
  occurredOnISO: string,
  cutDay: number | null | undefined
): string {
  const [y, m, d] = occurredOnISO.split("-").map(Number);
  if (!cutDay || cutDay < 1) {
    return `${y}-${String(m).padStart(2, "0")}`;
  }
  const lastDay = new Date(y, m, 0).getDate();
  const clamped = Math.min(cutDay, lastDay);
  if (d > clamped) {
    const next = new Date(y, m, 1); // m is 1-based, so this is the 1st of next month
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}
