import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { incomes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { parseMoneyToCents } from "@/lib/money";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const source = String(body.source ?? "").trim();
  const amountCents = parseMoneyToCents(body.amount ?? 0);
  const occurredOn = String(body.occurredOn ?? "").slice(0, 10);
  const note = body.note ? String(body.note).trim() : null;

  if (!source || amountCents <= 0 || !occurredOn) {
    return NextResponse.json(
      { error: "Add a source, a positive amount, and a date." },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(incomes)
    .values({ userId: user.id, source, amountCents, occurredOn, note })
    .returning();
  return NextResponse.json({ income: row });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(incomes).where(eq(incomes.id, id));
  return NextResponse.json({ ok: true });
}
