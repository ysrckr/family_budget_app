"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ExpenseForm from "./ExpenseForm";
import { monthKey, monthLabel, shiftMonth } from "@/lib/money";

type Cat = { id: number; name: string };
type AllowanceCat = { id: number; owner: string };
type CardOption = {
  id: number;
  label: string;
  last4: string | null;
  cutDay: number | null;
};

/**
 * A floating "+" button, present on every page, that opens a quick spending
 * entry. On phones it's a bottom sheet; on wider screens a centered dialog.
 * Reuses ExpenseForm so the cut-date logic, receipt upload and validation are
 * identical to the Spending page. Defaults to the current month.
 */
export default function QuickAddSpending({
  sharedCategories,
  allowanceCategories,
  cards,
  cutoffDay = null,
}: {
  sharedCategories: Cat[];
  allowanceCategories: AllowanceCat[];
  cards: CardOption[];
  cutoffDay?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Which month the spending is added to. Defaults to the current month but can
  // be changed — e.g. spending end-of-June money that belongs to July's budget.
  const [month, setMonth] = useState(monthKey());

  useEffect(() => setMounted(true), []);

  function openSheet() {
    setMonth(monthKey()); // reset to the current month each time it opens
    setOpen(true);
  }

  // Esc to close + lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Auto-dismiss the confirmation toast.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  function handleSaved(info: { billingMonth: string; rolled: boolean }) {
    setOpen(false);
    if (info.rolled) {
      setToast(
        `Saved — counts toward ${monthLabel(info.billingMonth)} (after the card's cut date).`
      );
    } else if (info.billingMonth !== monthKey()) {
      setToast(`Spending added to ${monthLabel(info.billingMonth)}.`);
    } else {
      setToast("Spending added.");
    }
  }

  return (
    <>
      {/* Floating action button — fixed, with iOS safe-area padding. */}
      <button
        type="button"
        onClick={openSheet}
        aria-label="Add spending"
        aria-haspopup="dialog"
        className="fixed right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-teal text-white shadow-card transition-transform hover:bg-teal-dark active:scale-95"
        style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label="Add spending"
          >
            <div
              className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div className="relative flex max-h-[90vh] w-full animate-sheet-up flex-col overflow-hidden rounded-t-2xl bg-surface shadow-card sm:m-4 sm:max-w-lg sm:rounded-2xl">
              {/* drag handle (mobile affordance) */}
              <div
                aria-hidden
                className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line sm:hidden"
              />
              <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3.5">
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  Add spending
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="grid h-8 w-8 place-items-center rounded-md text-ink-soft hover:bg-paper hover:text-ink"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              <div
                className="overflow-y-auto px-5 py-5"
                style={{
                  paddingBottom:
                    "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
                }}
              >
                {/* Month picker — add to a different month than today (e.g. log
                    end-of-June money against July's budget). */}
                <div className="mb-4 flex items-center justify-between rounded-lg border border-line bg-paper px-2 py-2">
                  <button
                    type="button"
                    onClick={() => setMonth((m) => shiftMonth(m, -1))}
                    aria-label="Previous month"
                    className="grid h-8 w-8 place-items-center rounded-md text-ink-soft hover:bg-surface hover:text-ink"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <div className="flex flex-col items-center leading-tight">
                    <span className="text-sm font-medium text-ink">
                      {monthLabel(month)}
                    </span>
                    {month !== monthKey() && (
                      <span className="text-[0.7rem] text-teal-dark">
                        adding to this month
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMonth((m) => shiftMonth(m, 1))}
                    aria-label="Next month"
                    className="grid h-8 w-8 place-items-center rounded-md text-ink-soft hover:bg-surface hover:text-ink"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>

                <ExpenseForm
                  key={month}
                  sharedCategories={sharedCategories}
                  allowanceCategories={allowanceCategories}
                  cards={cards}
                  month={month}
                  cutoffDay={cutoffDay}
                  onSaved={handleSaved}
                />
              </div>
            </div>
          </div>,
          document.body
        )}

      {toast &&
        mounted &&
        createPortal(
          <div
            className="fixed left-1/2 z-50 -translate-x-1/2 animate-fade-in rounded-full bg-ink px-4 py-2 text-sm text-surface shadow-card"
            style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))" }}
            role="status"
          >
            {toast}
          </div>,
          document.body
        )}
    </>
  );
}
