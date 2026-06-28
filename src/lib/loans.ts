// Pure loan math (no DB). Loans are always OUTSIDE the household budget.

type PaymentLike = { amountCents: number };

/** Remaining balance = openingBalance - SUM(payments), never below 0. */
export function loanRemaining(
  openingBalanceCents: number,
  payments: PaymentLike[]
): number {
  const paid = payments.reduce((s, p) => s + p.amountCents, 0);
  return Math.max(0, openingBalanceCents - paid);
}

/**
 * Payoff progress as a clamped 0–100 percentage, measured against the original
 * principal (so a loan you started tracking mid-life shows true progress).
 */
export function payoffProgress(
  originalPrincipalCents: number,
  remainingCents: number
): number {
  if (!originalPrincipalCents || originalPrincipalCents <= 0) return 0;
  const paid = originalPrincipalCents - remainingCents;
  return Math.max(0, Math.min(100, Math.round((paid / originalPrincipalCents) * 100)));
}

/** Rough months-to-payoff at the current scheduled payment, or null if N/A. */
export function estimateEtaMonths(
  remainingCents: number,
  scheduledCents: number
): number | null {
  if (!scheduledCents || scheduledCents <= 0 || remainingCents <= 0) return null;
  return Math.ceil(remainingCents / scheduledCents);
}
