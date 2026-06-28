"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseMoneyToCents, formatMoney } from "@/lib/money";
import { monthlyPaymentCents } from "@/lib/installments";

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base placeholder:text-ink-soft/60 focus:border-teal";

type CardOption = { id: number; label: string; last4: string | null };

type InstallmentEdit = {
  id: number;
  label: string;
  principalCents: number | null;
  aprBps: number | null;
  months: number;
  monthlyPaymentCents: number;
  startMonth: string;
  cardId: number | null;
};

export default function InstallmentForm({
  remainingCents,
  currentMonth,
  cards,
  edit,
  onSaved,
}: {
  remainingCents: number;
  currentMonth: string;
  cards: CardOption[];
  edit?: InstallmentEdit;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [label, setLabel] = useState(edit?.label ?? "");
  const [mode, setMode] = useState<"calc" | "manual">(
    edit && edit.principalCents == null ? "manual" : "calc"
  );
  const [amount, setAmount] = useState(
    edit?.principalCents != null ? String(edit.principalCents / 100) : ""
  );
  const [apr, setApr] = useState(
    edit?.aprBps != null ? String(edit.aprBps / 100) : ""
  );
  const [months, setMonths] = useState(edit ? String(edit.months) : "");
  const [monthlyManual, setMonthlyManual] = useState(
    edit && edit.principalCents == null ? String(edit.monthlyPaymentCents / 100) : ""
  );
  const [startMonth, setStartMonth] = useState(edit?.startMonth ?? currentMonth);
  const [cardId, setCardId] = useState<number | "">(edit?.cardId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const nMonths = parseInt(months, 10) || 0;
  const aprBps = apr ? Math.round(Number(apr) * 100) : 0;
  const monthly =
    mode === "calc"
      ? monthlyPaymentCents(parseMoneyToCents(amount), nMonths, aprBps)
      : parseMoneyToCents(monthlyManual);
  const totalCost = mode === "calc" && monthly > 0 && nMonths > 0 ? monthly * nMonths : 0;
  const fits = monthly > 0 && monthly <= remainingCents;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!label.trim()) return setError("Add a name.");
    if (nMonths <= 0) return setError("Add the number of months.");
    if (monthly <= 0)
      return setError(mode === "calc" ? "Add the amount." : "Add the monthly payment.");

    setBusy(true);
    const res = await fetch("/api/installments", {
      method: edit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(edit ? { id: edit.id } : {}),
        label,
        months: nMonths,
        startMonth,
        cardId: cardId || null,
        ...(mode === "calc"
          ? { principal: amount, apr }
          : { monthlyPayment: monthlyManual }),
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
    setApr("");
    setMonths("");
    setMonthlyManual("");
    setCardId("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <label className="grid gap-1 text-xs text-ink-soft">
        What is it
        <input
          className={input}
          placeholder="e.g. Fridge, Phone"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode("calc")}
          className={`rounded-md border px-3 py-2.5 text-sm ${
            mode === "calc"
              ? "border-teal bg-teal-tint font-medium text-teal-dark"
              : "border-line text-ink-soft"
          }`}
        >
          New (calculate)
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`rounded-md border px-3 py-2.5 text-sm ${
            mode === "manual"
              ? "border-teal bg-teal-tint font-medium text-teal-dark"
              : "border-line text-ink-soft"
          }`}
        >
          Already running
        </button>
      </div>

      {mode === "calc" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-xs text-ink-soft">
            Price
            <input
              className={`${input} num`}
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs text-ink-soft">
            Months
            <input
              className={`${input} num`}
              inputMode="numeric"
              placeholder="e.g. 12"
              value={months}
              onChange={(e) => setMonths(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <label className="grid gap-1 text-xs text-ink-soft">
            APR %
            <input
              className={`${input} num`}
              inputMode="decimal"
              placeholder="e.g. 0"
              value={apr}
              onChange={(e) => setApr(e.target.value)}
            />
          </label>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-xs text-ink-soft">
            Monthly payment
            <input
              className={`${input} num`}
              inputMode="decimal"
              placeholder="0.00"
              value={monthlyManual}
              onChange={(e) => setMonthlyManual(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs text-ink-soft">
            Months total
            <input
              className={`${input} num`}
              inputMode="numeric"
              placeholder="e.g. 12"
              value={months}
              onChange={(e) => setMonths(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <label className="grid gap-1 text-xs text-ink-soft">
            Started
            <input
              className={input}
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
            />
          </label>
        </div>
      )}

      {mode === "calc" && (
        <label className="grid gap-1 text-xs text-ink-soft sm:max-w-[12rem]">
          First payment month
          <input
            className={input}
            type="month"
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
          />
        </label>
      )}

      {cards.length > 0 && (
        <label className="grid gap-1 text-xs text-ink-soft sm:max-w-[14rem]">
          Card (optional)
          <select
            className={input}
            value={cardId}
            onChange={(e) =>
              setCardId(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">— no card</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
                {c.last4 ? ` ••${c.last4}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Live calculator preview */}
      {monthly > 0 && nMonths > 0 && (
        <div
          className={`rounded-md px-3 py-2.5 text-sm ${
            fits ? "bg-teal-tint text-teal-dark" : "bg-brick-tint text-brick"
          }`}
        >
          <span className="num font-semibold">{formatMoney(monthly)}</span>/mo for{" "}
          {nMonths} months
          {totalCost > 0 && (
            <span className="text-ink-soft">
              {" "}
              · total {formatMoney(totalCost)}
            </span>
          )}
          <span className="block">
            {fits
              ? `Fits — ${formatMoney(remainingCents - monthly)} of your installments budget would remain.`
              : `Over your installments budget by ${formatMoney(monthly - remainingCents)}.`}
          </span>
        </div>
      )}

      <div>
        <button
          disabled={busy}
          className="rounded-md bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
        >
          {busy ? "Saving…" : edit ? "Save changes" : "Add installment"}
        </button>
        {error && <span className="ml-3 text-sm text-brick">{error}</span>}
      </div>
    </form>
  );
}
