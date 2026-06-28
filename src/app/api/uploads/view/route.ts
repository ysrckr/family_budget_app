import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { presignView } from "@/lib/s3";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  try {
    const url = await presignView(key);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cannot view file." },
      { status: 500 }
    );
  }
}
