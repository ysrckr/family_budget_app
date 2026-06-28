// Shared logic for "standing" settings that change over time (salaries, budgets).
// A row applies from its effectiveFrom ("YYYY-MM-01") onward. For a given month
// we pick the latest row whose effectiveFrom is on or before that month.

type Dated = { effectiveFrom: string };

function latest<T extends Dated>(rows: T[], monthKey: string): T | undefined {
  const start = `${monthKey}-01`;
  let best: T | undefined;
  for (const r of rows) {
    if (r.effectiveFrom <= start) {
      if (!best || r.effectiveFrom > best.effectiveFrom) best = r;
    }
  }
  return best;
}

export type SalaryRow = {
  person: string;
  amountCents: number;
  effectiveFrom: string;
};

/** Effective salary per person for a month (only persons with a row in effect). */
export function effectiveSalaries(
  rows: SalaryRow[],
  monthKey: string
): { person: string; amountCents: number }[] {
  const byPerson = new Map<string, SalaryRow[]>();
  for (const r of rows) {
    (byPerson.get(r.person) ?? byPerson.set(r.person, []).get(r.person)!).push(r);
  }
  const out: { person: string; amountCents: number }[] = [];
  for (const [person, list] of byPerson) {
    const row = latest(list, monthKey);
    if (row) out.push({ person, amountCents: row.amountCents });
  }
  return out.sort((a, b) => a.person.localeCompare(b.person));
}

export function totalSalary(rows: SalaryRow[], monthKey: string): number {
  return effectiveSalaries(rows, monthKey).reduce(
    (s, x) => s + x.amountCents,
    0
  );
}

export type FixedCostRow = {
  label: string;
  amountCents: number;
  effectiveFrom: string;
};

/** Effective fixed cost per label for a month (latest row in effect per label). */
export function effectiveFixedCosts(
  rows: FixedCostRow[],
  monthKey: string
): { label: string; amountCents: number }[] {
  const byLabel = new Map<string, FixedCostRow[]>();
  for (const r of rows) {
    (byLabel.get(r.label) ?? byLabel.set(r.label, []).get(r.label)!).push(r);
  }
  const out: { label: string; amountCents: number }[] = [];
  for (const [label, list] of byLabel) {
    const row = latest(list, monthKey);
    if (row) out.push({ label, amountCents: row.amountCents });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

export function totalFixedCosts(rows: FixedCostRow[], monthKey: string): number {
  return effectiveFixedCosts(rows, monthKey).reduce(
    (s, x) => s + x.amountCents,
    0
  );
}

export type BudgetRow = {
  categoryId: number;
  amountCents: number;
  effectiveFrom: string;
};

/** Map of categoryId -> effective budget (cents) for a month. */
export function effectiveBudgets(
  rows: BudgetRow[],
  monthKey: string
): Map<number, number> {
  const byCat = new Map<number, BudgetRow[]>();
  for (const r of rows) {
    (byCat.get(r.categoryId) ??
      byCat.set(r.categoryId, []).get(r.categoryId)!).push(r);
  }
  const out = new Map<number, number>();
  for (const [categoryId, list] of byCat) {
    const row = latest(list, monthKey);
    out.set(categoryId, row?.amountCents ?? 0);
  }
  return out;
}

export type LoanScheduleRow = {
  loanId: number;
  amountCents: number;
  effectiveFrom: string;
};

/**
 * The scheduled monthly payment in force for a month (0 if none). Pass a single
 * loan's schedule rows — same effective-dating rule as salaries/budgets.
 */
export function effectiveLoanPayment(
  rows: LoanScheduleRow[],
  monthKey: string
): number {
  return latest(rows, monthKey)?.amountCents ?? 0;
}

/** Map of loanId -> effective scheduled payment (cents) for a month. */
export function effectiveLoanPayments(
  rows: LoanScheduleRow[],
  monthKey: string
): Map<number, number> {
  const byLoan = new Map<number, LoanScheduleRow[]>();
  for (const r of rows) {
    (byLoan.get(r.loanId) ??
      byLoan.set(r.loanId, []).get(r.loanId)!).push(r);
  }
  const out = new Map<number, number>();
  for (const [loanId, list] of byLoan) {
    out.set(loanId, latest(list, monthKey)?.amountCents ?? 0);
  }
  return out;
}
