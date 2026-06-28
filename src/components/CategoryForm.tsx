"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base placeholder:text-ink-soft/60 focus:border-teal";

export function CategoryForm({
  effectiveMonth,
  monthLabel,
  onSaved,
}: {
  effectiveMonth: string;
  monthLabel: string;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, budget, effectiveMonth }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not add category.");
      return;
    }
    setName("");
    setBudget("");
    router.refresh();
    onSaved?.();
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
        <input
          className={input}
          placeholder="Category (e.g. Market)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={`${input} num`}
          placeholder="Monthly budget"
          inputMode="decimal"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
        <button
          disabled={busy}
          className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
        >
          {busy ? "Adding…" : "Add category"}
        </button>
      </div>
      <p className="text-xs text-ink-soft">
        Applies from {monthLabel} onward and carries into every later month.
      </p>
      {error && <p className="text-sm text-brick">{error}</p>}
    </form>
  );
}

export function BudgetEditor({
  categoryId,
  amountCents,
  effectiveMonth,
  monthLabel,
}: {
  categoryId: number;
  amountCents: number;
  effectiveMonth: string;
  monthLabel: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(amountCents / 100));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await fetch("/api/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, budget: value, effectiveMonth }),
    });
    setBusy(false);
    setEditing(false);
    router.refresh();
  }

  function cancel() {
    setValue(String(amountCents / 100));
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="num -mx-2 -my-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-right hover:text-teal"
        title={`Set budget from ${monthLabel} onward`}
      >
        {formatMoney(amountCents)}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden className="text-ink-soft/60">
          <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2">
      <input
        autoFocus
        className="num w-28 rounded-md border border-teal bg-surface px-3 py-2 text-right text-base"
        value={value}
        inputMode="decimal"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") cancel();
        }}
      />
      <span className="inline-flex gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={cancel}
          aria-label="Cancel"
          className="grid h-10 w-10 place-items-center rounded-md border border-line text-ink-soft hover:bg-paper hover:text-ink"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </span>
    </span>
  );
}
