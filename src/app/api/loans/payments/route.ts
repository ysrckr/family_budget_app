import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { loanPayments } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { parseMoneyToCents, todayISO } from "@/lib/money";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const loanId = Number(body.loanId);
  const amountCents = parseMoneyToCents(body.amount ?? 0);
  const paidOn = body.paidOn ? String(body.paidOn).slice(0, 10) : todayISO();
  const note = body.note ? String(body.note).trim() : null;

  if (!loanId || amountCents <= 0) {
    return NextResponse.json(
      { error: "Add a payment amount." },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(loanPayments)
    .values({ loanId, userId: user.id, amountCents, paidOn, note })
    .returning();
  return NextResponse.json({ payment: row });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(loanPayments).where(eq(loanPayments.id, id));
  return NextResponse.json({ ok: true });
}
