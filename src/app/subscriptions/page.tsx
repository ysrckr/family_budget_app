import { asc } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import {
  formatMoney,
  currentBudgetMonth,
  monthLabel,
  shiftMonth,
  isMonthKey,
} from "@/lib/money";
import {
  monthlyCostCents,
  subActiveIn,
  nextRenewalMonth,
} from "@/lib/subscriptions";
import { getCutoffDay, getSubscriptionBudgetCents } from "@/lib/settings";
import TopBar from "@/components/TopBar";
import MonthSwitcher from "@/components/MonthSwitcher";
import SubscriptionBudgetForm from "@/components/SubscriptionBudgetForm";
import SubscriptionForm from "@/components/SubscriptionForm";
import EditSubscriptionButton from "@/components/EditSubscriptionButton";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const cutoffDay = await getCutoffDay();
  const key = isMonthKey(sp.month) ? sp.month! : currentBudgetMonth(cutoffDay);
  const label = monthLabel(key);

  const [budgetCents, subs] = await Promise.all([
    getSubscriptionBudgetCents(),
    db.select().from(subscriptions).orderBy(asc(subscriptions.label)),
  ]);

  const active = subs.filter((s) => subActiveIn(s.startMonth, key));
  const committed = active.reduce(
    (sum, s) => sum + monthlyCostCents(s.amountCents, s.cycle),
    0
  );
  const left = budgetCents - committed;
  const over = left < 0;

  return (
    <>
      <TopBar active="/subscriptions" />
      <main className="mx-auto max-w-3xl px-5 pb-28 pt-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Subscriptions
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Monthly and yearly subscriptions. Yearly ones are spread across the
              months so you set aside enough to renew — and it all comes out of
              &ldquo;Left to spend&rdquo;.
            </p>
          </div>
          <MonthSwitcher
            basePath="/subscriptions"
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
              Per month
            </p>
            <p className="num text-base font-semibold leading-tight sm:mt-1 sm:text-lg">
              {formatMoney(committed)}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 shadow-card sm:block">
            <p className="text-xs uppercase tracking-wider text-ink-soft">Left</p>
            <p
              className={`num text-base font-semibold leading-tight sm:mt-1 sm:text-lg ${
                over ? "text-brick" : "text-teal-dark"
              }`}
            >
              {formatMoney(left)}
            </p>
          </div>
        </section>

        <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <h2 className="mb-3 font-display text-base font-medium">
            Monthly budget
          </h2>
          <SubscriptionBudgetForm budgetCents={budgetCents} />
        </div>

        <h2 className="mb-3 mt-8 font-display text-xl font-medium">
          Add a subscription
        </h2>
        <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <SubscriptionForm remainingCents={left} currentMonth={key} />
        </div>

        <h2 className="mb-3 mt-8 font-display text-xl font-medium">
          Your subscriptions
        </h2>
        <div className="rounded-xl border border-line bg-surface shadow-card">
          {active.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-soft">
              No subscriptions in {label}.
            </p>
          ) : (
            <ul className="divide-y divide-line/60">
              {active.map((s) => {
                const monthly = monthlyCostCents(s.amountCents, s.cycle);
                const renews = nextRenewalMonth(s.startMonth, s.cycle, key);
                return (
                  <li key={s.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{s.label}</div>
                      <div className="mt-0.5 text-xs text-ink-soft">
                        {s.cycle === "yearly"
                          ? `${formatMoney(s.amountCents)}/yr${
                              renews ? ` · renews ${monthLabel(renews)}` : ""
                            }`
                          : "Monthly"}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="num font-medium">
                        {formatMoney(monthly)}
                        <span className="text-ink-soft">/mo</span>
                      </div>
                      <div className="mt-1 flex items-center justify-end gap-1">
                        <EditSubscriptionButton
                          sub={{
                            id: s.id,
                            label: s.label,
                            amountCents: s.amountCents,
                            cycle: s.cycle,
                            startMonth: s.startMonth,
                          }}
                          remainingCents={left}
                          currentMonth={key}
                        />
                        <DeleteButton
                          url={`/api/subscriptions?id=${s.id}`}
                          confirm={`Delete the "${s.label}" subscription?`}
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
