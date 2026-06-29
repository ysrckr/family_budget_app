import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { installmentPlans, cards } from "@/db/schema";
import {
  formatMoney,
  currentBudgetMonth,
  monthLabel,
  shiftMonth,
  isMonthKey,
} from "@/lib/money";
import { isActiveIn, planEndMonth, paymentsRemaining } from "@/lib/installments";
import { getCutoffDay, getInstallmentBudgetCents } from "@/lib/settings";
import TopBar from "@/components/TopBar";
import MonthSwitcher from "@/components/MonthSwitcher";
import InstallmentForm from "@/components/InstallmentForm";
import DeleteButton from "@/components/DeleteButton";
import EditInstallmentButton from "@/components/EditInstallmentButton";

export const dynamic = "force-dynamic";

export default async function InstallmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const cutoffDay = await getCutoffDay();
  const key = isMonthKey(sp.month) ? sp.month! : currentBudgetMonth(cutoffDay);
  const label = monthLabel(key);

  const [budgetCents, plans, cardList] = await Promise.all([
    getInstallmentBudgetCents(),
    db.select().from(installmentPlans).orderBy(asc(installmentPlans.startMonth)),
    db.select().from(cards).orderBy(asc(cards.label)),
  ]);
  const cardById = new Map(cardList.map((c) => [c.id, c]));

  const active = plans.filter((p) => isActiveIn(p.startMonth, p.months, key));
  const committed = active.reduce((s, p) => s + p.monthlyPaymentCents, 0);
  const left = budgetCents - committed;
  const overCommitted = left < 0;

  return (
    <>
      <TopBar active="/installments" />
      <main className="mx-auto max-w-3xl px-5 pb-28 pt-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Installments
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Monthly installment commitments. These come out of &ldquo;Left to
              spend&rdquo;, and you can see how much installment budget is free.
            </p>
          </div>
          <MonthSwitcher
            basePath="/installments"
            label={label}
            prev={shiftMonth(key, -1)}
            next={shiftMonth(key, 1)}
          />
        </div>

        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 shadow-card sm:block">
            <p className="text-xs uppercase tracking-wider text-ink-soft">Budget</p>
            <p className="num text-base font-semibold leading-tight sm:mt-1 sm:text-lg">
              {formatMoney(budgetCents)}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 shadow-card sm:block">
            <p className="text-xs uppercase tracking-wider text-ink-soft">
              Committed
            </p>
            <p className="num text-base font-semibold leading-tight sm:mt-1 sm:text-lg">
              {formatMoney(committed)}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 shadow-card sm:block">
            <p className="text-xs uppercase tracking-wider text-ink-soft">Left</p>
            <p
              className={`num text-base font-semibold leading-tight sm:mt-1 sm:text-lg ${
                overCommitted ? "text-brick" : "text-teal-dark"
              }`}
            >
              {formatMoney(left)}
            </p>
          </div>
        </section>

        <p className="text-sm text-ink-soft">
          Set the monthly installments budget on the{" "}
          <Link
            href="/budget"
            className="text-teal underline-offset-2 hover:underline"
          >
            Budgets page
          </Link>
          .
        </p>

        <h2 className="mb-3 mt-8 font-display text-xl font-medium">
          Plan a purchase
        </h2>
        <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <InstallmentForm
            remainingCents={left}
            currentMonth={key}
            cards={cardList.map((c) => ({
              id: c.id,
              label: c.label,
              last4: c.last4,
            }))}
          />
        </div>

        <h2 className="mb-3 mt-8 font-display text-xl font-medium">
          Active in {label}
        </h2>
        <div className="rounded-xl border border-line bg-surface shadow-card">
          {active.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-soft">
              No installments running in {label}.
            </p>
          ) : (
            <ul className="divide-y divide-line/60">
              {active.map((p) => {
                const remaining = paymentsRemaining(p.startMonth, p.months, key);
                return (
                  <li key={p.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{p.label}</div>
                      <div className="mt-0.5 text-xs text-ink-soft">
                        {remaining} of {p.months} payments left · ends{" "}
                        {monthLabel(planEndMonth(p.startMonth, p.months))}
                        {p.aprBps ? ` · ${(p.aprBps / 100).toFixed(2)}% APR` : ""}
                        {p.cardId && cardById.get(p.cardId)
                          ? ` · ${cardById.get(p.cardId)!.label}`
                          : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="num font-medium">
                        {formatMoney(p.monthlyPaymentCents)}
                        <span className="text-ink-soft">/mo</span>
                      </div>
                      <div className="mt-1 flex items-center justify-end gap-1">
                        <EditInstallmentButton
                          plan={{
                            id: p.id,
                            label: p.label,
                            principalCents: p.principalCents,
                            aprBps: p.aprBps,
                            months: p.months,
                            monthlyPaymentCents: p.monthlyPaymentCents,
                            startMonth: p.startMonth,
                            cardId: p.cardId,
                          }}
                          cards={cardList.map((c) => ({
                            id: c.id,
                            label: c.label,
                            last4: c.last4,
                          }))}
                          remainingCents={left}
                          currentMonth={key}
                        />
                        <DeleteButton
                          url={`/api/installments?id=${p.id}`}
                          confirm={`Delete the "${p.label}" installment?`}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
