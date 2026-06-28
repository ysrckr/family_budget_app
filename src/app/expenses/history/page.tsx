import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { expenses, categories, cards } from "@/db/schema";
import {
  formatMoney,
  currentBudgetMonth,
  monthLabel,
  shiftMonth,
  isMonthKey,
} from "@/lib/money";
import { getCutoffDay } from "@/lib/settings";
import TopBar from "@/components/TopBar";
import MonthSwitcher from "@/components/MonthSwitcher";
import DeleteButton from "@/components/DeleteButton";
import ReceiptLink from "@/components/ReceiptLink";

export const dynamic = "force-dynamic";

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

  // Optional filter: a single envelope/person's spending.
  const cat = categoryId
    ? (
        await db
          .select({ name: categories.name, kind: categories.kind, owner: categories.owner })
          .from(categories)
          .where(eq(categories.id, categoryId))
      )[0]
    : null;
  const catTitle = cat
    ? cat.kind === "allowance"
      ? `${cat.owner ?? "—"}’s allowance`
      : cat.name
    : null;

  const inMonth = sql`coalesce(${expenses.billingMonth}, to_char(${expenses.occurredOn}, 'YYYY-MM')) = ${key}`;
  const where = categoryId
    ? and(inMonth, eq(expenses.categoryId, categoryId))
    : inMonth;

  const rows = await db
    .select({
      id: expenses.id,
      payee: expenses.payee,
      amountCents: expenses.amountCents,
      description: expenses.description,
      occurredOn: expenses.occurredOn,
      receiptKey: expenses.receiptKey,
      paymentMethod: expenses.paymentMethod,
      category: categories.name,
      cardLabel: cards.label,
      cardLast4: cards.last4,
    })
    .from(expenses)
    .leftJoin(categories, eq(expenses.categoryId, categories.id))
    .leftJoin(cards, eq(expenses.cardId, cards.id))
    .where(where)
    .orderBy(desc(expenses.occurredOn), desc(expenses.id));

  const total = rows.reduce((s, r) => s + r.amountCents, 0);
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
              {catTitle ?? "Spending history"}
            </h1>
            {catTitle && (
              <p className="text-sm text-ink-soft">Spending history</p>
            )}
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
          {rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-soft">
              Nothing billed to {label}.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-line/60">
                {rows.map((r) => {
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
                          {rolledIn && (
                            <span
                              className="rounded bg-amber-tint px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber"
                              title="Purchased before this month, after the card's cut date"
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
                  Total billed to {label}
                </span>
                <span className="num font-semibold">{formatMoney(total)}</span>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
