import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { salaries } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { parseMoneyToCents, isMonthKey, monthKey } from "@/lib/money";

// Set a person's salary effective from a month. Re-using the same person +
// month updates that entry; a later month adds a new step in their history.
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
      { error: "Add a name and a salary amount." },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select()
    .from(salaries)
    .where(
      and(eq(salaries.person, person), eq(salaries.effectiveFrom, effectiveFrom))
    );

  if (existing) {
    await db
      .update(salaries)
      .set({ amountCents })
      .where(eq(salaries.id, existing.id));
  } else {
    await db.insert(salaries).values({ person, amountCents, effectiveFrom });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(salaries).where(eq(salaries.id, id));
  return NextResponse.json({ ok: true });
}
