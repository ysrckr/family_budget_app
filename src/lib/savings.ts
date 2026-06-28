// Pure savings math (no DB). A pot's balance is derived from its transactions;
// deposits add, withdrawals subtract. amountCents is always stored positive.

type TxnLike = { txnType: string; amountCents: number };

/** Running balance of a pot = SUM(deposits) - SUM(withdrawals), in cents. */
export function potBalance(txns: TxnLike[]): number {
  return txns.reduce(
    (s, t) => s + (t.txnType === "withdrawal" ? -t.amountCents : t.amountCents),
    0
  );
}

/**
 * Progress toward a goal as a clamped 0–100 percentage, or null for an
 * open-ended pot (no target) so the UI can hide the bar.
 */
export function goalProgress(
  balanceCents: number,
  targetCents: number | null | undefined
): number | null {
  if (!targetCents || targetCents <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((balanceCents / targetCents) * 100)));
}

/**
 * How many monthly contributions a recurring rule has made through a month
 * (inclusive). 0 if the month is before it started.
 */
export function recurringCount(startMonth: string, throughMonth: string): number {
  if (throughMonth < startMonth) return 0;
  const [ys, ms] = startMonth.split("-").map(Number);
  const [yt, mt] = throughMonth.split("-").map(Number);
  return (yt - ys) * 12 + (mt - ms) + 1;
}

/** Whether a recurring rule is active in a given month. */
export function recurringActiveIn(startMonth: string, monthKey: string): boolean {
  return monthKey >= startMonth;
}

/** Split a set of deposits into from-budget vs outside totals (cents). */
export function depositSplit(
  txns: { txnType: string; amountCents: number; inBudget: boolean }[]
): { fromBudget: number; outside: number } {
  let fromBudget = 0;
  let outside = 0;
  for (const t of txns) {
    if (t.txnType !== "deposit") continue;
    if (t.inBudget) fromBudget += t.amountCents;
    else outside += t.amountCents;
  }
  return { fromBudget, outside };
}
