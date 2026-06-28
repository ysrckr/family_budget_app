import { asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { savingsPots, savingsTxns } from "@/db/schema";
import {
  formatMoney,
  currentBudgetMonth,
  monthLabel,
  shiftMonth,
  isMonthKey,
} from "@/lib/money";
import { potBalance, goalProgress, depositSplit } from "@/lib/savings";
import { getCutoffDay } from "@/lib/settings";
import TopBar from "@/components/TopBar";
import MonthSwitcher from "@/components/MonthSwitcher";
import SavingsForm from "@/components/SavingsForm";
import AddPot from "@/components/AddPot";
import DeleteButton from "@/components/DeleteButton";
import ActionButton from "@/components/ActionButton";

export const dynamic = "force-dynamic";

type TxnRow = {
  id: number;
  potId: number;
  potName: string | null;
  txnType: string;
  amountCents: number;
  inBudget: boolean;
  occurredOn: string;
  billingMonth: string | null;
  note: string | null;
};

// Which month a savings txn belongs to: in-budget deposits follow their
// cutoff-aware billing month; everything else is its calendar month.
function monthOf(t: TxnRow): string {
  return t.inBudget && t.billingMonth ? t.billingMonth : t.occurredOn.slice(0, 7);
}

export default async function SavingsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const cutoffDay = await getCutoffDay();
  const key = isMonthKey(sp.month) ? sp.month! : currentBudgetMonth(cutoffDay);
  const label = monthLabel(key);

  const [pots, txns] = await Promise.all([
    db
      .select()
      .from(savingsPots)
      .where(isNull(savingsPots.archivedAt))
      .orderBy(asc(savingsPots.name)),
    db
      .select({
        id: savingsTxns.id,
        potId: savingsTxns.potId,
        potName: savingsPots.name,
        txnType: savingsTxns.txnType,
        amountCents: savingsTxns.amountCents,
        inBudget: savingsTxns.inBudget,
        occurredOn: savingsTxns.occurredOn,
        billingMonth: savingsTxns.billingMonth,
        note: savingsTxns.note,
      })
      .from(savingsTxns)
      .leftJoin(savingsPots, eq(savingsTxns.potId, savingsPots.id))
      .orderBy(desc(savingsTxns.occurredOn), desc(savingsTxns.id))
      .limit(500),
  ]);

  // Lifetime balance per pot (all txns).
  const balanceByPot = new Map<number, number>();
  for (const t of txns) {
    balanceByPot.set(
      t.potId,
      (balanceByPot.get(t.potId) ?? 0) +
        (t.txnType === "withdrawal" ? -t.amountCents : t.amountCents)
    );
  }
  const totalSaved = pots.reduce((s, p) => s + (balanceByPot.get(p.id) ?? 0), 0);

  // This month's activity (by the same month rule).
  const monthTxns = txns.filter((t) => monthOf(t) === key);
  const { fromBudget, outside } = depositSplit(monthTxns);

  return (
    <>
      <TopBar active="/savings" />
      <main className="mx-auto max-w-3xl px-5 pb-28 pt-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Savings
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Pots you put money aside in. &ldquo;From budget&rdquo; deposits
              reduce that month&rsquo;s Left to spend.
            </p>
          </div>
          <MonthSwitcher
            basePath="/savings"
            label={label}
            prev={shiftMonth(key, -1)}
            next={shiftMonth(key, 1)}
          />
        </div>

        <section className="mb-6 grid grid-cols-2 gap-3">
          <div className="min-w-0 rounded-xl border border-line bg-surface p-4 shadow-card">
            <p className="text-xs uppercase tracking-wider text-ink-soft">
              Total saved
            </p>
            <p className="num mt-1 text-base font-semibold leading-tight text-teal-dark sm:text-lg">
              {formatMoney(totalSaved)}
            </p>
          </div>
          <div className="min-w-0 rounded-xl border border-line bg-surface p-4 shadow-card">
            <p className="text-xs uppercase tracking-wider text-ink-soft">
              Saved in {label}
            </p>
            <p className="num mt-1 text-base font-semibold leading-tight sm:text-lg">
              {formatMoney(fromBudget + outside)}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {formatMoney(fromBudget)} from budget · {formatMoney(outside)}{" "}
              outside
            </p>
          </div>
        </section>

        <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <SavingsForm
            pots={pots.map((p) => ({ id: p.id, name: p.name }))}
            cutoffDay={cutoffDay}
          />
        </div>

        <div className="mb-4 mt-8 flex items-center justify-between">
          <h2 className="font-display text-xl font-medium">Pots</h2>
          <AddPot />
        </div>

        {pots.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-surface px-5 py-6 text-sm text-ink-soft">
            No pots yet — add one above (e.g. Emergency fund, Japan trip).
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {pots.map((p) => {
              const bal = balanceByPot.get(p.id) ?? 0;
              const pct = goalProgress(bal, p.targetCents);
              return (
                <article
                  key={p.id}
                  className="envelope rounded-xl border border-line p-5 shadow-card"
                >
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-lg font-medium">{p.name}</h3>
                    <span className="num text-sm text-ink-soft">
                      {formatMoney(bal)}
                      {p.targetCents != null && (
                        <span className="text-ink-soft/60">
                          {" "}
                          / {formatMoney(p.targetCents)}
                        </span>
                      )}
                    </span>
                  </div>
                  {pct != null && (
                    <div className="meter mb-3">
                      <span className="bg-teal" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-soft">
                      {pct != null ? `${pct}% of goal` : "Open-ended pot"}
                    </span>
                    <span className="flex items-center gap-3">
                      <ActionButton
                        url="/api/savings/pots"
                        method="PATCH"
                        body={{ id: p.id, archived: true }}
                        label="Archive"
                        busyLabel="…"
                        className="text-ink-soft underline-offset-2 hover:text-ink hover:underline"
                      />
                      <DeleteButton
                        url={`/api/savings/pots?id=${p.id}`}
                        confirm={`Delete "${p.name}" and all its history? This can't be undone (it won't change any past budget month).`}
                      />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* This month's ledger */}
        <h2 className="mb-3 mt-8 font-display text-xl font-medium">
          Activity in {label}
        </h2>
        <div className="rounded-xl border border-line bg-surface shadow-card">
          {monthTxns.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-soft">
              No savings activity in {label}.
            </p>
          ) : (
            <ul className="divide-y divide-line/60">
              {monthTxns.map((t) => {
                const withdrawal = t.txnType === "withdrawal";
                return (
                  <li key={t.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{t.potName ?? "—"}</div>
                      <div className="mt-0.5 text-xs text-ink-soft">
                        <span className="num">{t.occurredOn}</span> ·{" "}
                        {withdrawal
                          ? "Withdrawal"
                          : t.inBudget
                          ? "Deposit · from budget"
                          : "Deposit · outside"}
                        {t.note ? ` · ${t.note}` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div
                        className={`num font-medium ${
                          withdrawal ? "text-brick" : "text-teal-dark"
                        }`}
                      >
                        {withdrawal ? "−" : "+"}
                        {formatMoney(t.amountCents)}
                      </div>
                      <div className="mt-1 flex justify-end">
                        <DeleteButton
                          url={`/api/savings/txns?id=${t.id}`}
                          confirm="Delete this savings entry?"
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
