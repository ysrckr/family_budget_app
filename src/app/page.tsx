import Link from "next/link";
import { and, gte, lt, asc, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  budgets,
  salaries,
  incomes,
  expenses,
} from "@/db/schema";
import {
  formatMoney,
  monthKey,
  monthRange,
  monthLabel,
  shiftMonth,
  isMonthKey,
} from "@/lib/money";
import { effectiveBudgets, totalSalary } from "@/lib/recurring";
import TopBar from "@/components/TopBar";
import MonthSwitcher from "@/components/MonthSwitcher";
import SpendingChart from "@/components/SpendingChart";
import RemainingToggle from "@/components/RemainingToggle";
import AddCategory from "@/components/AddCategory";

export const dynamic = "force-dynamic";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const key = isMonthKey(sp.month) ? sp.month! : monthKey();
  const { start, end } = monthRange(key);

  const [cats, budgetRows, salaryRows, monthIncomes, monthExpenses] =
    await Promise.all([
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
  const totalBudget = cats.reduce((s, c) => s + (effBudgets.get(c.id) ?? 0), 0);
  const totalSpent = monthExpenses.reduce((s, e) => s + e.amountCents, 0);
  const left = totalIncome - totalSpent;
  const nothingSetUp = sharedItems.length === 0 && allowanceItems.length === 0;

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

        {nothingSetUp ? (
          <EmptyState monthLabel={monthLabel(key)} effectiveMonth={key} />
        ) : (
          <div className="grid gap-8">
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
                      href={`/expenses?category=${i.id}&month=${key}`}
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
                      href={`/expenses?category=${i.id}&month=${key}`}
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

function EnvelopeCard({
  title,
  budgetCents,
  spentCents,
  href,
}: {
  title: string;
  budgetCents: number;
  spentCents: number;
  href: string;
}) {
  const pct =
    budgetCents > 0
      ? Math.min((spentCents / budgetCents) * 100, 100)
      : spentCents > 0
      ? 100
      : 0;
  const over = spentCents > budgetCents && budgetCents > 0;
  const close = !over && pct >= 80;
  const fill = over ? "bg-brick" : close ? "bg-amber" : "bg-teal";

  return (
    <article className="envelope rounded-xl border border-line p-5 shadow-card">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-medium">{title}</h3>
        <span className="num text-sm text-ink-soft">
          {formatMoney(spentCents)}
          <span className="text-ink-soft/60"> / {formatMoney(budgetCents)}</span>
        </span>
      </div>
      <div className="meter mb-3">
        <span className={fill} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <RemainingToggle budgetCents={budgetCents} spentCents={spentCents} />
        <Link
          href={href}
          className="text-sm text-teal underline-offset-2 hover:underline"
        >
          Add spending →
        </Link>
      </div>
    </article>
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
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <p className="text-xs uppercase tracking-wider text-ink-soft">{label}</p>
      <p className={`num mt-1 text-base font-semibold leading-tight sm:text-xl ${color}`}>
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
