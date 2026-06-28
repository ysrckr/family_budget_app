import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  isEmailAllowed,
  upsertUser,
  signSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = process.env.APP_URL || url.origin;
  const fail = (reason: string) =>
    NextResponse.redirect(`${base}/login?error=${reason}`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const savedState = store.get("oauth_state")?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return fail("state");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("config");

  // Exchange the authorization code for tokens.
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${base}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return fail("token");
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) return fail("token");

  // Fetch the user's profile.
  const infoRes = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );
  if (!infoRes.ok) return fail("profile");
  const info = (await infoRes.json()) as {
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };

  const email = (info.email || "").toLowerCase();
  if (!email || info.email_verified === false || !isEmailAllowed(email)) {
    return fail("denied");
  }

  const user = await upsertUser({
    email,
    name: info.name || email,
    image: info.picture || null,
  });

  const token = await signSession(user.id);
  const res = NextResponse.redirect(`${base}/`);
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  res.cookies.delete("oauth_state");
  return res;
}
