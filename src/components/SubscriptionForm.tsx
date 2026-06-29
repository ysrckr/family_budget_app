"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseMoneyToCents, formatMoney } from "@/lib/money";
import { monthlyCostCents } from "@/lib/subscriptions";

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base placeholder:text-ink-soft/60 focus:border-teal";

type SubEdit = {
  id: number;
  label: string;
  amountCents: number;
  cycle: string;
  startMonth: string;
};

export default function SubscriptionForm({
  remainingCents,
  currentMonth,
  edit,
  onSaved,
}: {
  remainingCents: number;
  currentMonth: string;
  edit?: SubEdit;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [label, setLabel] = useState(edit?.label ?? "");
  const [amount, setAmount] = useState(edit ? String(edit.amountCents / 100) : "");
  const [cycle, setCycle] = useState<"monthly" | "yearly">(
    edit?.cycle === "yearly" ? "yearly" : "monthly"
  );
  const [startMonth, setStartMonth] = useState(edit?.startMonth ?? currentMonth);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const amountCents = parseMoneyToCents(amount);
  const monthly = monthlyCostCents(amountCents, cycle);
  const fits = monthly > 0 && monthly <= remainingCents;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!label.trim()) return setError("Add a name.");
    if (amountCents <= 0) return setError("Add an amount.");

    setBusy(true);
    const res = await fetch("/api/subscriptions", {
      method: edit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(edit ? { id: edit.id } : {}),
        label,
        amount,
        cycle,
        startMonth,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not save.");
      return;
    }
    if (edit) {
      router.refresh();
      onSaved?.();
      return;
    }
    setLabel("");
    setAmount("");
    setCycle("monthly");
    router.refresh();
    onSaved?.();
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <label className="grid gap-1 text-xs text-ink-soft">
        Subscription
        <input
          className={input}
          placeholder="e.g. Netflix, iCloud"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setCycle("monthly")}
          className={`rounded-md border px-3 py-2.5 text-sm ${
            cycle === "monthly"
              ? "border-teal bg-teal-tint font-medium text-teal-dark"
              : "border-line text-ink-soft"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setCycle("yearly")}
          className={`rounded-md border px-3 py-2.5 text-sm ${
            cycle === "yearly"
              ? "border-teal bg-teal-tint font-medium text-teal-dark"
              : "border-line text-ink-soft"
          }`}
        >
          Yearly
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-ink-soft">
          {cycle === "yearly" ? "Amount per year" : "Amount per month"}
          <input
            className={`${input} num`}
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-xs text-ink-soft">
          {cycle === "yearly" ? "First billed" : "Started"}
          <input
            className={input}
            type="month"
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
          />
        </label>
      </div>

      {monthly > 0 && (
        <div
          className={`rounded-md px-3 py-2.5 text-sm ${
            fits ? "bg-teal-tint text-teal-dark" : "bg-brick-tint text-brick"
          }`}
        >
          <span className="num font-semibold">{formatMoney(monthly)}</span>/mo
          {cycle === "yearly" && (
            <span className="text-ink-soft">
              {" "}
              set aside ({formatMoney(amountCents)}/yr)
            </span>
          )}
          <span className="block">
            {fits
              ? `Fits — ${formatMoney(remainingCents - monthly)} of your subscriptions budget would remain.`
              : `Over your subscriptions budget by ${formatMoney(monthly - remainingCents)}.`}
          </span>
        </div>
      )}

      <div>
        <button
          disabled={busy}
          className="rounded-md bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
        >
          {busy ? "Saving…" : edit ? "Save changes" : "Add subscription"}
        </button>
        {error && <span className="ml-3 text-sm text-brick">{error}</span>}
      </div>
    </form>
  );
}
