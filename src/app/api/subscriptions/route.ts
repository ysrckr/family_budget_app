import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { parseMoneyToCents, isMonthKey, monthKey } from "@/lib/money";

function parseBody(body: Record<string, unknown>) {
  const label = String(body.label ?? "").trim();
  const amountCents = parseMoneyToCents((body.amount as string) ?? 0);
  const cycle = body.cycle === "yearly" ? "yearly" : "monthly";
  const startMonth = isMonthKey(body.startMonth) ? (body.startMonth as string) : monthKey();
  return { label, amountCents, cycle, startMonth };
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { label, amountCents, cycle, startMonth } = parseBody(
    await req.json().catch(() => ({}))
  );
  if (!label || amountCents <= 0) {
    return NextResponse.json(
      { error: "Add a name and an amount." },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(subscriptions)
    .values({ label, amountCents, cycle, startMonth })
    .returning();
  return NextResponse.json({ subscription: row });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  const { label, amountCents, cycle, startMonth } = parseBody(body);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!label || amountCents <= 0) {
    return NextResponse.json(
      { error: "Add a name and an amount." },
      { status: 400 }
    );
  }

  await db
    .update(subscriptions)
    .set({ label, amountCents, cycle, startMonth })
    .where(eq(subscriptions.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(subscriptions).where(eq(subscriptions.id, id));
  return NextResponse.json({ ok: true });
}
