import { shiftMonth } from "./money";

// Pure subscription math (no DB). Monthly subs cost their amount each month;
// yearly subs are smoothed to a monthly set-aside (amount / 12).

export function monthlyCostCents(amountCents: number, cycle: string): number {
  return cycle === "yearly" ? Math.round(amountCents / 12) : amountCents;
}

/** Active in a month if it started on or before it. */
export function subActiveIn(startMonth: string, monthKey: string): boolean {
  return monthKey >= startMonth;
}

function monthDiff(a: string, b: string): number {
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  return (yb - ya) * 12 + (mb - ma);
}

/**
 * For a yearly sub, the next renewal month on/after `fromMonth` (the anniversary
 * of startMonth). Returns null for monthly subs.
 */
export function nextRenewalMonth(
  startMonth: string,
  cycle: string,
  fromMonth: string
): string | null {
  if (cycle !== "yearly") return null;
  const diff = monthDiff(startMonth, fromMonth);
  if (diff <= 0) return startMonth;
  const yearsToNext = Math.ceil(diff / 12);
  return shiftMonth(startMonth, yearsToNext * 12);
}
