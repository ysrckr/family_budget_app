"use client";

import { useState } from "react";
import Sheet from "./Sheet";
import SubscriptionForm from "./SubscriptionForm";

export default function EditSubscriptionButton({
  sub,
  remainingCents,
  currentMonth,
}: {
  sub: { id: number; label: string; amountCents: number; cycle: string; startMonth: string };
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
      <Sheet open={open} onClose={() => setOpen(false)} title="Edit subscription">
        <SubscriptionForm
          remainingCents={remainingCents}
          currentMonth={currentMonth}
          edit={sub}
          onSaved={() => setOpen(false)}
        />
      </Sheet>
    </>
  );
}
