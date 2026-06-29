"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  todayISO,
  monthLabel,
  billingMonthFor,
  parseMoneyToCents,
  APP_CURRENCY,
} from "@/lib/money";
import SetupNotice from "./SetupNotice";

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base placeholder:text-ink-soft/60 focus:border-teal";

export default function SavingsForm({
  pots,
  cutoffDay = null,
  edit,
  onSaved,
  manageHref,
  onNavigate,
}: {
  pots: { id: number; name: string; currency: string }[];
  cutoffDay?: number | null;
  edit?: {
    id: number;
    potId: number;
    txnType: string;
    amountCents: number;
    occurredOn: string;
    inBudget: boolean;
    note: string | null;
  };
  onSaved?: () => void;
  // When set (e.g. in the quick-add sheet), the "no pots yet" notice shows a
  // button to this page. On the Savings page itself the pot form is inline, so
  // it's omitted.
  manageHref?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [potId, setPotId] = useState(edit?.potId ?? pots[0]?.id ?? 0);
  const [type, setType] = useState<"deposit" | "withdrawal">(
    edit?.txnType === "withdrawal" ? "withdrawal" : "deposit"
  );
  const [amount, setAmount] = useState(edit ? String(edit.amountCents / 100) : "");
  const [date, setDate] = useState(edit?.occurredOn ?? todayISO());
  const [fromBudget, setFromBudget] = useState(edit?.inBudget ?? false);
  const [recurring, setRecurring] = useState(false);
  const [note, setNote] = useState(edit?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (pots.length === 0) {
    return manageHref ? (
      <SetupNotice
        message="Create a savings pot first, then add money to it."
        href={manageHref}
        action="Go to Savings"
        onNavigate={onNavigate}
      />
    ) : (
      <p className="rounded-md border border-line bg-paper px-4 py-3 text-sm text-ink-soft">
        Create a savings pot first, then add money to it.
      </p>
    );
  }

  const potCurrency =
    pots.find((p) => p.id === potId)?.currency ?? APP_CURRENCY;
  const isForeign = potCurrency !== APP_CURRENCY;
  // "From budget" only makes sense for an app-currency pot (no FX).
  const inBudget = type === "deposit" && fromBudget && !isForeign;
  const billing = inBudget ? billingMonthFor(date, cutoffDay) : null;
  const rolls = billing !== null && billing !== date.slice(0, 7);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (parseMoneyToCents(amount) <= 0) {
      setError("Enter an amount.");
      return;
    }
    setBusy(true);
    const isRecurring = !edit && type === "deposit" && recurring;
    const res = edit
      ? await fetch("/api/savings/txns", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: edit.id,
            potId,
            amount,
            txnType: type,
            occurredOn: date,
            inBudget,
            note,
          }),
        })
      : isRecurring
      ? await fetch("/api/savings/recurring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            potId,
            amount,
            inBudget,
            startMonth: date.slice(0, 7),
          }),
        })
      : await fetch("/api/savings/txns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            potId,
            amount,
            txnType: type,
            occurredOn: date,
            inBudget,
            note,
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
    setAmount("");
    setNote("");
    setDate(todayISO());
    setFromBudget(false);
    setRecurring(false);
    router.refresh();
    onSaved?.();
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      {/* deposit / withdraw toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setType("deposit")}
          className={`rounded-md border px-3 py-2.5 text-sm ${
            type === "deposit"
              ? "border-teal bg-teal-tint font-medium text-teal-dark"
              : "border-line text-ink-soft"
          }`}
        >
          Deposit
        </button>
        <button
          type="button"
          onClick={() => {
            setType("withdrawal");
            setFromBudget(false);
          }}
          className={`rounded-md border px-3 py-2.5 text-sm ${
            type === "withdrawal"
              ? "border-teal bg-teal-tint font-medium text-teal-dark"
              : "border-line text-ink-soft"
          }`}
        >
          Withdraw
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-ink-soft">
          Pot
          <select
            className={input}
            value={potId}
            onChange={(e) => {
              setPotId(Number(e.target.value));
              setFromBudget(false);
            }}
          >
            {pots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.currency !== APP_CURRENCY ? ` (${p.currency})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs text-ink-soft">
          Amount{isForeign ? ` (${potCurrency})` : ""}
          <input
            className={`${input} num`}
            placeholder="0.00"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        <label className="grid gap-1 text-xs text-ink-soft">
          Date
          <input
            className={input}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label className="grid gap-1 text-xs text-ink-soft">
          Note (optional)
          <input
            className={input}
            placeholder="What's it for?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </div>

      {/* From-budget toggle — deposits into an app-currency pot only */}
      {type === "deposit" && !isForeign && (
        <label className="flex items-start gap-3 rounded-md border border-line bg-paper px-3 py-2.5">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 accent-teal"
            checked={fromBudget}
            onChange={(e) => setFromBudget(e.target.checked)}
          />
          <span className="text-sm">
            <span className="font-medium">This came from our budget</span>
            <span className="block text-xs text-ink-soft">
              Reduces this month&rsquo;s &ldquo;Left to spend&rdquo;. Leave off
              for money saved from outside the budget.
            </span>
          </span>
        </label>
      )}

      {/* Recurring toggle — deposits only (not when editing an existing entry) */}
      {!edit && type === "deposit" && (
        <label className="flex items-start gap-3 rounded-md border border-line bg-paper px-3 py-2.5">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 accent-teal"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
          />
          <span className="text-sm">
            <span className="font-medium">Repeat every month</span>
            <span className="block text-xs text-ink-soft">
              Automatically adds this amount to the pot each month
              {inBudget ? " and out of “Left to spend”" : ""}, until you stop it.
            </span>
          </span>
        </label>
      )}

      {rolls && !recurring && (
        <p className="rounded-md bg-amber-tint px-3 py-2 text-sm text-amber">
          After the monthly cutoff — counts toward{" "}
          <strong>{monthLabel(billing!)}</strong>&rsquo;s budget.
        </p>
      )}

      <div>
        <button
          disabled={busy}
          className="rounded-md bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
        >
          {busy
            ? "Saving…"
            : edit
            ? "Save changes"
            : type === "withdrawal"
            ? "Withdraw"
            : recurring
            ? "Start monthly saving"
            : "Add to savings"}
        </button>
        {error && <span className="ml-3 text-sm text-brick">{error}</span>}
      </div>
    </form>
  );
}
