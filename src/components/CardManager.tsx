"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "./ConfirmProvider";

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base placeholder:text-ink-soft/60 focus:border-teal";

type CardOption = {
  id: number;
  label: string;
  last4: string | null;
  cutDay: number | null;
};

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function CardManager({ cards }: { cards: CardOption[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [last4, setLast4] = useState("");
  const [hasCut, setHasCut] = useState(false);
  const [cutDay, setCutDay] = useState("25");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setLabel("");
    setLast4("");
    setHasCut(false);
    setCutDay("25");
    setError("");
  }

  function startAdd() {
    reset();
    setAdding(true);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!label.trim()) {
      setError("Give the card a name.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, last4, cutDay: hasCut ? cutDay : "" }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not add card.");
      return;
    }
    reset();
    setAdding(false);
    router.refresh();
  }

  async function remove(id: number, name: string) {
    const ok = await confirm({
      message: `Remove "${name}"?`,
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    await fetch(`/api/cards?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  const cutNum = Math.min(Math.max(parseInt(cutDay || "0", 10) || 0, 1), 31);

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-medium">
          Cards{" "}
          <span className="text-sm font-normal text-ink-soft">
            ({cards.length})
          </span>
        </h2>
        {cards.length > 0 && !adding && (
          <button
            onClick={startAdd}
            className="inline-flex items-center gap-1.5 rounded-md bg-teal-tint px-3 py-1.5 text-sm font-medium text-teal-dark hover:bg-teal/15"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Add card
          </button>
        )}
      </div>

      {/* Existing cards — always visible */}
      {cards.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {cards.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-lg border border-line bg-paper px-3 py-2.5"
            >
              <span
                aria-hidden
                className="grid h-9 w-12 shrink-0 place-items-center rounded-md bg-teal-tint text-teal-dark"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M2.5 9.5h19" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {c.label}
                  {c.last4 && (
                    <span className="num text-ink-soft"> ••{c.last4}</span>
                  )}
                </div>
                <div className="text-xs text-ink-soft">
                  {c.cutDay
                    ? `Statement closes on the ${ordinal(c.cutDay)}`
                    : "No closing day — counts on the purchase date"}
                </div>
              </div>
              <button
                onClick={() => remove(c.id, c.label)}
                aria-label={`Remove ${c.label}`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-ink-soft hover:bg-brick-tint hover:text-brick"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Empty state */}
      {cards.length === 0 && !adding && (
        <div className="mt-4 rounded-lg border border-dashed border-line bg-paper px-4 py-6 text-center">
          <p className="text-sm text-ink-soft">
            No cards yet. Add one to record card spending and handle statement
            cut-off dates.
          </p>
          <button
            onClick={startAdd}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Add your first card
          </button>
        </div>
      )}

      {/* Add form */}
      {adding && (
        <form onSubmit={add} className="mt-4 grid gap-4 rounded-lg border border-line bg-paper p-4">
          <label className="grid gap-1.5 text-sm font-medium">
            Card name
            <input
              className={input}
              placeholder="e.g. Amex Gold, Joint Visa"
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium">
            Last 4 digits{" "}
            <span className="font-normal text-ink-soft">(optional)</span>
            <input
              className={`${input} num`}
              placeholder="1234"
              inputMode="numeric"
              maxLength={4}
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))}
            />
          </label>

          <div className="grid gap-2">
            <span className="text-sm font-medium">Statement closing day</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setHasCut(false)}
                className={`rounded-md border px-3 py-2.5 text-sm ${
                  !hasCut
                    ? "border-teal bg-teal-tint font-medium text-teal-dark"
                    : "border-line text-ink-soft"
                }`}
              >
                No closing day
              </button>
              <button
                type="button"
                onClick={() => setHasCut(true)}
                className={`rounded-md border px-3 py-2.5 text-sm ${
                  hasCut
                    ? "border-teal bg-teal-tint font-medium text-teal-dark"
                    : "border-line text-ink-soft"
                }`}
              >
                Closes on a day
              </button>
            </div>

            {hasCut ? (
              <div className="grid gap-2 rounded-md border border-line bg-surface p-3">
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>Closes on the</span>
                  <select
                    className="num rounded-md border border-line bg-surface px-3 py-2 text-base focus:border-teal"
                    value={cutDay}
                    onChange={(e) => setCutDay(e.target.value)}
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {ordinal(d)}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="rounded-md bg-amber-tint px-3 py-2 text-xs text-amber">
                  Purchases <strong>after the {ordinal(cutNum)}</strong> count
                  toward <strong>next month&rsquo;s</strong> budget; on or before
                  it, the current month. (Day 31 falls back to a short
                  month&rsquo;s last day.)
                </p>
              </div>
            ) : (
              <p className="text-xs text-ink-soft">
                Spending counts toward the month you bought it — same as cash.
                Use this for debit cards or cards you pay off right away.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-brick">{error}</p>}

          <div className="flex gap-2">
            <button
              disabled={busy}
              className="flex-1 rounded-md bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
            >
              {busy ? "Adding…" : "Add card"}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-md border border-line px-4 py-2.5 text-sm text-ink-soft hover:bg-surface hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
