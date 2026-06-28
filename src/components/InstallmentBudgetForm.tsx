"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base placeholder:text-ink-soft/60 focus:border-teal";

export default function InstallmentBudgetForm({
  budgetCents,
}: {
  budgetCents: number;
}) {
  const router = useRouter();
  const [budget, setBudget] = useState(budgetCents > 0 ? String(budgetCents / 100) : "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/installments/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budget }),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label className="grid flex-1 gap-1 text-xs text-ink-soft">
        Monthly installments budget
        <input
          className={`${input} num`}
          inputMode="decimal"
          placeholder="e.g. 10,000"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
      </label>
      <button
        disabled={busy}
        className="rounded-md bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save"}
      </button>
      {saved && <span className="text-xs text-teal-dark">Saved.</span>}
    </form>
  );
}
