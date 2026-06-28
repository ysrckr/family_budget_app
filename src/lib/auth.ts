import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

export const SESSION_COOKIE = "session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me"
);
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
  };
}

export async function signSession(userId: number): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

/** The signed-in user, or null. Use in server components / route handlers. */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const uid = Number(payload.uid);
    if (!uid) return null;
    const [user] = await db.select().from(users).where(eq(users.id, uid));
    return user ?? null;
  } catch {
    return null;
  }
}

/** Only emails listed in ALLOWED_EMAILS may sign in. Empty list = nobody. */
export function isEmailAllowed(email: string): boolean {
  const list = (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

export async function upsertUser(data: {
  email: string;
  name: string;
  image: string | null;
}): Promise<User> {
  const email = data.email.toLowerCase();
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    const [u] = await db
      .update(users)
      .set({ name: data.name, image: data.image })
      .where(eq(users.id, existing.id))
      .returning();
    return u;
  }
  const [u] = await db
    .insert(users)
    .values({ email, name: data.name, image: data.image })
    .returning();
  return u;
}
