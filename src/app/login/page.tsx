import BudgetMark from "@/components/BudgetMark";

const ERRORS: Record<string, string> = {
  state: "Sign-in expired or was interrupted. Please try again.",
  token: "Google sign-in failed. Please try again.",
  profile: "Could not read your Google profile. Please try again.",
  denied: "That email isn't on the household whitelist.",
  config: "Sign-in isn't configured yet. Check the server settings.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const message = sp.error ? ERRORS[sp.error] ?? "Could not sign in." : null;

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-paper px-5 py-10">
      {/* soft teal glow + paper grain behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-teal-tint blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(28,36,51,0.05) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BudgetMark size={64} className="rounded-2xl shadow-card" />
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-ink">
            Household Budget
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            The budget you keep together.
          </p>
        </div>

        <div className="envelope overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          {/* signature fill-meter strip across the top, like a sealed envelope edge */}
          <div className="meter rounded-none" aria-hidden>
            <span
              style={{
                width: "62%",
                background:
                  "linear-gradient(90deg, var(--tw-meter-a, #0E7C66), #0A5D4C)",
              }}
            />
          </div>

          <div className="p-7">
            {message && (
              <p className="mb-5 rounded-lg border border-brick/20 bg-brick-tint px-3 py-2.5 text-sm text-brick">
                {message}
              </p>
            )}

            <a
              href="/api/auth/google/start"
              className="group flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink shadow-xs transition-all hover:border-ink/20 hover:bg-paper hover:shadow-card active:scale-[0.99]"
            >
              <GoogleMark />
              Continue with Google
            </a>

            <div className="mt-6 flex items-center gap-3 text-[0.7rem] uppercase tracking-wider text-ink-soft/70">
              <span className="h-px flex-1 bg-line" />
              Private &amp; invite-only
              <span className="h-px flex-1 bg-line" />
            </div>

            <p className="mt-4 text-center text-xs leading-relaxed text-ink-soft">
              Only whitelisted household emails can sign in. Your salaries,
              budgets and receipts stay between the two of you.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ink-soft/70">
          Household budgeting for two &middot; no passwords, just Google
        </p>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.63Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
