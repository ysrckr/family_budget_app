import Link from "next/link";
import { and, gte, lt, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  budgets,
  salaries,
  incomes,
  expenses,
  savingsTxns,
  savingsPots,
  recurringSavings,
  loanSchedules,
  loans,
  fixedCosts,
  installmentPlans,
  subscriptions,
} from "@/db/schema";
import {
  formatMoney,
  currentBudgetMonth,
  monthRange,
  monthLabel,
  shiftMonth,
  isMonthKey,
  APP_CURRENCY,
} from "@/lib/money";
import {
  effectiveBudgets,
  totalSalary,
  totalFixedCosts,
  effectiveLoanPayments,
} from "@/lib/recurring";
import {
  getCutoffDay,
  getInstallmentBudgetCents,
  getSubscriptionBudgetCents,
} from "@/lib/settings";
import { isActiveIn } from "@/lib/installments";
import { monthlyCostCents, subActiveIn } from "@/lib/subscriptions";
import TopBar from "@/components/TopBar";
import MonthSwitcher from "@/components/MonthSwitcher";
import SpendingChart from "@/components/SpendingChart";
import SpendingTrend from "@/components/SpendingTrend";
import EnvelopeCard from "@/components/EnvelopeCard";
import AddCategory from "@/components/AddCategory";

export const dynamic = "force-dynamic";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const cutoffDay = await getCutoffDay();
  const key = isMonthKey(sp.month) ? sp.month! : currentBudgetMonth(cutoffDay);
  const { start, end } = monthRange(key);

  // 6-month trend window ending at the viewed month (oldest → current).
  const trendKeys = Array.from({ length: 6 }, (_, i) => shiftMonth(key, -(5 - i)));
  const trendStart = trendKeys[0];
  const trendStartDate = monthRange(trendStart).start;

  const [
    cats,
    budgetRows,
    salaryRows,
    monthIncomes,
    monthExpenses,
    savedInBudgetRows,
    savedOutsideRows,
    loanScheduleRows,
    fixedRows,
    trendExpenseRows,
    trendIncomeRows,
    installmentRows,
    installmentBudgetCents,
    recurringSavingRows,
    subscriptionRows,
    subscriptionBudgetCents,
  ] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.name)),
    db.select().from(budgets),
    db.select().from(salaries),
    db
      .select()
      .from(incomes)
      .where(and(gte(incomes.occurredOn, start), lt(incomes.occurredOn, end))),
    db
      .select()
      .from(expenses)
      .where(
        sql`coalesce(${expenses.billingMonth}, to_char(${expenses.occurredOn}, 'YYYY-MM')) = ${key}`
      ),
    // In-budget savings deposits billed to this month (reduce Left to spend).
    // Restricted to app-currency pots so foreign-currency cents never mix in.
    db
      .select({ s: sql<number>`coalesce(sum(${savingsTxns.amountCents}), 0)` })
      .from(savingsTxns)
      .where(
        sql`${savingsTxns.txnType} = 'deposit' and ${savingsTxns.inBudget} = true and coalesce(${savingsTxns.billingMonth}, to_char(${savingsTxns.occurredOn}, 'YYYY-MM')) = ${key} and ${savingsTxns.potId} in (select id from savings_pots where currency = ${APP_CURRENCY})`
      ),
    // Out-of-budget savings deposits this month (display only — never in Left).
    db
      .select({ s: sql<number>`coalesce(sum(${savingsTxns.amountCents}), 0)` })
      .from(savingsTxns)
      .where(
        sql`${savingsTxns.txnType} = 'deposit' and ${savingsTxns.inBudget} = false and to_char(${savingsTxns.occurredOn}, 'YYYY-MM') = ${key} and ${savingsTxns.potId} in (select id from savings_pots where currency = ${APP_CURRENCY})`
      ),
    // Only schedules of active (non-archived) loans count toward "loans due".
    db
      .select({
        loanId: loanSchedules.loanId,
        amountCents: loanSchedules.amountCents,
        effectiveFrom: loanSchedules.effectiveFrom,
      })
      .from(loanSchedules)
      .innerJoin(loans, eq(loanSchedules.loanId, loans.id))
      .where(isNull(loans.archivedAt)),
    db.select().from(fixedCosts),
    // Last-6-months trend: expenses by billing month, incomes by calendar month.
    db
      .select({
        billingMonth: expenses.billingMonth,
        occurredOn: expenses.occurredOn,
        amountCents: expenses.amountCents,
      })
      .from(expenses)
      .where(
        sql`coalesce(${expenses.billingMonth}, to_char(${expenses.occurredOn}, 'YYYY-MM')) between ${trendStart} and ${key}`
      ),
    db
      .select({ occurredOn: incomes.occurredOn, amountCents: incomes.amountCents })
      .from(incomes)
      .where(and(gte(incomes.occurredOn, trendStartDate), lt(incomes.occurredOn, end))),
    db.select().from(installmentPlans),
    getInstallmentBudgetCents(),
    // Recurring savings rules (with pot currency) to add to this month's saved.
    db
      .select({
        amountCents: recurringSavings.amountCents,
        inBudget: recurringSavings.inBudget,
        startMonth: recurringSavings.startMonth,
        currency: savingsPots.currency,
      })
      .from(recurringSavings)
      .leftJoin(savingsPots, eq(recurringSavings.potId, savingsPots.id)),
    db.select().from(subscriptions),
    getSubscriptionBudgetCents(),
  ]);

  const effBudgets = effectiveBudgets(budgetRows, key);
  const spentByCat = new Map<number, number>();
  for (const e of monthExpenses) {
    spentByCat.set(e.categoryId, (spentByCat.get(e.categoryId) ?? 0) + e.amountCents);
  }

  const sharedItems = cats
    .filter((c) => c.kind === "shared")
    .map((c) => ({
      id: c.id,
      name: c.name,
      budgetCents: effBudgets.get(c.id) ?? 0,
      spentCents: spentByCat.get(c.id) ?? 0,
    }));

  const allowanceItems = cats
    .filter((c) => c.kind === "allowance")
    .map((c) => ({
      id: c.id,
      owner: c.owner ?? "—",
      budgetCents: effBudgets.get(c.id) ?? 0,
      spentCents: spentByCat.get(c.id) ?? 0,
    }));

  const salaryTotal = totalSalary(salaryRows, key);
  const extraTotal = monthIncomes.reduce((s, i) => s + i.amountCents, 0);
  const totalIncome = salaryTotal + extraTotal;
  // Allocated = planned spend only (shared + allowance envelopes). The kind
  // guard is defensive: it keeps any future non-spend category out of the total.
  const totalBudget = cats
    .filter((c) => c.kind === "shared" || c.kind === "allowance")
    .reduce((s, c) => s + (effBudgets.get(c.id) ?? 0), 0);
  const totalSpent = monthExpenses.reduce((s, e) => s + e.amountCents, 0);

  // Savings & loans context. Only in-budget savings reduce Left to spend;
  // out-of-budget savings and all loan payments never touch the four totals.
  // Recurring savings active this month (app-currency pots only) add to saved.
  let recIn = 0;
  let recOut = 0;
  for (const r of recurringSavingRows) {
    if ((r.currency ?? APP_CURRENCY) !== APP_CURRENCY) continue;
    if (key < r.startMonth) continue;
    if (r.inBudget) recIn += r.amountCents;
    else recOut += r.amountCents;
  }
  const savedInBudget = Number(savedInBudgetRows[0]?.s ?? 0) + recIn;
  const savedOutside = Number(savedOutsideRows[0]?.s ?? 0) + recOut;
  const loansDue = [
    ...effectiveLoanPayments(loanScheduleRows, key).values(),
  ].reduce((s, v) => s + v, 0);
  // Fixed recurring costs (rent, etc.) come straight out of Left to spend.
  const fixedTotal = totalFixedCosts(fixedRows, key);

  // Installments due this month also come out of Left to spend.
  const installmentsCommitted = installmentRows
    .filter((p) => isActiveIn(p.startMonth, p.months, key))
    .reduce((s, p) => s + p.monthlyPaymentCents, 0);
  const installmentsLeft = installmentBudgetCents - installmentsCommitted;

  // Subscriptions due this month (monthly + yearly-smoothed) also reduce Left.
  const subscriptionsCommitted = subscriptionRows
    .filter((s) => subActiveIn(s.startMonth, key))
    .reduce((sum, s) => sum + monthlyCostCents(s.amountCents, s.cycle), 0);
  const subscriptionsLeft = subscriptionBudgetCents - subscriptionsCommitted;

  const left =
    totalIncome -
    totalSpent -
    fixedTotal -
    savedInBudget -
    installmentsCommitted -
    subscriptionsCommitted;
  const nothingSetUp = sharedItems.length === 0 && allowanceItems.length === 0;

  // Trend: income (salary + extra) vs spent per billing month, last 6 months.
  const spentByMonth = new Map<string, number>();
  for (const e of trendExpenseRows) {
    const m = e.billingMonth ?? e.occurredOn.slice(0, 7);
    spentByMonth.set(m, (spentByMonth.get(m) ?? 0) + e.amountCents);
  }
  const extraByMonth = new Map<string, number>();
  for (const i of trendIncomeRows) {
    const m = i.occurredOn.slice(0, 7);
    extraByMonth.set(m, (extraByMonth.get(m) ?? 0) + i.amountCents);
  }
  const trendPoints = trendKeys.map((m) => {
    const [yy, mm] = m.split("-").map(Number);
    return {
      label: new Date(yy, mm - 1, 1).toLocaleString(undefined, {
        month: "short",
      }),
      income: totalSalary(salaryRows, m) + (extraByMonth.get(m) ?? 0),
      spent: spentByMonth.get(m) ?? 0,
    };
  });
  const hasTrend = trendPoints.some((p) => p.income > 0 || p.spent > 0);

  // Context strip parts.
  const takenOutParts = [
    fixedTotal > 0 ? `${formatMoney(fixedTotal)} fixed costs` : null,
    installmentsCommitted > 0
      ? `${formatMoney(installmentsCommitted)} installments`
      : null,
    subscriptionsCommitted > 0
      ? `${formatMoney(subscriptionsCommitted)} subscriptions`
      : null,
    savedInBudget > 0 ? `${formatMoney(savedInBudget)} saved from budget` : null,
  ].filter(Boolean) as string[];
  const outsideParts = [
    savedOutside > 0 ? `${formatMoney(savedOutside)} saved outside` : null,
    loansDue > 0 ? `${formatMoney(loansDue)} loans due` : null,
  ].filter(Boolean) as string[];
  const showInstallmentsPlan = installmentBudgetCents > 0;
  const showSubscriptionsPlan = subscriptionBudgetCents > 0;

  return (
    <>
      <TopBar active="/" />
      <main className="mx-auto max-w-5xl px-5 pb-28 pt-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-soft">
              Overview
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {monthLabel(key)}
            </h1>
          </div>
          <MonthSwitcher
            basePath="/"
            label={monthLabel(key)}
            prev={shiftMonth(key, -1)}
            next={shiftMonth(key, 1)}
          />
        </div>

        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Income" value={formatMoney(totalIncome)} />
          <Stat label="Allocated" value={formatMoney(totalBudget)} />
          <Stat label="Spent" value={formatMoney(totalSpent)} />
          <Stat
            label="Left to spend"
            value={formatMoney(left)}
            accent={left < 0 ? "brick" : "teal"}
          />
        </section>

        {(takenOutParts.length > 0 ||
          outsideParts.length > 0 ||
          showInstallmentsPlan ||
          showSubscriptionsPlan) && (
          <div className="-mt-6 mb-8 space-y-1 rounded-lg border border-line bg-surface px-4 py-2.5 text-xs shadow-card">
            {takenOutParts.length > 0 && (
              <p className="text-ink-soft">
                Taken out of Left:{" "}
                <span className="num text-ink">{takenOutParts.join(" · ")}</span>
              </p>
            )}
            {showInstallmentsPlan && (
              <p className="text-ink-soft">
                Installments budget:{" "}
                <span className="num text-ink">
                  {formatMoney(installmentsCommitted)} of{" "}
                  {formatMoney(installmentBudgetCents)}
                </span>{" "}
                used ·{" "}
                <span
                  className={`num ${
                    installmentsLeft < 0 ? "text-brick" : "text-teal-dark"
                  }`}
                >
                  {formatMoney(installmentsLeft)} left
                </span>
              </p>
            )}
            {showSubscriptionsPlan && (
              <p className="text-ink-soft">
                Subscriptions budget:{" "}
                <span className="num text-ink">
                  {formatMoney(subscriptionsCommitted)} of{" "}
                  {formatMoney(subscriptionBudgetCents)}
                </span>{" "}
                used ·{" "}
                <span
                  className={`num ${
                    subscriptionsLeft < 0 ? "text-brick" : "text-teal-dark"
                  }`}
                >
                  {formatMoney(subscriptionsLeft)} left
                </span>
              </p>
            )}
            {outsideParts.length > 0 && (
              <p className="text-ink-soft/70">
                Outside budget (doesn&rsquo;t affect Left):{" "}
                <span className="num">{outsideParts.join(" · ")}</span>
              </p>
            )}
          </div>
        )}

        {nothingSetUp ? (
          <EmptyState monthLabel={monthLabel(key)} effectiveMonth={key} />
        ) : (
          <div className="grid gap-8">
            {hasTrend && <SpendingTrend points={trendPoints} />}

            {sharedItems.length > 0 && <SpendingChart items={sharedItems} />}

            {/* Shared envelopes */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl font-medium">
                  Shared envelopes
                </h2>
                <AddCategory effectiveMonth={key} monthLabel={monthLabel(key)} />
              </div>

              {sharedItems.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-surface px-5 py-6 text-sm text-ink-soft">
                  No shared envelopes yet — add one above.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {sharedItems.map((i) => (
                    <EnvelopeCard
                      key={i.id}
                      title={i.name}
                      budgetCents={i.budgetCents}
                      spentCents={i.spentCents}
                      href={`/expenses/history?category=${i.id}&month=${key}`}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Allowances */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl font-medium">Allowances</h2>
                <Link
                  href="/budget"
                  className="text-sm text-teal underline-offset-2 hover:underline"
                >
                  Manage →
                </Link>
              </div>

              {allowanceItems.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-surface px-5 py-6 text-sm text-ink-soft">
                  No allowances yet. Set each person&rsquo;s allowance on the
                  Budgets page.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {allowanceItems.map((i) => (
                    <EnvelopeCard
                      key={i.id}
                      title={`${i.owner}\u2019s allowance`}
                      budgetCents={i.budgetCents}
                      spentCents={i.spentCents}
                      href={`/expenses/history?category=${i.id}&month=${key}`}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  accent = "ink",
}: {
  label: string;
  value: string;
  accent?: "ink" | "teal" | "brick";
}) {
  const color =
    accent === "teal"
      ? "text-teal-dark"
      : accent === "brick"
      ? "text-brick"
      : "text-ink";
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface p-4 shadow-card">
      <p className="text-xs uppercase tracking-wider text-ink-soft">{label}</p>
      <p className={`num mt-1 text-base font-semibold leading-tight sm:text-lg ${color}`}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  monthLabel,
  effectiveMonth,
}: {
  monthLabel: string;
  effectiveMonth: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center">
      <p className="font-display text-lg">Let&rsquo;s set things up</p>
      <p className="mb-5 mt-1 text-sm text-ink-soft">
        Add shared envelopes like Market or Subs. Set salaries and allowances on
        their pages. Everything carries forward each month until you change it.
      </p>
      <div className="mx-auto max-w-xl text-left">
        <AddCategory effectiveMonth={effectiveMonth} monthLabel={monthLabel} />
      </div>
    </div>
  );
}
