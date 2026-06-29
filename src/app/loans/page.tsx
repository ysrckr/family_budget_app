import { asc, desc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { loans, loanSchedules, loanPayments } from "@/db/schema";
import {
  formatMoney,
  currentBudgetMonth,
  monthLabel,
  shiftMonth,
  isMonthKey,
} from "@/lib/money";
import { effectiveLoanPayments } from "@/lib/recurring";
import { loanRemaining, payoffProgress, estimateEtaMonths } from "@/lib/loans";
import { getCutoffDay } from "@/lib/settings";
import TopBar from "@/components/TopBar";
import MonthSwitcher from "@/components/MonthSwitcher";
import AddLoan from "@/components/AddLoan";
import LoanPaymentForm from "@/components/LoanPaymentForm";
import LoanScheduleForm from "@/components/LoanScheduleForm";
import DeleteButton from "@/components/DeleteButton";
import ActionButton from "@/components/ActionButton";
import EditLoanPaymentButton from "@/components/EditLoanPaymentButton";
import EditLoanButton from "@/components/EditLoanButton";

export const dynamic = "force-dynamic";

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const cutoffDay = await getCutoffDay();
  const key = isMonthKey(sp.month) ? sp.month! : currentBudgetMonth(cutoffDay);
  const label = monthLabel(key);

  const [loanRows, schedules, payments] = await Promise.all([
    db.select().from(loans).where(isNull(loans.archivedAt)).orderBy(asc(loans.name)),
    db.select().from(loanSchedules),
    db.select().from(loanPayments).orderBy(desc(loanPayments.paidOn), desc(loanPayments.id)),
  ]);

  const scheduledThisMonth = effectiveLoanPayments(schedules, key);
  const paymentsByLoan = new Map<number, typeof payments>();
  for (const p of payments) {
    const arr = paymentsByLoan.get(p.loanId) ?? [];
    arr.push(p);
    paymentsByLoan.set(p.loanId, arr);
  }

  const enriched = loanRows.map((l) => {
    const pays = paymentsByLoan.get(l.id) ?? [];
    const remaining = loanRemaining(l.openingBalanceCents, pays);
    const scheduled = scheduledThisMonth.get(l.id) ?? 0;
    const paidThisMonth = pays
      .filter((p) => p.paidOn.slice(0, 7) === key)
      .reduce((s, p) => s + p.amountCents, 0);
    const dueNow = Math.max(0, scheduled - paidThisMonth);
    return { loan: l, pays, remaining, scheduled, paidThisMonth, dueNow };
  });

  const totalOwed = enriched.reduce((s, e) => s + e.remaining, 0);
  const dueThisMonth = enriched.reduce((s, e) => s + e.scheduled, 0);

  return (
    <>
      <TopBar active="/loans" />
      <main className="mx-auto max-w-3xl px-5 pb-28 pt-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Loans
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Paid outside your budget — tracked here, never counted in &ldquo;Left
              to spend&rdquo;.
            </p>
          </div>
          <MonthSwitcher
            basePath="/loans"
            label={label}
            prev={shiftMonth(key, -1)}
            next={shiftMonth(key, 1)}
          />
        </div>

        <section className="mb-6 grid grid-cols-2 gap-3">
          <div className="min-w-0 rounded-xl border border-line bg-surface p-4 shadow-card">
            <p className="text-xs uppercase tracking-wider text-ink-soft">
              Total still owed
            </p>
            <p className="num mt-1 text-base font-semibold leading-tight sm:text-lg">
              {formatMoney(totalOwed)}
            </p>
          </div>
          <div className="min-w-0 rounded-xl border border-line bg-surface p-4 shadow-card">
            <p className="text-xs uppercase tracking-wider text-ink-soft">
              Due in {label}
            </p>
            <p className="num mt-1 text-base font-semibold leading-tight sm:text-lg">
              {formatMoney(dueThisMonth)}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">outside the budget</p>
          </div>
        </section>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-medium">Your loans</h2>
          <AddLoan currentMonth={key} />
        </div>

        {enriched.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-surface px-5 py-6 text-sm text-ink-soft">
            No loans yet — add one above (e.g. Car loan, Mortgage).
          </p>
        ) : (
          <div className="grid gap-4">
            {enriched.map(({ loan: l, pays, remaining, scheduled, paidThisMonth, dueNow }) => {
              const pct = payoffProgress(l.originalPrincipalCents, remaining);
              const eta = estimateEtaMonths(remaining, scheduled);
              const monthPays = pays.filter((p) => p.paidOn.slice(0, 7) === key);
              return (
                <article
                  key={l.id}
                  className="envelope rounded-xl border border-line p-5 shadow-card"
                >
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-lg font-medium">{l.name}</h3>
                    <span className="num text-sm text-ink-soft">
                      {formatMoney(remaining)}
                      <span className="text-ink-soft/60">
                        {" "}
                        / {formatMoney(l.originalPrincipalCents)}
                      </span>
                    </span>
                  </div>
                  <div className="meter mb-2">
                    <span className="bg-teal" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-ink-soft">
                      {pct}% paid off
                      {eta != null && remaining > 0 ? ` · ~${eta} mo left` : ""}
                    </span>
                    <span
                      className={
                        scheduled > 0 && dueNow === 0
                          ? "text-teal-dark"
                          : "text-ink-soft"
                      }
                    >
                      {scheduled > 0
                        ? dueNow === 0
                          ? `Paid ${formatMoney(paidThisMonth)} in ${label}`
                          : `Scheduled ${formatMoney(scheduled)} · ${formatMoney(
                              dueNow
                            )} due`
                        : "No scheduled payment"}
                    </span>
                  </div>

                  {dueNow > 0 && (
                    <ActionButton
                      url="/api/loans/payments"
                      method="POST"
                      body={{ loanId: l.id, amount: dueNow / 100 }}
                      label={`Mark ${formatMoney(dueNow)} paid`}
                      busyLabel="Saving…"
                      className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
                    />
                  )}

                  <details className="mt-3 border-t border-line/60 pt-3 text-sm">
                    <summary className="cursor-pointer text-ink-soft">
                      Payments &amp; schedule
                    </summary>
                    <div className="mt-3 grid gap-5">
                      <div className="grid gap-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">
                          Record a payment
                        </p>
                        <LoanPaymentForm
                          loanId={l.id}
                          defaultAmount={scheduled > 0 ? String(scheduled / 100) : ""}
                        />
                      </div>

                      <div className="grid gap-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">
                          Change monthly amount
                        </p>
                        <LoanScheduleForm loanId={l.id} currentMonth={key} />
                      </div>

                      {monthPays.length > 0 && (
                        <div className="grid gap-2">
                          <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">
                            Payments in {label}
                          </p>
                          <ul className="divide-y divide-line/60">
                            {monthPays.map((p) => (
                              <li
                                key={p.id}
                                className="flex items-center justify-between gap-3 py-2"
                              >
                                <span className="num text-ink-soft">
                                  {p.paidOn}
                                  {p.note ? ` · ${p.note}` : ""}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="num font-medium">
                                    {formatMoney(p.amountCents)}
                                  </span>
                                  <EditLoanPaymentButton
                                    loanId={l.id}
                                    payment={{
                                      id: p.id,
                                      amountCents: p.amountCents,
                                      paidOn: p.paidOn,
                                      note: p.note,
                                    }}
                                  />
                                  <DeleteButton
                                    url={`/api/loans/payments?id=${p.id}`}
                                    confirm="Delete this payment?"
                                  />
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
                        <EditLoanButton
                          loan={{
                            id: l.id,
                            name: l.name,
                            originalPrincipalCents: l.originalPrincipalCents,
                            openingBalanceCents: l.openingBalanceCents,
                            startMonth: l.startMonth,
                            termMonths: l.termMonths,
                          }}
                        />
                        <ActionButton
                          url="/api/loans"
                          method="PATCH"
                          body={{ id: l.id, archived: true }}
                          label="Archive loan"
                          removesRow
                          className="inline-flex min-h-[40px] items-center rounded-md px-3 py-2 text-sm text-ink-soft hover:bg-paper hover:text-ink"
                        />
                        <DeleteButton
                          url={`/api/loans?id=${l.id}`}
                          confirm={`Delete "${l.name}" and all its payments? This can't be undone.`}
                        />
                      </div>
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
