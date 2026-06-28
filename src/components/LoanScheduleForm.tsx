"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base placeholder:text-ink-soft/60 focus:border-teal";

export default function LoanScheduleForm({
  loanId,
  currentMonth,
}: {
  loanId: number;
  currentMonth: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [effectiveMonth, setEffectiveMonth] = useState(currentMonth);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/loans/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loanId, amount, effectiveMonth }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not update schedule.");
      return;
    }
    setAmount("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-end">
      <label className="grid gap-1 text-xs text-ink-soft">
        New monthly
        <input
          className={`${input} num`}
          placeholder="0.00"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <label className="grid gap-1 text-xs text-ink-soft">
        From month
        <input
          className={input}
          type="month"
          value={effectiveMonth}
          onChange={(e) => setEffectiveMonth(e.target.value)}
        />
      </label>
      <button
        disabled={busy}
        className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-paper disabled:opacity-60"
      >
        {busy ? "Saving…" : "Update"}
      </button>
      {error && <p className="text-sm text-brick sm:col-span-3">{error}</p>}
    </form>
  );
}
