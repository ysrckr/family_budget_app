"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base placeholder:text-ink-soft/60 focus:border-teal";

export default function FixedCostForm({
  currentMonth,
  labels,
}: {
  currentMonth: string;
  labels: string[];
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [effectiveMonth, setEffectiveMonth] = useState(currentMonth);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/fixed-costs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, amount, effectiveMonth }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not save.");
      return;
    }
    setAmount("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_140px_150px_auto]">
        <input
          className={input}
          placeholder="Cost (e.g. Rent)"
          list="fixed-cost-labels"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <datalist id="fixed-cost-labels">
          {labels.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
        <input
          className={`${input} num`}
          placeholder="Monthly amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          className={input}
          type="month"
          value={effectiveMonth}
          onChange={(e) => setEffectiveMonth(e.target.value)}
        />
        <button
          disabled={busy}
          className="rounded-md bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
        >
          {busy ? "Saving…" : "Set cost"}
        </button>
      </div>
      <p className="text-xs text-ink-soft">
        Applies from the chosen month onward and comes straight out of &ldquo;Left
        to spend&rdquo; — no need to log it as spending. To change it later (e.g.
        rent goes up), set the new amount from that month.
      </p>
      {error && <p className="text-sm text-brick">{error}</p>}
    </form>
  );
}
