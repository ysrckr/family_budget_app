import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { fixedCosts } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { parseMoneyToCents, isMonthKey, monthKey } from "@/lib/money";

// Set a fixed monthly cost effective from a month. Re-using the same label +
// month updates that entry; a later month adds a new step in its history.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const label = String(body.label ?? "").trim();
  const amountCents = parseMoneyToCents(body.amount ?? 0);
  const effMonth = isMonthKey(body.effectiveMonth) ? body.effectiveMonth : monthKey();
  const effectiveFrom = `${effMonth}-01`;

  if (!label || amountCents <= 0) {
    return NextResponse.json(
      { error: "Add a name and a monthly amount." },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select()
    .from(fixedCosts)
    .where(
      and(eq(fixedCosts.label, label), eq(fixedCosts.effectiveFrom, effectiveFrom))
    );

  if (existing) {
    await db
      .update(fixedCosts)
      .set({ amountCents })
      .where(eq(fixedCosts.id, existing.id));
  } else {
    await db.insert(fixedCosts).values({ label, amountCents, effectiveFrom });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(fixedCosts).where(eq(fixedCosts.id, id));
  return NextResponse.json({ ok: true });
}
