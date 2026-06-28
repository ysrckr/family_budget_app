"use client";

import { useState } from "react";
import Sheet from "./Sheet";
import SavingsForm from "./SavingsForm";

export default function EditSavingsTxnButton({
  txn,
  pots,
  cutoffDay,
}: {
  txn: {
    id: number;
    potId: number;
    txnType: string;
    amountCents: number;
    occurredOn: string;
    inBudget: boolean;
    note: string | null;
  };
  pots: { id: number; name: string; currency: string }[];
  cutoffDay: number | null;
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
      <Sheet open={open} onClose={() => setOpen(false)} title="Edit savings entry">
        <SavingsForm
          pots={pots}
          cutoffDay={cutoffDay}
          edit={txn}
          onSaved={() => setOpen(false)}
        />
      </Sheet>
    </>
  );
}
