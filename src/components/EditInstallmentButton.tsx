"use client";

import { useState } from "react";
import Sheet from "./Sheet";
import InstallmentForm from "./InstallmentForm";

type CardOption = { id: number; label: string; last4: string | null };

export default function EditInstallmentButton({
  plan,
  cards,
  remainingCents,
  currentMonth,
}: {
  plan: {
    id: number;
    label: string;
    principalCents: number | null;
    aprBps: number | null;
    months: number;
    monthlyPaymentCents: number;
    startMonth: string;
    cardId: number | null;
  };
  cards: CardOption[];
  remainingCents: number;
  currentMonth: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[40px] items-center rounded-md px-3 py-2 text-sm text-ink-soft hover:bg-teal-tint hover:text-teal-dark"
      >
        Edit
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Edit installment">
        <InstallmentForm
          remainingCents={remainingCents}
          currentMonth={currentMonth}
          cards={cards}
          edit={plan}
          onSaved={() => setOpen(false)}
        />
      </Sheet>
    </>
  );
}
