import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { savingsPots, savingsTxns } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { parseMoneyToCents, todayISO, APP_CURRENCY } from "@/lib/money";

function normTarget(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const t = parseMoneyToCents(raw as string);
  return t > 0 ? t : null;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Give the pot a name." }, { status: 400 });
  }

  const currency = String(body.currency ?? APP_CURRENCY)
    .toUpperCase()
    .slice(0, 3) || APP_CURRENCY;

  const [row] = await db
    .insert(savingsPots)
    .values({ name, targetCents: normTarget(body.target), currency })
    .returning();

  // Optional starting balance: seed it as an out-of-budget opening deposit so
  // it counts toward the pot balance but never affects "Left to spend".
  const initial = body.initial ? parseMoneyToCents(body.initial) : 0;
  if (initial > 0) {
    await db.insert(savingsTxns).values({
      potId: row.id,
      userId: user.id,
      txnType: "deposit",
      amountCents: initial,
      inBudget: false,
      occurredOn: todayISO(),
      billingMonth: null,
      note: "Starting balance",
    });
  }

  return NextResponse.json({ pot: row });
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
  if (body.target !== undefined) patch.targetCents = normTarget(body.target);
  if (body.archived !== undefined) patch.archivedAt = body.archived ? new Date() : null;

  if (Object.keys(patch).length > 0) {
    await db.update(savingsPots).set(patch).where(eq(savingsPots.id, id));
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(savingsPots).where(eq(savingsPots.id, id));
  return NextResponse.json({ ok: true });
}
