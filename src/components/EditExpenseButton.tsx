"use client";

import { useState } from "react";
import Sheet from "./Sheet";
import ExpenseForm from "./ExpenseForm";

type Cat = { id: number; name: string };
type AllowanceCat = { id: number; owner: string };
type CardOption = {
  id: number;
  label: string;
  last4: string | null;
  cutDay: number | null;
};

export default function EditExpenseButton({
  expense,
  sharedCategories,
  allowanceCategories,
  cards,
  cutoffDay,
}: {
  expense: {
    id: number;
    categoryId: number;
    payee: string;
    amountCents: number;
    occurredOn: string;
    paymentMethod: string;
    cardId: number | null;
    description: string | null;
  };
  sharedCategories: Cat[];
  allowanceCategories: AllowanceCat[];
  cards: CardOption[];
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
      <Sheet open={open} onClose={() => setOpen(false)} title="Edit spending">
        <ExpenseForm
          sharedCategories={sharedCategories}
          allowanceCategories={allowanceCategories}
          cards={cards}
          month={expense.occurredOn.slice(0, 7)}
          cutoffDay={cutoffDay}
          edit={expense}
          onSaved={() => setOpen(false)}
        />
      </Sheet>
    </>
  );
}
