import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories, cards } from "@/db/schema";
import {
  currentBudgetMonth,
  monthLabel,
  shiftMonth,
  isMonthKey,
} from "@/lib/money";
import { getCutoffDay } from "@/lib/settings";
import TopBar from "@/components/TopBar";
import MonthSwitcher from "@/components/MonthSwitcher";
import ExpenseForm from "@/components/ExpenseForm";
import CardManager from "@/components/CardManager";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const cutoffDay = await getCutoffDay();
  const key = isMonthKey(sp.month) ? sp.month! : currentBudgetMonth(cutoffDay);
  const label = monthLabel(key);
  const defaultCategoryId = sp.category ? Number(sp.category) : undefined;

  const [cats, cardList] = await Promise.all([
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
  ]);

  const sharedCategories = cats
    .filter((c) => c.kind === "shared")
    .map((c) => ({ id: c.id, name: c.name }));
  const allowanceCategories = cats
    .filter((c) => c.kind === "allowance")
    .map((c) => ({ id: c.id, owner: c.owner ?? "—" }));

  const historyHref = `/expenses/history?month=${key}`;

  return (
    <>
      <TopBar active="/expenses" />
      <main className="mx-auto max-w-4xl px-5 pb-28 pt-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Add spending
          </h1>
          <MonthSwitcher
            basePath="/expenses"
            label={label}
            prev={shiftMonth(key, -1)}
            next={shiftMonth(key, 1)}
            query={defaultCategoryId ? { category: String(defaultCategoryId) } : {}}
          />
        </div>

        <div className="grid gap-4">
          <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
            <ExpenseForm
              sharedCategories={sharedCategories}
              allowanceCategories={allowanceCategories}
              cards={cardList}
              month={key}
              cutoffDay={cutoffDay}
              defaultCategoryId={defaultCategoryId}
            />
          </div>

          <CardManager cards={cardList} />

          <Link
            href={historyHref}
            className="flex items-center justify-between rounded-xl border border-line bg-surface px-5 py-4 text-sm font-medium shadow-card hover:border-teal/50"
          >
            <span>View spending history for {label}</span>
            <span aria-hidden className="text-teal">
              →
            </span>
          </Link>
        </div>
      </main>
    </>
  );
}
