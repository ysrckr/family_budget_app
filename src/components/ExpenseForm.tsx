"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  daysInMonth,
  defaultDay,
  monthLabel,
  billingMonthFor,
} from "@/lib/money";

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base placeholder:text-ink-soft/60 focus:border-teal";

type Cat = { id: number; name: string };
type AllowanceCat = { id: number; owner: string };
type CardOption = {
  id: number;
  label: string;
  last4: string | null;
  cutDay: number | null;
};

export default function ExpenseForm({
  sharedCategories,
  allowanceCategories,
  cards,
  month,
  cutoffDay = null,
  defaultCategoryId,
  onSaved,
}: {
  sharedCategories: Cat[];
  allowanceCategories: AllowanceCat[];
  cards: CardOption[];
  month: string; // "YYYY-MM" — the viewed (purchase) month
  // Household budget-cycle cutoff: cash / no-closing-day cards after this day
  // roll to next month. A card's own cut day overrides it.
  cutoffDay?: number | null;
  defaultCategoryId?: number;
  // Called after a successful save (used by the quick-add sheet to close + toast).
  onSaved?: (info: { billingMonth: string; rolled: boolean }) => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const totalDays = daysInMonth(month);
  const hasCategories =
    sharedCategories.length + allowanceCategories.length > 0;
  const firstId =
    defaultCategoryId ??
    sharedCategories[0]?.id ??
    allowanceCategories[0]?.id ??
    0;

  const [categoryId, setCategoryId] = useState(firstId);
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState(defaultDay(month));
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [cardId, setCardId] = useState<number>(cards[0]?.id ?? 0);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedCard =
    method === "card" ? cards.find((c) => c.id === cardId) : undefined;
  const occurredOn = `${month}-${String(day).padStart(2, "0")}`;
  // A card's own cut day wins; otherwise (cash, or a card with no cut day) the
  // household cutoff day applies.
  const usingCardCut = method === "card" && selectedCard?.cutDay != null;
  const effectiveCut = usingCardCut ? selectedCard!.cutDay : cutoffDay;
  const billing = billingMonthFor(occurredOn, effectiveCut);
  const rolls = billing !== month;

  async function uploadReceipt(file: File): Promise<string> {
    const presignRes = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
      }),
    });
    if (!presignRes.ok) {
      const d = await presignRes.json().catch(() => ({}));
      throw new Error(d.error || "Could not prepare upload.");
    }
    const { url, key } = await presignRes.json();
    const put = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!put.ok) throw new Error("Upload to storage failed.");
    return key as string;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (method === "card" && !cardId) {
      setError("Add a card below, then choose it.");
      return;
    }
    setBusy(true);
    try {
      let receiptKey: string | null = null;
      const file = fileRef.current?.files?.[0];
      if (file) receiptKey = await uploadReceipt(file);

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          payee,
          amount,
          occurredOn,
          description,
          receiptKey,
          paymentMethod: method,
          cardId: method === "card" ? cardId : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Could not save spending.");
      }
      const data = await res.json().catch(() => ({}));
      const billedTo: string = data.billingMonth || billing;
      if (billedTo !== month) {
        setNotice(
          `Saved to ${monthLabel(billedTo)} (after the card's cut date) — switch to that month to see it.`
        );
      }
      setPayee("");
      setAmount("");
      setDescription("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
      onSaved?.({ billingMonth: billedTo, rolled: billedTo !== month });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (!hasCategories) {
    return (
      <p className="rounded-md border border-line bg-paper px-4 py-3 text-sm text-ink-soft">
        Create a budget category or an allowance first, then record spending.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-xs text-ink-soft">
        Comes out of
        <select
          className={input}
          value={categoryId}
          onChange={(e) => setCategoryId(Number(e.target.value))}
        >
          {sharedCategories.length > 0 && (
            <optgroup label="Shared budget">
              {sharedCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          )}
          {allowanceCategories.length > 0 && (
            <optgroup label="Allowances">
              {allowanceCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.owner}&rsquo;s allowance
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>

      <label className="grid gap-1 text-xs text-ink-soft">
        Payee
        <input
          className={input}
          placeholder="e.g. Walmart"
          value={payee}
          onChange={(e) => setPayee(e.target.value)}
        />
      </label>

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
        Day of {monthLabel(month)}
        <select
          className={input}
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
        >
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-xs text-ink-soft">
        Paid with
        <select
          className={input}
          value={method}
          onChange={(e) => setMethod(e.target.value as "cash" | "card")}
        >
          <option value="cash">Cash</option>
          <option value="card">Card</option>
        </select>
      </label>

      {method === "card" && (
        <label className="grid gap-1 text-xs text-ink-soft">
          Which card
          {cards.length === 0 ? (
            <span className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink-soft">
              No cards yet — add one below.
            </span>
          ) : (
            <select
              className={input}
              value={cardId}
              onChange={(e) => setCardId(Number(e.target.value))}
            >
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                  {c.last4 ? ` ••${c.last4}` : ""}
                </option>
              ))}
            </select>
          )}
        </label>
      )}

      {/* Billing-month hint when the purchase rolls into the next month */}
      {rolls && (
        <p className="sm:col-span-2 rounded-md bg-amber-tint px-3 py-2 text-sm text-amber">
          After the {usingCardCut ? "card’s closing day" : "monthly cutoff"}{" "}
          — counts toward <strong>{monthLabel(billing)}</strong>&rsquo;s budget.
        </p>
      )}

      <label className="grid gap-1 text-xs text-ink-soft sm:col-span-2">
        Description (optional)
        <input
          className={input}
          placeholder="What was it for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <label className="grid gap-1 text-xs text-ink-soft sm:col-span-2">
        Receipt (optional)
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-teal-tint file:px-3 file:py-1.5 file:text-sm file:text-teal-dark"
        />
      </label>

      <div className="sm:col-span-2">
        <button
          disabled={busy}
          className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
        >
          {busy ? "Saving…" : "Record spending"}
        </button>
        {error && <span className="ml-3 text-sm text-brick">{error}</span>}
      </div>

      {notice && (
        <p className="sm:col-span-2 rounded-md bg-teal-tint px-3 py-2 text-sm text-teal-dark">
          {notice}
        </p>
      )}
    </form>
  );
}
