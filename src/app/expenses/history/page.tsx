import Link from "next/link";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  expenses,
  categories,
  cards,
  fixedCosts,
  installmentPlans,
  subscriptions,
  savingsTxns,
  savingsPots,
  recurringSavings,
} from "@/db/schema";
import {
  formatMoney,
  currentBudgetMonth,
  monthLabel,
  shiftMonth,
  isMonthKey,
  APP_CURRENCY,
} from "@/lib/money";
import { getCutoffDay } from "@/lib/settings";
import { effectiveFixedCosts } from "@/lib/recurring";
import { isActiveIn } from "@/lib/installments";
import { monthlyCostCents, subActiveIn } from "@/lib/subscriptions";
import { recurringActiveIn } from "@/lib/savings";
import TopBar from "@/components/TopBar";
import MonthSwitcher from "@/components/MonthSwitcher";
import DeleteButton from "@/components/DeleteButton";
import ReceiptLink from "@/components/ReceiptLink";
import EditExpenseButton from "@/components/EditExpenseButton";

export const dynamic = "force-dynamic";

type OutKind = "expense" | "fixed" | "installment" | "subscription" | "saving";

const PILL_BASE =
  "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide";

const TAG: Record<OutKind, { label: string; cls: string }> = {
  expense: { label: "Spending", cls: "bg-paper text-ink-soft" },
  fixed: { label: "Fixed", cls: "bg-amber-tint text-amber" },
  installment: { label: "Installment", cls: "bg-[#eef2ff] text-[#4338ca]" },
  subscription: { label: "Subscription", cls: "bg-[#f5ecff] text-[#7c3aed]" },
  saving: { label: "Saving", cls: "bg-teal-tint text-teal-dark" },
};

function Tag({ kind }: { kind: OutKind }) {
  const t = TAG[kind];
  return <span className={`${PILL_BASE} ${t.cls}`}>{t.label}</span>;
}

export default async function SpendingHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const cutoffDay = await getCutoffDay();
  const key = isMonthKey(sp.month) ? sp.month! : currentBudgetMonth(cutoffDay);
  const label = monthLabel(key);
  const categoryId = sp.category ? Number(sp.category) : undefined;
  // The unified "everything out of budget" view only applies when not filtered
  // to a single envelope/person (those non-expense outflows aren't categorised).
  const showAll = !categoryId;

  const inMonth = sql`coalesce(${expenses.billingMonth}, to_char(${expenses.occurredOn}, 'YYYY-MM')) = ${key}`;
  const where = categoryId
    ? and(inMonth, eq(expenses.categoryId, categoryId))
    : inMonth;

  const [
    rows,
    cats,
    cardList,
    fixedRows,
    planRows,
    subRows,
    savingTxnRows,
    recurringRows,
  ] = await Promise.all([
    db
      .select({
        id: expenses.id,
        categoryId: expenses.categoryId,
        payee: expenses.payee,
        amountCents: expenses.amountCents,
        description: expenses.description,
        occurredOn: expenses.occurredOn,
        receiptKey: expenses.receiptKey,
        paymentMethod: expenses.paymentMethod,
        cardId: expenses.cardId,
        category: categories.name,
        cardLabel: cards.label,
        cardLast4: cards.last4,
      })
      .from(expenses)
      .leftJoin(categories, eq(expenses.categoryId, categories.id))
      .leftJoin(cards, eq(expenses.cardId, cards.id))
      .where(where)
      .orderBy(desc(expenses.occurredOn), desc(expenses.id)),
    db
      .select({
        id: categories.id,
        name: categories.name,
        kind: categories.kind,
        owner: categories.owner,
      })
      .from(categories)
      .orderBy(asc(categories.name)),
    db.select().from(cards).orderBy(asc(cards.label)),
    db
      .select()
      .from(fixedCosts)
      .orderBy(asc(fixedCosts.label), desc(fixedCosts.effectiveFrom)),
    db.select().from(installmentPlans),
    db.select().from(subscriptions),
    db
      .select({
        id: savingsTxns.id,
        amountCents: savingsTxns.amountCents,
        occurredOn: savingsTxns.occurredOn,
        potName: savingsPots.name,
      })
      .from(savingsTxns)
      .leftJoin(savingsPots, eq(savingsTxns.potId, savingsPots.id))
      // App-currency pots only — mirrors the Overview's savedInBudget so the
      // total reconciles and foreign cents aren't mixed into the app total.
      .where(
        and(
          eq(savingsTxns.inBudget, true),
          eq(savingsTxns.txnType, "deposit"),
          eq(savingsTxns.billingMonth, key),
          eq(savingsPots.currency, APP_CURRENCY)
        )
      )
      .orderBy(desc(savingsTxns.occurredOn)),
    db
      .select({
        amountCents: recurringSavings.amountCents,
        startMonth: recurringSavings.startMonth,
        potName: savingsPots.name,
      })
      .from(recurringSavings)
      .leftJoin(savingsPots, eq(recurringSavings.potId, savingsPots.id))
      .where(
        and(
          eq(recurringSavings.inBudget, true),
          eq(savingsPots.currency, APP_CURRENCY)
        )
      ),
  ]);

  // Optional filter: a single envelope/person's spending (derived from cats).
  const cat = categoryId ? cats.find((c) => c.id === categoryId) : null;
  const catTitle = cat
    ? cat.kind === "allowance"
      ? `${cat.owner ?? "—"}’s allowance`
      : cat.name
    : null;
  const sharedCategories = cats
    .filter((c) => c.kind === "shared")
    .map((c) => ({ id: c.id, name: c.name }));
  const allowanceCategories = cats
    .filter((c) => c.kind === "allowance")
    .map((c) => ({ id: c.id, owner: c.owner ?? "—" }));

  // Recurring monthly commitments (no specific day) — shown first, read-only.
  const monthlyRows: { kind: OutKind; label: string; sub: string; amountCents: number }[] =
    [];
  if (showAll) {
    for (const f of effectiveFixedCosts(fixedRows, key)) {
      monthlyRows.push({
        kind: "fixed",
        label: f.label,
        sub: "Fixed monthly cost",
        amountCents: f.amountCents,
      });
    }
    for (const p of planRows) {
      if (isActiveIn(p.startMonth, p.months, key)) {
        monthlyRows.push({
          kind: "installment",
          label: p.label,
          sub: "Monthly installment",
          amountCents: p.monthlyPaymentCents,
        });
      }
    }
    for (const s of subRows) {
      if (subActiveIn(s.startMonth, key)) {
        monthlyRows.push({
          kind: "subscription",
          label: s.label,
          sub:
            s.cycle === "yearly"
              ? "Yearly subscription (set aside)"
              : "Monthly subscription",
          amountCents: monthlyCostCents(s.amountCents, s.cycle),
        });
      }
    }
    for (const r of recurringRows) {
      if (recurringActiveIn(r.startMonth, key)) {
        monthlyRows.push({
          kind: "saving",
          label: r.potName ?? "Savings",
          sub: "Recurring saving (from budget)",
          amountCents: r.amountCents,
        });
      }
    }
  }

  // Dated entries: expenses + one-off in-budget savings, newest first.
  type Dated =
    | { kind: "expense"; date: string; amountCents: number; exp: (typeof rows)[number] }
    | { kind: "saving"; id: number; date: string; amountCents: number; label: string };
  const dated: Dated[] = [
    ...rows.map(
      (r): Dated => ({
        kind: "expense",
        date: r.occurredOn,
        amountCents: r.amountCents,
        exp: r,
      })
    ),
    ...(showAll
      ? savingTxnRows.map(
          (t): Dated => ({
            kind: "saving",
            id: t.id,
            date: t.occurredOn,
            amountCents: t.amountCents,
            label: t.potName ?? "Savings",
          })
        )
      : []),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const monthlyTotal = monthlyRows.reduce((s, r) => s + r.amountCents, 0);
  const datedTotal = dated.reduce((s, r) => s + r.amountCents, 0);
  const total = monthlyTotal + datedTotal;
  const nothing = monthlyRows.length === 0 && dated.length === 0;

  const navQuery: Record<string, string> = categoryId
    ? { category: String(categoryId) }
    : {};
  const addHref = categoryId
    ? `/expenses?category=${categoryId}&month=${key}`
    : "/expenses";

  return (
    <>
      <TopBar active="/expenses" />
      <main className="mx-auto max-w-4xl px-5 pb-28 pt-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {catTitle ?? "Out of budget"}
            </h1>
            <p className="text-sm text-ink-soft">
              {catTitle
                ? "Spending history"
                : "Everything that comes out of this month’s budget"}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4 text-sm">
              <Link
                href={addHref}
                className="text-teal underline-offset-2 hover:underline"
              >
                ← Add spending
              </Link>
              {catTitle && (
                <Link
                  href={`/expenses/history?month=${key}`}
                  className="text-ink-soft underline-offset-2 hover:underline"
                >
                  All spending
                </Link>
              )}
            </div>
          </div>
          <MonthSwitcher
            basePath="/expenses/history"
            label={label}
            prev={shiftMonth(key, -1)}
            next={shiftMonth(key, 1)}
            query={navQuery}
          />
        </div>

        <div className="rounded-xl border border-line bg-surface shadow-card">
          {nothing ? (
            <p className="px-4 py-8 text-center text-sm text-ink-soft">
              Nothing out of {label}’s budget yet.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-line/60">
                {/* Recurring monthly commitments (read-only; managed elsewhere) */}
                {monthlyRows.map((m, i) => (
                  <li
                    key={`m${i}`}
                    className="flex items-start gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="font-medium">{m.label}</span>
                        <Tag kind={m.kind} />
                      </div>
                      <div className="mt-0.5 text-xs text-ink-soft">{m.sub}</div>
                    </div>
                    <div className="num shrink-0 font-medium">
                      {formatMoney(m.amountCents)}
                    </div>
                  </li>
                ))}

                {/* Dated entries: expenses (editable) + one-off in-budget savings */}
                {dated.map((d) => {
                  if (d.kind === "saving") {
                    return (
                      <li
                        key={`s${d.id}`}
                        className="flex items-start gap-3 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2">
                            <span className="font-medium">{d.label}</span>
                            <Tag kind="saving" />
                          </div>
                          <div className="mt-0.5 text-xs text-ink-soft">
                            <span className="num">{d.date}</span> · Saved from
                            budget
                          </div>
                        </div>
                        <div className="num shrink-0 font-medium">
                          {formatMoney(d.amountCents)}
                        </div>
                      </li>
                    );
                  }
                  const r = d.exp;
                  const paidWith =
                    r.paymentMethod === "card"
                      ? r.cardLabel
                        ? `${r.cardLabel}${
                            r.cardLast4 ? ` ••${r.cardLast4}` : ""
                          }`
                        : "Card"
                      : "Cash";
                  const rolledIn = r.occurredOn.slice(0, 7) !== key;
                  return (
                    <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2">
                          <span className="font-medium">{r.payee}</span>
                          <Tag kind="expense" />
                          {rolledIn && (
                            <span
                              className={`${PILL_BASE} bg-amber-tint text-amber`}
                              title="Purchased before this month, after the card's cut date"
                              aria-label="Rolled in: purchased before this month, after the card's cut date"
                            >
                              rolled
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-ink-soft">
                          <span className="num">{r.occurredOn}</span> ·{" "}
                          {r.category ?? "—"} · {paidWith}
                        </div>
                        {r.description && (
                          <div className="text-xs text-ink-soft">
                            {r.description}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="num font-medium">
                          {formatMoney(r.amountCents)}
                        </div>
                        <div className="mt-1 flex items-center justify-end gap-3">
                          {r.receiptKey && (
                            <ReceiptLink receiptKey={r.receiptKey} />
                          )}
                          <EditExpenseButton
                            expense={{
                              id: r.id,
                              categoryId: r.categoryId,
                              payee: r.payee,
                              amountCents: r.amountCents,
                              occurredOn: r.occurredOn,
                              paymentMethod: r.paymentMethod,
                              cardId: r.cardId,
                              description: r.description,
                            }}
                            sharedCategories={sharedCategories}
                            allowanceCategories={allowanceCategories}
                            cards={cardList}
                            cutoffDay={cutoffDay}
                          />
                          <DeleteButton
                            url={`/api/expenses?id=${r.id}`}
                            confirm="Delete this spending entry?"
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
                <span className="text-xs uppercase tracking-wider text-ink-soft">
                  {catTitle ? `Total billed to ${label}` : `Total out of budget in ${label}`}
                </span>
                <span className="num font-semibold">{formatMoney(total)}</span>
              </div>
            </>
          )}
        </div>

        {showAll && !nothing && (
          <p className="mt-3 px-1 text-xs text-ink-soft">
            Fixed costs, installments, subscriptions and recurring savings are
            managed on their own pages — they show here so you can see everything
            leaving this month’s budget in one place.
          </p>
        )}
      </main>
    </>
  );
}
