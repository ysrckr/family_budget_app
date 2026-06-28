"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";

export default function RemainingToggle({
  budgetCents,
  spentCents,
}: {
  budgetCents: number;
  spentCents: number;
}) {
  const [mode, setMode] = useState<"amount" | "percent">("amount");
  const remaining = budgetCents - spentCents;
  const positive = remaining >= 0;

  const pctLeft =
    budgetCents > 0 ? Math.round((remaining / budgetCents) * 100) : null;

  const text =
    mode === "amount"
      ? `${formatMoney(remaining)} ${positive ? "left" : "over"}`
      : pctLeft === null
      ? "no budget set"
      : `${pctLeft}% ${positive ? "left" : "over"}`;

  return (
    <button
      onClick={() => setMode((m) => (m === "amount" ? "percent" : "amount"))}
      title="Tap to switch between amount and percentage"
      className={`num rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
        positive
          ? "bg-teal-tint text-teal-dark hover:bg-teal-tint/70"
          : "bg-brick-tint text-brick hover:bg-brick-tint/70"
      }`}
    >
      {text}
    </button>
  );
}
