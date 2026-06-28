"use client";

import { useState } from "react";
import Sheet from "./Sheet";
import LoanPaymentForm from "./LoanPaymentForm";

export default function EditLoanPaymentButton({
  loanId,
  payment,
}: {
  loanId: number;
  payment: { id: number; amountCents: number; paidOn: string; note: string | null };
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
      <Sheet open={open} onClose={() => setOpen(false)} title="Edit payment">
        <LoanPaymentForm
          loanId={loanId}
          defaultAmount=""
          edit={payment}
          onSaved={() => setOpen(false)}
        />
      </Sheet>
    </>
  );
}
