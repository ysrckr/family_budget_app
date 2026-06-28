import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cards } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const label = String(body.label ?? "").trim();
  const last4raw = String(body.last4 ?? "").replace(/\D/g, "").slice(0, 4);
  const last4 = last4raw || null;

  let cutDay: number | null = null;
  if (body.cutDay !== undefined && body.cutDay !== "" && body.cutDay !== null) {
    const n = Math.round(Number(body.cutDay));
    if (Number.isFinite(n) && n >= 1 && n <= 31) cutDay = n;
  }

  if (!label) {
    return NextResponse.json({ error: "Name the card." }, { status: 400 });
  }

  const [row] = await db
    .insert(cards)
    .values({ label, last4, cutDay })
    .returning();
  return NextResponse.json({ card: row });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Past expenses keep their record; their cardId becomes null (ON DELETE SET NULL).
  await db.delete(cards).where(eq(cards.id, id));
  return NextResponse.json({ ok: true });
}
