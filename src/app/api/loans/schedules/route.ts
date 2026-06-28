import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { loanSchedules } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { parseMoneyToCents, isMonthKey, monthKey } from "@/lib/money";

// Set the scheduled monthly payment effective from a month. Re-using the same
// loan + month updates that step; a later month adds a new step (salary pattern).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const loanId = Number(body.loanId);
  const amountCents = parseMoneyToCents(body.amount ?? 0);
  const effMonth = isMonthKey(body.effectiveMonth) ? body.effectiveMonth : monthKey();
  const effectiveFrom = `${effMonth}-01`;

  if (!loanId || amountCents <= 0) {
    return NextResponse.json(
      { error: "Add a scheduled amount." },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select()
    .from(loanSchedules)
    .where(
      and(
        eq(loanSchedules.loanId, loanId),
        eq(loanSchedules.effectiveFrom, effectiveFrom)
      )
    );

  if (existing) {
    await db
      .update(loanSchedules)
      .set({ amountCents })
      .where(eq(loanSchedules.id, existing.id));
  } else {
    await db
      .insert(loanSchedules)
      .values({ loanId, amountCents, effectiveFrom });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(loanSchedules).where(eq(loanSchedules.id, id));
  return NextResponse.json({ ok: true });
}
