import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { savingsTxns } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { parseMoneyToCents, billingMonthFor } from "@/lib/money";
import { getCutoffDay } from "@/lib/settings";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const potId = Number(body.potId);
  const amountCents = parseMoneyToCents(body.amount ?? 0);
  const txnType = body.txnType === "withdrawal" ? "withdrawal" : "deposit";
  const occurredOn = String(body.occurredOn ?? "").slice(0, 10);
  const note = body.note ? String(body.note).trim() : null;

  // "From budget" only applies to deposits — a withdrawal can never put money
  // back into the budget, so it is always out-of-budget (enforced here, not by
  // the client).
  const inBudget = txnType === "deposit" && body.inBudget === true;

  if (!potId || amountCents <= 0 || !occurredOn) {
    return NextResponse.json(
      { error: "Pick a pot and add an amount and date." },
      { status: 400 }
    );
  }

  // Invariant: in-budget deposits get a cutoff-aware billing month (so they
  // bucket exactly like cash spending); everything else has billingMonth = null
  // and never touches Overview math.
  let billingMonth: string | null = null;
  if (inBudget) {
    const cutoff = await getCutoffDay();
    billingMonth = billingMonthFor(occurredOn, cutoff);
  }

  const [row] = await db
    .insert(savingsTxns)
    .values({
      potId,
      userId: user.id,
      txnType,
      amountCents,
      inBudget,
      occurredOn,
      billingMonth,
      note,
    })
    .returning();
  return NextResponse.json({ txn: row, billingMonth, inBudget });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(savingsTxns).where(eq(savingsTxns.id, id));
  return NextResponse.json({ ok: true });
}
