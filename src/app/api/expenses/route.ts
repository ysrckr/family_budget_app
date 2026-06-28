import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { expenses, cards } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { parseMoneyToCents, billingMonthFor } from "@/lib/money";
import { getCutoffDay } from "@/lib/settings";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const categoryId = Number(body.categoryId);
  const payee = String(body.payee ?? "").trim();
  const amountCents = parseMoneyToCents(body.amount ?? 0);
  const occurredOn = String(body.occurredOn ?? "").slice(0, 10);
  const description = body.description ? String(body.description).trim() : null;
  const receiptKey = body.receiptKey ? String(body.receiptKey) : null;

  const paymentMethod = body.paymentMethod === "card" ? "card" : "cash";
  const cardId =
    paymentMethod === "card" && body.cardId ? Number(body.cardId) : null;

  if (!categoryId || !payee || amountCents <= 0 || !occurredOn) {
    return NextResponse.json(
      { error: "Pick a category and add a payee, amount, and date." },
      { status: 400 }
    );
  }
  if (paymentMethod === "card" && !cardId) {
    return NextResponse.json(
      { error: "Choose which card was used." },
      { status: 400 }
    );
  }

  // Derive the billing month the spend counts toward. Cash (and cards with no
  // closing day of their own) follow the household cutoff day; a card with its
  // own cut day overrides it.
  const cutoff = await getCutoffDay();
  let cutDay: number | null = cutoff;
  if (cardId) {
    const [card] = await db
      .select({ cutDay: cards.cutDay })
      .from(cards)
      .where(eq(cards.id, cardId));
    cutDay = card?.cutDay ?? cutoff;
  }
  const billingMonth = billingMonthFor(occurredOn, cutDay);

  const [row] = await db
    .insert(expenses)
    .values({
      categoryId,
      userId: user.id, // recorded, but not shown anywhere in the UI
      payee,
      amountCents,
      paymentMethod,
      cardId,
      description,
      occurredOn,
      billingMonth,
      receiptKey,
    })
    .returning();
  return NextResponse.json({ expense: row, billingMonth });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  const categoryId = Number(body.categoryId);
  const payee = String(body.payee ?? "").trim();
  const amountCents = parseMoneyToCents(body.amount ?? 0);
  const occurredOn = String(body.occurredOn ?? "").slice(0, 10);
  const description = body.description ? String(body.description).trim() : null;
  const paymentMethod = body.paymentMethod === "card" ? "card" : "cash";
  const cardId =
    paymentMethod === "card" && body.cardId ? Number(body.cardId) : null;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!categoryId || !payee || amountCents <= 0 || !occurredOn) {
    return NextResponse.json(
      { error: "Pick a category and add a payee, amount, and date." },
      { status: 400 }
    );
  }
  if (paymentMethod === "card" && !cardId) {
    return NextResponse.json({ error: "Choose which card was used." }, { status: 400 });
  }

  // Recompute the billing month (same rule as create) so edits stay consistent.
  const cutoff = await getCutoffDay();
  let cutDay: number | null = cutoff;
  if (cardId) {
    const [card] = await db
      .select({ cutDay: cards.cutDay })
      .from(cards)
      .where(eq(cards.id, cardId));
    cutDay = card?.cutDay ?? cutoff;
  }
  const billingMonth = billingMonthFor(occurredOn, cutDay);

  // receiptKey and userId are left untouched on edit.
  await db
    .update(expenses)
    .set({ categoryId, payee, amountCents, paymentMethod, cardId, description, occurredOn, billingMonth })
    .where(eq(expenses.id, id));
  return NextResponse.json({ ok: true, billingMonth });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(expenses).where(eq(expenses.id, id));
  return NextResponse.json({ ok: true });
}
