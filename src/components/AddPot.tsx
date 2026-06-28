"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base placeholder:text-ink-soft/60 focus:border-teal";

export default function AddPot() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [initial, setInitial] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/savings/pots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, target, initial }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not create pot.");
      return;
    }
    setName("");
    setTarget("");
    setInitial("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-dashed border-line px-3 py-1.5 text-sm text-ink-soft hover:border-teal hover:text-teal"
      >
        + New pot
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-lg border border-line bg-paper p-4"
    >
      <label className="grid gap-1 text-xs text-ink-soft">
        Pot name
        <input
          className={input}
          placeholder="e.g. Emergency fund, Japan trip"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-ink-soft">
          Goal (optional)
          <input
            className={`${input} num`}
            placeholder="Target"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-xs text-ink-soft">
          Starting balance (optional)
          <input
            className={`${input} num`}
            placeholder="Already saved"
            inputMode="decimal"
            value={initial}
            onChange={(e) => setInitial(e.target.value)}
          />
        </label>
      </div>
      <p className="text-xs text-ink-soft">
        Starting balance is money already in this pot — it seeds the balance and
        won&rsquo;t reduce your budget.
      </p>
      <div className="flex gap-2">
        <button
          disabled={busy}
          className="rounded-md bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
        >
          {busy ? "Adding…" : "Create"}
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
