import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recurringSavings, savingsPots } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import {
  parseMoneyToCents,
  isMonthKey,
  currentBudgetMonth,
  APP_CURRENCY,
} from "@/lib/money";
import { getCutoffDay } from "@/lib/settings";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const potId = Number(body.potId);
  const amountCents = parseMoneyToCents(body.amount ?? 0);
  const startMonth = isMonthKey(body.startMonth)
    ? body.startMonth
    : currentBudgetMonth(await getCutoffDay());

  if (!potId || amountCents <= 0) {
    return NextResponse.json(
      { error: "Pick a pot and add an amount." },
      { status: 400 }
    );
  }

  // Foreign-currency pots stay out of the budget (no FX), so force inBudget=false.
  const [pot] = await db
    .select({ currency: savingsPots.currency })
    .from(savingsPots)
    .where(eq(savingsPots.id, potId));
  const sameCurrency = (pot?.currency ?? APP_CURRENCY) === APP_CURRENCY;
  const inBudget = body.inBudget === true && sameCurrency;

  const [row] = await db
    .insert(recurringSavings)
    .values({ potId, amountCents, inBudget, startMonth })
    .returning();
  return NextResponse.json({ recurring: row });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(recurringSavings).where(eq(recurringSavings.id, id));
  return NextResponse.json({ ok: true });
}
