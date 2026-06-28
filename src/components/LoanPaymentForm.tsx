"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { todayISO } from "@/lib/money";

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base placeholder:text-ink-soft/60 focus:border-teal";

export default function LoanPaymentForm({
  loanId,
  defaultAmount,
}: {
  loanId: number;
  defaultAmount: string; // major units, e.g. "1500"
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(defaultAmount);
  const [paidOn, setPaidOn] = useState(todayISO());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/loans/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loanId, amount, paidOn, note }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not record payment.");
      return;
    }
    setNote("");
    setAmount(defaultAmount);
    setPaidOn(todayISO());
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-end">
      <label className="grid gap-1 text-xs text-ink-soft">
        Amount
        <input
          className={`${input} num`}
          placeholder="0.00"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <label className="grid gap-1 text-xs text-ink-soft">
        Paid on
        <input
          className={input}
          type="date"
          value={paidOn}
          onChange={(e) => setPaidOn(e.target.value)}
        />
      </label>
      <button
        disabled={busy}
        className="rounded-md bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
      >
        {busy ? "Saving…" : "Record payment"}
      </button>
      {error && <p className="text-sm text-brick sm:col-span-3">{error}</p>}
    </form>
  );
}
