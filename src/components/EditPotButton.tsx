"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sheet from "./Sheet";

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base placeholder:text-ink-soft/60 focus:border-teal";

export default function EditPotButton({
  pot,
}: {
  pot: { id: number; name: string; targetCents: number | null };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(pot.name);
  const [target, setTarget] = useState(
    pot.targetCents != null ? String(pot.targetCents / 100) : ""
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/savings/pots", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pot.id, name, target }),
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
      <Sheet open={open} onClose={() => setOpen(false)} title="Edit pot">
        <form onSubmit={save} className="grid gap-3">
          <label className="grid gap-1 text-xs text-ink-soft">
            Pot name
            <input
              className={input}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
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
