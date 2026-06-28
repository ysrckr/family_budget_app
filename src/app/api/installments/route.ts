import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { installmentPlans } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { parseMoneyToCents, isMonthKey, monthKey } from "@/lib/money";
import { monthlyPaymentCents } from "@/lib/installments";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const label = String(body.label ?? "").trim();
  const months = Number(body.months);
  const startMonth = isMonthKey(body.startMonth) ? body.startMonth : monthKey();

  const aprNum =
    body.apr !== undefined && body.apr !== null && body.apr !== ""
      ? Number(body.apr)
      : null;
  const aprBps =
    aprNum !== null && Number.isFinite(aprNum) && aprNum >= 0
      ? Math.round(aprNum * 100)
      : null;
  const principalCents = body.principal ? parseMoneyToCents(body.principal) : null;
  const cardId = body.cardId ? Number(body.cardId) : null;

  // Manual monthly payment wins; otherwise compute from amount + months + APR.
  let monthly = body.monthlyPayment ? parseMoneyToCents(body.monthlyPayment) : 0;
  if (monthly <= 0 && principalCents && principalCents > 0) {
    monthly = monthlyPaymentCents(principalCents, months, aprBps);
  }

  if (!label || !Number.isInteger(months) || months <= 0 || monthly <= 0) {
    return NextResponse.json(
      { error: "Add a name, the number of months, and an amount or monthly payment." },
      { status: 400 }
    );
  }

  const [plan] = await db
    .insert(installmentPlans)
    .values({
      label,
      principalCents,
      aprBps,
      months,
      monthlyPaymentCents: monthly,
      startMonth,
      cardId,
    })
    .returning();
  return NextResponse.json({ plan });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  const label = String(body.label ?? "").trim();
  const months = Number(body.months);
  const startMonth = isMonthKey(body.startMonth) ? body.startMonth : monthKey();
  const aprNum =
    body.apr !== undefined && body.apr !== null && body.apr !== ""
      ? Number(body.apr)
      : null;
  const aprBps =
    aprNum !== null && Number.isFinite(aprNum) && aprNum >= 0
      ? Math.round(aprNum * 100)
      : null;
  const principalCents = body.principal ? parseMoneyToCents(body.principal) : null;
  const cardId = body.cardId ? Number(body.cardId) : null;

  let monthly = body.monthlyPayment ? parseMoneyToCents(body.monthlyPayment) : 0;
  if (monthly <= 0 && principalCents && principalCents > 0) {
    monthly = monthlyPaymentCents(principalCents, months, aprBps);
  }

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!label || !Number.isInteger(months) || months <= 0 || monthly <= 0) {
    return NextResponse.json(
      { error: "Add a name, the number of months, and an amount or monthly payment." },
      { status: 400 }
    );
  }

  await db
    .update(installmentPlans)
    .set({
      label,
      principalCents,
      aprBps,
      months,
      monthlyPaymentCents: monthly,
      startMonth,
      cardId,
    })
    .where(eq(installmentPlans.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(installmentPlans).where(eq(installmentPlans.id, id));
  return NextResponse.json({ ok: true });
}
