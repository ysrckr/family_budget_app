import { shiftMonth } from "./money";

// Pure installment math (no DB). APR is stored in basis points (12.5% = 1250).

/**
 * Monthly payment for an amortized installment plan.
 * 0% APR → principal / months. Otherwise the standard annuity formula.
 */
export function monthlyPaymentCents(
  principalCents: number,
  months: number,
  aprBps: number | null | undefined
): number {
  if (months <= 0 || principalCents <= 0) return 0;
  const r = (aprBps ?? 0) / 10000 / 12; // monthly rate as a fraction
  if (r <= 0) return Math.round(principalCents / months);
  const factor = r / (1 - Math.pow(1 + r, -months));
  return Math.round(principalCents * factor);
}

/** "YYYY-MM" of the final payment for a plan. */
export function planEndMonth(startMonth: string, months: number): string {
  return shiftMonth(startMonth, Math.max(0, months - 1));
}

/** Whether a plan is still being paid in the given month. */
export function isActiveIn(
  startMonth: string,
  months: number,
  monthKey: string
): boolean {
  if (months <= 0) return false;
  return monthKey >= startMonth && monthKey <= planEndMonth(startMonth, months);
}

/** Number of months from a→b (b minus a), e.g. 2026-06 → 2026-08 = 2. */
function monthDiff(a: string, b: string): number {
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  return (yb - ya) * 12 + (mb - ma);
}

/** Payments still remaining as of (and including) the given month. */
export function paymentsRemaining(
  startMonth: string,
  months: number,
  monthKey: string
): number {
  if (monthKey < startMonth) return months;
  if (monthKey > planEndMonth(startMonth, months)) return 0;
  return months - monthDiff(startMonth, monthKey);
}
