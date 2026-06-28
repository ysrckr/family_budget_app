"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base placeholder:text-ink-soft/60 focus:border-teal";

export default function AllowanceForm({
  effectiveMonth,
  monthLabel,
  people,
}: {
  effectiveMonth: string;
  monthLabel: string;
  people: string[];
}) {
  const router = useRouter();
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/allowances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ person, amount, effectiveMonth }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not set allowance.");
      return;
    }
    setPerson("");
    setAmount("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
        <input
          className={input}
          placeholder="Person (e.g. You)"
          list="allowance-people"
          value={person}
          onChange={(e) => setPerson(e.target.value)}
        />
        <datalist id="allowance-people">
          {people.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <input
          className={`${input} num`}
          placeholder="Monthly allowance"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button
          disabled={busy}
          className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
        >
          {busy ? "Saving…" : "Set allowance"}
        </button>
      </div>
      <p className="text-xs text-ink-soft">
        Applies from {monthLabel} onward and carries into every later month.
      </p>
      {error && <p className="text-sm text-brick">{error}</p>}
    </form>
  );
}
