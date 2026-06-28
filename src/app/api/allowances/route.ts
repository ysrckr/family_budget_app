import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, budgets } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { parseMoneyToCents, isMonthKey, monthKey } from "@/lib/money";

// An allowance is just a per-person envelope (categories.kind = "allowance").
// Setting it ensures that envelope exists, then sets its budget for the chosen
// month forward — past months keep their old figure, exactly like shared budgets.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const person = String(body.person ?? "").trim();
  const amountCents = parseMoneyToCents(body.amount ?? 0);
  const effMonth = isMonthKey(body.effectiveMonth)
    ? body.effectiveMonth
    : monthKey();
  const effectiveFrom = `${effMonth}-01`;

  if (!person || amountCents < 0) {
    return NextResponse.json(
      { error: "Add a person and an allowance amount." },
      { status: 400 }
    );
  }

  // Find (or create) this person's allowance envelope.
  let [cat] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.kind, "allowance"), eq(categories.owner, person)));

  if (!cat) {
    [cat] = await db
      .insert(categories)
      .values({ name: `${person} allowance`, kind: "allowance", owner: person })
      .returning();
  }

  // Upsert the budget for that month.
  const [existing] = await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.categoryId, cat.id),
        eq(budgets.effectiveFrom, effectiveFrom)
      )
    );

  if (existing) {
    await db
      .update(budgets)
      .set({ amountCents })
      .where(eq(budgets.id, existing.id));
  } else {
    await db
      .insert(budgets)
      .values({ categoryId: cat.id, amountCents, effectiveFrom });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Removes the allowance envelope and its spending (ON DELETE CASCADE).
  await db.delete(categories).where(eq(categories.id, id));
  return NextResponse.json({ ok: true });
}
