"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sheet from "./Sheet";

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base placeholder:text-ink-soft/60 focus:border-teal";

export default function EditLoanButton({
  loan,
}: {
  loan: {
    id: number;
    name: string;
    originalPrincipalCents: number;
    openingBalanceCents: number;
    startMonth: string | null;
    termMonths: number | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(loan.name);
  const [original, setOriginal] = useState(String(loan.originalPrincipalCents / 100));
  const [opening, setOpening] = useState(String(loan.openingBalanceCents / 100));
  const [startMonth, setStartMonth] = useState(loan.startMonth ?? "");
  const [term, setTerm] = useState(loan.termMonths != null ? String(loan.termMonths) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/loans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: loan.id,
        name,
        originalPrincipal: original,
        openingBalance: opening,
        startMonth,
        termMonths: term,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not save.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[40px] items-center rounded-md px-3 py-2 text-sm text-ink-soft hover:bg-teal-tint hover:text-teal-dark"
      >
        Edit
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Edit loan">
        <form onSubmit={save} className="grid gap-3">
          <label className="grid gap-1 text-xs text-ink-soft">
            Loan name
            <input
              className={input}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-ink-soft">
              Original amount
              <input
                className={`${input} num`}
                inputMode="decimal"
                value={original}
                onChange={(e) => setOriginal(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs text-ink-soft">
              Remaining now
              <input
                className={`${input} num`}
                inputMode="decimal"
                value={opening}
                onChange={(e) => setOpening(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs text-ink-soft">
              Term (months, optional)
              <input
                className={`${input} num`}
                inputMode="numeric"
                value={term}
                onChange={(e) => setTerm(e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <label className="grid gap-1 text-xs text-ink-soft">
              Start month
              <input
                className={input}
                type="month"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
              />
            </label>
          </div>
          <p className="text-xs text-ink-soft">
            &ldquo;Remaining now&rdquo; is the balance left; payoff progress is
            measured against the original amount. To change the monthly payment,
            use &ldquo;Change monthly amount&rdquo; on the loan.
          </p>
          <div className="flex gap-2">
            <button
              disabled={busy}
              className="rounded-md bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-line px-3 py-2.5 text-sm text-ink-soft hover:bg-paper"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-sm text-brick">{error}</p>}
        </form>
      </Sheet>
    </>
  );
}
