import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { loans, loanSchedules } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { parseMoneyToCents, isMonthKey, monthKey } from "@/lib/money";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const original = parseMoneyToCents(body.originalPrincipal ?? 0);
  const opening =
    body.openingBalance !== undefined && body.openingBalance !== ""
      ? parseMoneyToCents(body.openingBalance)
      : original;
  const startMonth = isMonthKey(body.startMonth) ? body.startMonth : null;
  const termRaw = Number(body.termMonths);
  const termMonths = Number.isInteger(termRaw) && termRaw > 0 ? termRaw : null;
  const scheduled = body.scheduledAmount
    ? parseMoneyToCents(body.scheduledAmount)
    : 0;

  if (!name || original <= 0) {
    return NextResponse.json(
      { error: "Add a name and the original loan amount." },
      { status: 400 }
    );
  }

  const [loan] = await db
    .insert(loans)
    .values({
      name,
      originalPrincipalCents: original,
      openingBalanceCents: opening,
      startMonth,
      termMonths,
    })
    .returning();

  // Seed the first scheduled-payment step if provided (two independent inserts;
  // neon-http has no transactions, and a missing schedule is fixable in the UI).
  if (scheduled > 0) {
    const effMonth = startMonth ?? monthKey();
    await db.insert(loanSchedules).values({
      loanId: loan.id,
      amountCents: scheduled,
      effectiveFrom: `${effMonth}-01`,
    });
  }

  return NextResponse.json({ loan });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
    patch.name = name;
  }
  if (body.originalPrincipal !== undefined)
    patch.originalPrincipalCents = parseMoneyToCents(body.originalPrincipal);
  if (body.openingBalance !== undefined)
    patch.openingBalanceCents = parseMoneyToCents(body.openingBalance);
  if (body.startMonth !== undefined)
    patch.startMonth = isMonthKey(body.startMonth) ? body.startMonth : null;
  if (body.termMonths !== undefined) {
    const t = Number(body.termMonths);
    patch.termMonths = Number.isInteger(t) && t > 0 ? t : null;
  }
  if (body.archived !== undefined)
    patch.archivedAt = body.archived ? new Date() : null;

  if (Object.keys(patch).length > 0) {
    await db.update(loans).set(patch).where(eq(loans.id, id));
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(loans).where(eq(loans.id, id));
  return NextResponse.json({ ok: true });
}
