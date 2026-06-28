"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base placeholder:text-ink-soft/60 focus:border-teal";

export default function AddLoan({ currentMonth }: { currentMonth: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [original, setOriginal] = useState("");
  const [opening, setOpening] = useState("");
  const [scheduled, setScheduled] = useState("");
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [term, setTerm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        originalPrincipal: original,
        openingBalance: opening,
        scheduledAmount: scheduled,
        startMonth,
        termMonths: term,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not add loan.");
      return;
    }
    setName("");
    setOriginal("");
    setOpening("");
    setScheduled("");
    setTerm("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-dashed border-line px-3 py-1.5 text-sm text-ink-soft hover:border-teal hover:text-teal"
      >
        + New loan
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-lg border border-line bg-paper p-4"
    >
      <label className="grid gap-1 text-xs text-ink-soft">
        Loan name
        <input
          className={input}
          placeholder="e.g. Car loan, Mortgage"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-ink-soft">
          Original amount
          <input
            className={`${input} num`}
            placeholder="Total borrowed"
            inputMode="decimal"
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-xs text-ink-soft">
          Remaining now (optional)
          <input
            className={`${input} num`}
            placeholder="Defaults to original"
            inputMode="decimal"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-xs text-ink-soft">
          Monthly payment
          <input
            className={`${input} num`}
            placeholder="Scheduled / month"
            inputMode="decimal"
            value={scheduled}
            onChange={(e) => setScheduled(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-xs text-ink-soft">
          Term (months, optional)
          <input
            className={`${input} num`}
            placeholder="e.g. 60"
            inputMode="numeric"
            value={term}
            onChange={(e) => setTerm(e.target.value.replace(/\D/g, ""))}
          />
        </label>
        <label className="grid gap-1 text-xs text-ink-soft sm:col-span-2">
          First payment month
          <input
            className={input}
            type="month"
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
          />
        </label>
      </div>

      <p className="text-xs text-ink-soft">
        Loans are tracked outside your monthly budget — they never change
        &ldquo;Left to spend&rdquo;.
      </p>

      <div className="flex gap-2">
        <button
          disabled={busy}
          className="rounded-md bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
        >
          {busy ? "Adding…" : "Add loan"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-line px-3 py-2.5 text-sm text-ink-soft hover:bg-surface"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-sm text-brick">{error}</p>}
    </form>
  );
}
