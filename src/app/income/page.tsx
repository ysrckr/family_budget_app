import { desc, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { incomes, salaries, users } from "@/db/schema";
import {
  formatMoney,
  todayISO,
  currentBudgetMonth,
  monthLabel,
} from "@/lib/money";
import { effectiveSalaries } from "@/lib/recurring";
import { getCutoffDay } from "@/lib/settings";
import TopBar from "@/components/TopBar";
import SalaryForm from "@/components/SalaryForm";
import IncomeForm from "@/components/IncomeForm";
import CutoffForm from "@/components/CutoffForm";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function IncomePage() {
  const cutoffDay = await getCutoffDay();
  const key = currentBudgetMonth(cutoffDay);

  const [salaryRows, extra] = await Promise.all([
    db
      .select()
      .from(salaries)
      .orderBy(asc(salaries.person), desc(salaries.effectiveFrom)),
    db
      .select({
        id: incomes.id,
        source: incomes.source,
        amountCents: incomes.amountCents,
        occurredOn: incomes.occurredOn,
        note: incomes.note,
        person: users.name,
      })
      .from(incomes)
      .leftJoin(users, eq(incomes.userId, users.id))
      .orderBy(desc(incomes.occurredOn), desc(incomes.id))
      .limit(200),
  ]);

  const current = effectiveSalaries(salaryRows, key);
  const currentTotal = current.reduce((s, x) => s + x.amountCents, 0);
  const people = [...new Set(salaryRows.map((r) => r.person))];

  return (
    <>
      <TopBar active="/income" />
      <main className="mx-auto max-w-4xl px-5 pb-28 pt-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Income
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Salaries repeat automatically each month. Add anything extra below.
        </p>

        {/* Budget cycle */}
        <section className="mt-6">
          <h2 className="mb-3 font-display text-xl font-medium">Budget cycle</h2>
          <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
            <CutoffForm cutoffDay={cutoffDay} />
          </div>
        </section>

        {/* Salaries */}
        <section className="mt-10">
          <h2 className="mb-3 font-display text-xl font-medium">
            Monthly salaries
          </h2>

          <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
            <SalaryForm currentMonth={key} people={people} />
          </div>

          <div className="mt-4 rounded-xl border border-line bg-surface p-5 shadow-card">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-medium">In effect for {monthLabel(key)}</h3>
              <span className="num font-semibold text-teal-dark">
                {formatMoney(currentTotal)}
              </span>
            </div>
            {current.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">
                No salaries set yet. Add each person above.
              </p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm">
                {current.map((c) => (
                  <li key={c.person} className="flex justify-between">
                    <span>{c.person}</span>
                    <span className="num text-ink-soft">
                      {formatMoney(c.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {salaryRows.length > 0 && (
            <div className="mt-4 rounded-xl border border-line bg-surface shadow-card">
              <ul className="divide-y divide-line/60">
                {salaryRows.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{r.person}</div>
                      <div className="mt-0.5 text-xs text-ink-soft">
                        from {monthLabel(r.effectiveFrom.slice(0, 7))}
                      </div>
                    </div>
                    <span className="num shrink-0 font-medium">
                      {formatMoney(r.amountCents)}
                    </span>
                    <DeleteButton
                      url={`/api/salaries?id=${r.id}`}
                      confirm="Delete this salary entry?"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Extra income */}
        <section className="mt-10">
          <h2 className="mb-3 font-display text-xl font-medium">Other income</h2>
          <p className="mb-3 text-sm text-ink-soft">
            One-off amounts on top of salary — bonuses, freelance, gifts.
          </p>

          <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
            <IncomeForm today={todayISO()} />
          </div>

          <div className="mt-4 rounded-xl border border-line bg-surface shadow-card">
            {extra.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-soft">
                No extra income recorded.
              </p>
            ) : (
              <ul className="divide-y divide-line/60">
                {extra.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{r.source}</div>
                      <div className="mt-0.5 text-xs text-ink-soft">
                        <span className="num">{r.occurredOn}</span>
                        {r.person ? ` · ${r.person}` : ""}
                      </div>
                      {r.note && (
                        <div className="text-xs text-ink-soft">{r.note}</div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="num font-medium text-teal-dark">
                        {formatMoney(r.amountCents)}
                      </div>
                      <div className="mt-1 flex justify-end">
                        <DeleteButton
                          url={`/api/incomes?id=${r.id}`}
                          confirm="Delete this income entry?"
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
