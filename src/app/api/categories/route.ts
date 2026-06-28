import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, budgets } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { parseMoneyToCents, isMonthKey, monthKey } from "@/lib/money";

// Create a new envelope with its first budget, effective from a month.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const amountCents = parseMoneyToCents(body.budget ?? 0);
  const effMonth = isMonthKey(body.effectiveMonth)
    ? body.effectiveMonth
    : monthKey();
  if (!name) {
    return NextResponse.json({ error: "Name a category." }, { status: 400 });
  }

  const [cat] = await db.insert(categories).values({ name }).returning();
  await db.insert(budgets).values({
    categoryId: cat.id,
    amountCents,
    effectiveFrom: `${effMonth}-01`,
  });
  return NextResponse.json({ category: cat });
}

// Set the budget effective from a given month (past months stay unchanged),
// and/or rename the envelope.
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const categoryId = Number(body.categoryId);
  if (!categoryId) {
    return NextResponse.json({ error: "Missing category." }, { status: 400 });
  }

  if (typeof body.name === "string" && body.name.trim()) {
    await db
      .update(categories)
      .set({ name: body.name.trim() })
      .where(eq(categories.id, categoryId));
  }

  if (body.budget !== undefined) {
    const amountCents = parseMoneyToCents(body.budget);
    const effMonth = isMonthKey(body.effectiveMonth)
      ? body.effectiveMonth
      : monthKey();
    const effectiveFrom = `${effMonth}-01`;

    const [existing] = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.categoryId, categoryId),
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
        .values({ categoryId, amountCents, effectiveFrom });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Budgets and expenses for this category are removed too (ON DELETE CASCADE).
  await db.delete(categories).where(eq(categories.id, id));
  return NextResponse.json({ ok: true });
}
