# Household Budget

A shared, envelope-style budgeting app for two people. Set each person's
salary once and it recurs every month; give each category a budget that carries
forward until you change it; record spending against those envelopes with
optional notes and receipt uploads.

Built with Next.js (App Router), Postgres on **Neon** (free tier), Drizzle ORM,
Google sign-in restricted to a whitelist, and S3 presigned uploads for receipts.

## How it works

- **Salaries** are recurring and *effective-dated*. Setting a salary "from June"
  applies to June and every later month. Change it later and past months keep
  their old figure — only the future updates.
- **Budgets** work the same way. A category's budget is a standing setting that
  repeats each month until you change it (e.g. when salaries change). Editing a
  budget while viewing a month applies *from that month forward*.
- **Allowances** are personal spending money per person, on top of the shared
  budget — e.g. you get 5,000 and your wife 8,000 each month. Each allowance is
  its own envelope: it carries forward and is effective-dated like any budget,
  and both of you can see both. Spend against an allowance the same way you
  spend against a shared envelope.
- **Income** for a month = the salaries in effect + any one-off extra income you
  add that month.
- **Spending** comes out of an envelope (a shared category *or* someone's
  allowance). Each entry records cash or card — and which card — plus an optional
  note and receipt. (Who entered it is stored but not shown.) The overview shows,
  per envelope, a fill meter and a remaining figure you can tap to switch between
  money left and % left (green when positive, red when over).
- **Credit card cut dates.** A card can have a cut day (its statement-closing
  day). Spending on that card *after* the cut day counts toward next month's
  budget, since it lands on the next statement and is paid from next month's
  money; on or before the cut day it stays in the current month. Cash and cards
  with no cut day always count in the month of purchase. The whole app is
  organized by this billing month; income stays in its real month. Each month's
  spending is covered by that month's income — the actual card-bill payment is
  never modeled as a separate outflow, so nothing is counted twice.

## 1. Prerequisites

- Node.js 18.18+ (or 20+)
- A free Neon account (Postgres)
- A Google Cloud project (for sign-in)
- An AWS S3 bucket + an IAM user (for receipts)

## 2. Install

```bash
npm install
cp .env.example .env
```

Then fill in `.env` (see below).

## 3. Database (Neon — free, not Supabase)

1. Create a project at https://neon.tech.
2. Copy the **pooled** connection string into `DATABASE_URL` in `.env`.
3. Create the tables:

```bash
npm run db:push
```

> If `db:push` has trouble connecting, use Neon's **direct** (non-pooler)
> connection string for that command, then switch back to the pooled one for the
> app. You can browse data anytime with `npm run db:studio`.

## 4. Google sign-in (whitelist only)

1. Google Cloud Console → **APIs & Services → OAuth consent screen**. Configure
   it (External is fine), and add your and your wife's emails as **Test users**.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID →
   Web application**.
3. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/api/auth/google/callback` (local)
   - `https://YOUR_DOMAIN/api/auth/google/callback` (production)
4. Put the client ID/secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
5. Set `ALLOWED_EMAILS` to the comma-separated emails allowed to sign in. Anyone
   not on this list is rejected even with a valid Google account.
6. Generate `AUTH_SECRET` with `openssl rand -base64 32`.

## 5. S3 receipts (presigned uploads)

Create a bucket and an IAM user whose keys go in `.env`
(`AWS_REGION`, `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).

**IAM policy** (least privilege) for that user:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET/receipts/*"
    }
  ]
}
```

**Bucket CORS** (so the browser can PUT directly to S3) — S3 → your bucket →
Permissions → CORS:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["http://localhost:3000", "https://YOUR_DOMAIN"],
    "ExposeHeaders": []
  }
]
```

Keep **Block all public access ON** — files are reached only through short-lived
presigned URLs, so the bucket stays private.

## 6. Run

```bash
npm run dev
```

Open http://localhost:3000, sign in with a whitelisted Google account, then:

1. **Income** → set each person's salary (and any extra income).
2. **Budgets** → add categories (Market, Subs, …) with monthly amounts.
3. **Spending** → record what you spend; pick the day, add a note/receipt.
4. **Overview** → see the month at a glance and switch months.

## 7. Deploy (Vercel)

1. Push to a Git repo and import it in Vercel.
2. Add every variable from `.env` to the Vercel project settings.
3. Set `APP_URL` to your production URL and add that domain's
   `/api/auth/google/callback` to Google's Authorized redirect URIs and to the
   S3 CORS `AllowedOrigins`.

## Notes

- Money is stored as integer cents to avoid floating-point rounding.
- Change the currency with `NEXT_PUBLIC_CURRENCY` (e.g. `EUR`, `GBP`, `TRY`).
- "Person" on salaries is a free-text label, so either of you can manage both
  salaries without the other having signed in yet.
```
