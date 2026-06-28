"use client";

import { useState } from "react";
import { CategoryForm } from "./CategoryForm";

export default function AddCategory({
  effectiveMonth,
  monthLabel,
}: {
  effectiveMonth: string;
  monthLabel: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-dashed border-line px-3 py-1.5 text-sm text-ink-soft hover:border-teal hover:text-teal"
      >
        + New envelope
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-medium">New envelope</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-sm text-ink-soft hover:text-ink"
        >
          Close
        </button>
      </div>
      <CategoryForm effectiveMonth={effectiveMonth} monthLabel={monthLabel} />
    </div>
  );
}
