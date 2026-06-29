import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { parseMoneyToCents } from "@/lib/money";
import { setSubscriptionBudgetCents } from "@/lib/settings";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const cents = body.budget ? parseMoneyToCents(body.budget) : 0;
  await setSubscriptionBudgetCents(cents);
  return NextResponse.json({ ok: true, budgetCents: cents });
}
