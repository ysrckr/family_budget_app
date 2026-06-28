"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base placeholder:text-ink-soft/60 focus:border-teal";

type IncomeEdit = {
  id: number;
  source: string;
  amountCents: number;
  occurredOn: string;
  note: string | null;
};

export default function IncomeForm({
  today,
  edit,
  onSaved,
}: {
  today: string;
  edit?: IncomeEdit;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [source, setSource] = useState(edit?.source ?? "");
  const [amount, setAmount] = useState(edit ? String(edit.amountCents / 100) : "");
  const [occurredOn, setOccurredOn] = useState(edit?.occurredOn ?? today);
  const [note, setNote] = useState(edit?.note ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/incomes", {
      method: edit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        edit
          ? { id: edit.id, source, amount, occurredOn, note }
          : { source, amount, occurredOn, note }
      ),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not save income.");
      return;
    }
    if (edit) {
      router.refresh();
      onSaved?.();
      return;
    }
    setSource("");
    setAmount("");
    setNote("");
    setOccurredOn(today);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_140px_150px_auto]">
      <input
        className={input}
        placeholder="Source (e.g. Salary)"
        value={source}
        onChange={(e) => setSource(e.target.value)}
      />
      <input
        className={`${input} num`}
        placeholder="Amount"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <input
        className={input}
        type="date"
        value={occurredOn}
        onChange={(e) => setOccurredOn(e.target.value)}
      />
      <button
        disabled={busy}
        className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
      >
        {busy ? "Saving…" : edit ? "Save changes" : "Add income"}
      </button>
      <input
        className={`${input} sm:col-span-4`}
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {error && (
        <p className="text-sm text-brick sm:col-span-4">{error}</p>
      )}
    </form>
  );
}
