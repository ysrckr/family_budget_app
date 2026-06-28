import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { setCutoffDay } from "@/lib/settings";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const raw = body.cutoffDay;

  let day: number | null = null;
  if (raw !== null && raw !== undefined && raw !== "") {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 31) {
      return NextResponse.json(
        { error: "Pick a day from 1 to 31." },
        { status: 400 }
      );
    }
    day = n;
  }

  await setCutoffDay(day);
  return NextResponse.json({ ok: true, cutoffDay: day });
}
