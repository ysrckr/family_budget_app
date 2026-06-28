"use client";

import { useState } from "react";
import Sheet from "./Sheet";
import IncomeForm from "./IncomeForm";

export default function EditIncomeButton({
  income,
}: {
  income: {
    id: number;
    source: string;
    amountCents: number;
    occurredOn: string;
    note: string | null;
  };
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
      <Sheet open={open} onClose={() => setOpen(false)} title="Edit income">
        <IncomeForm
          today={income.occurredOn}
          edit={income}
          onSaved={() => setOpen(false)}
        />
      </Sheet>
    </>
  );
}
