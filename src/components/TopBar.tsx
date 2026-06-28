import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories, cards } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getCutoffDay } from "@/lib/settings";
import LogoutButton from "./LogoutButton";
import QuickAddSpending from "./QuickAddSpending";
import BudgetMark from "./BudgetMark";
import MobileNav from "./MobileNav";

const links = [
  { href: "/", label: "Overview" },
  { href: "/budget", label: "Budgets" },
  { href: "/expenses", label: "Spending" },
  { href: "/income", label: "Income" },
  { href: "/savings", label: "Savings" },
  { href: "/loans", label: "Loans" },
  { href: "/installments", label: "Installments" },
];

export default async function TopBar({ active }: { active: string }) {
  const [user, cats, cardList, cutoffDay] = await Promise.all([
    getCurrentUser(),
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
    getCutoffDay(),
  ]);

  const sharedCategories = cats
    .filter((c) => c.kind === "shared")
    .map((c) => ({ id: c.id, name: c.name }));
  const allowanceCategories = cats
    .filter((c) => c.kind === "allowance")
    .map((c) => ({ id: c.id, owner: c.owner ?? "—" }));

  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-5 py-4">
          <Link href="/" className="flex items-center gap-2">
            <BudgetMark size={30} />
            <span className="font-display text-lg font-semibold tracking-tight">
              Household
            </span>
          </Link>

          <nav className="hidden gap-1 sm:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active === l.href
                    ? "bg-teal-tint text-teal-dark"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-3 sm:flex">
              {user && (
                <span className="text-sm text-ink-soft">{user.name}</span>
              )}
              <LogoutButton />
            </div>
            <MobileNav links={links} active={active} userName={user?.name ?? null} />
          </div>
        </div>
      </header>

      <QuickAddSpending
        sharedCategories={sharedCategories}
        allowanceCategories={allowanceCategories}
        cards={cardList}
        cutoffDay={cutoffDay}
      />
    </>
  );
}
