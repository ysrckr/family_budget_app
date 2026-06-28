import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories, budgets, salaries } from "@/db/schema";
import {
  formatMoney,
  currentBudgetMonth,
  monthLabel,
  shiftMonth,
  isMonthKey,
} from "@/lib/money";
import { effectiveBudgets } from "@/lib/recurring";
import { getCutoffDay } from "@/lib/settings";
import TopBar from "@/components/TopBar";
import MonthSwitcher from "@/components/MonthSwitcher";
import { CategoryForm, BudgetEditor } from "@/components/CategoryForm";
import AllowanceForm from "@/components/AllowanceForm";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const cutoffDay = await getCutoffDay();
  const key = isMonthKey(sp.month) ? sp.month! : currentBudgetMonth(cutoffDay);
  const label = monthLabel(key);

  const [cats, budgetRows, salaryRows] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.name)),
    db.select().from(budgets),
    db.select().from(salaries),
  ]);

  const eff = effectiveBudgets(budgetRows, key);
  const shared = cats.filter((c) => c.kind === "shared");
  const allowances = cats.filter((c) => c.kind === "allowance");
  const sharedTotal = shared.reduce((s, c) => s + (eff.get(c.id) ?? 0), 0);

  const people = [
    ...new Set([
      ...salaryRows.map((r) => r.person),
      ...allowances.map((a) => a.owner ?? ""),
    ]),
  ].filter(Boolean);

  return (
    <>
      <TopBar active="/budget" />
      <main className="mx-auto max-w-3xl px-5 pb-28 pt-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Budgets
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Amounts in effect for {label}. Set once and they carry into every
              later month.
            </p>
          </div>
          <MonthSwitcher
            basePath="/budget"
            label={label}
            prev={shiftMonth(key, -1)}
            next={shiftMonth(key, 1)}
          />
        </div>

        {/* Shared envelopes */}
        <h2 className="mb-3 font-display text-xl font-medium">Shared envelopes</h2>
        <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <CategoryForm effectiveMonth={key} monthLabel={label} />
        </div>

        <div className="mt-4 rounded-xl border border-line bg-surface shadow-card">
          {shared.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-soft">
              No shared categories yet. Add Market, Subs, Rent above.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-line/60">
                {shared.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {c.name}
                    </span>
                    <BudgetEditor
                      categoryId={c.id}
                      amountCents={eff.get(c.id) ?? 0}
                      effectiveMonth={key}
                      monthLabel={label}
                    />
                    <DeleteButton
                      url={`/api/categories?id=${c.id}`}
                      confirm={`Delete "${c.name}" and all its spending?`}
                    />
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-line px-4 py-3">
                <span className="text-xs uppercase tracking-wider text-ink-soft">
                  Total
                </span>
                <span className="num font-semibold">
                  {formatMoney(sharedTotal)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Allowances */}
        <h2 className="mb-3 mt-10 font-display text-xl font-medium">
          Allowances
        </h2>
        <p className="mb-3 text-sm text-ink-soft">
          Personal spending money per person, on top of the shared budget.
        </p>
        <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <AllowanceForm effectiveMonth={key} monthLabel={label} people={people} />
        </div>

        {allowances.length > 0 && (
          <div className="mt-4 rounded-xl border border-line bg-surface shadow-card">
            <ul className="divide-y divide-line/60">
              {allowances.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {c.owner}
                  </span>
                  <BudgetEditor
                    categoryId={c.id}
                    amountCents={eff.get(c.id) ?? 0}
                    effectiveMonth={key}
                    monthLabel={label}
                  />
                  <DeleteButton
                    url={`/api/allowances?id=${c.id}`}
                    confirm={`Remove ${c.owner}'s allowance and its spending?`}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-4 text-xs text-ink-soft">
          Tip: tap any amount to change it. New amounts apply from {label}{" "}
          forward — earlier months keep what they had.
        </p>
      </main>
    </>
  );
}
