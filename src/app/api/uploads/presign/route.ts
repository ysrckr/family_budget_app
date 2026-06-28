import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { presignUpload } from "@/lib/s3";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const filename = String(body.filename ?? "receipt");
  const contentType = String(body.contentType ?? "application/octet-stream");

  try {
    const { url, key } = await presignUpload(user.id, filename, contentType);
    return NextResponse.json({ url, key });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload not configured." },
      { status: 500 }
    );
  }
}
