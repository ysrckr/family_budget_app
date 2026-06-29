"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ExpenseForm from "./ExpenseForm";
import SavingsForm from "./SavingsForm";
import InstallmentForm from "./InstallmentForm";
import SubscriptionForm from "./SubscriptionForm";
import LoanPaymentForm from "./LoanPaymentForm";
import SetupNotice from "./SetupNotice";
import { monthKey, monthLabel, shiftMonth } from "@/lib/money";

type Cat = { id: number; name: string };
type AllowanceCat = { id: number; owner: string };
type CardOption = {
  id: number;
  label: string;
  last4: string | null;
  cutDay: number | null;
};
type Pot = { id: number; name: string; currency: string };
type LoanOption = { id: number; name: string; scheduledCents: number };

type AddType = "spending" | "saving" | "installment" | "subscription" | "loan";

const TYPES: { key: AddType; label: string }[] = [
  { key: "spending", label: "Spending" },
  { key: "saving", label: "Saving" },
  { key: "installment", label: "Installment" },
  { key: "subscription", label: "Subscription" },
  { key: "loan", label: "Loan payment" },
];

const TITLES: Record<AddType, string> = {
  spending: "Add spending",
  saving: "Add to savings",
  installment: "Add installment",
  subscription: "Add subscription",
  loan: "Record loan payment",
};

/**
 * A floating "+" button, present on every page, that opens one entry form which
 * morphs between spending, saving, installment, subscription and loan-payment
 * shapes via a type picker. Each shape reuses the same form component as its
 * dedicated page, so validation/cut-date/calculation logic stays identical.
 */
export default function QuickAddSpending({
  sharedCategories,
  allowanceCategories,
  cards,
  cutoffDay = null,
  pots,
  loans,
  installmentRemaining,
  subscriptionRemaining,
  currentMonth,
}: {
  sharedCategories: Cat[];
  allowanceCategories: AllowanceCat[];
  cards: CardOption[];
  cutoffDay?: number | null;
  pots: Pot[];
  loans: LoanOption[];
  installmentRemaining: number;
  subscriptionRemaining: number;
  currentMonth: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [type, setType] = useState<AddType>("spending");
  // Which month spending is added to. Defaults to current; can be changed —
  // e.g. logging end-of-June money against July's budget.
  const [month, setMonth] = useState(monthKey());
  const [loanId, setLoanId] = useState<number>(loans[0]?.id ?? 0);

  useEffect(() => setMounted(true), []);

  function openSheet() {
    setType("spending");
    setMonth(monthKey());
    setLoanId(loans[0]?.id ?? 0);
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

  function handleSpendingSaved(info: { billingMonth: string; rolled: boolean }) {
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

  function done(message: string) {
    setOpen(false);
    setToast(message);
  }

  const selectedLoan = loans.find((l) => l.id === loanId);
  const loanDefault =
    selectedLoan && selectedLoan.scheduledCents > 0
      ? String(selectedLoan.scheduledCents / 100)
      : "";

  return (
    <>
      {/* Floating action button — fixed, with iOS safe-area padding. */}
      <button
        type="button"
        onClick={openSheet}
        aria-label="Add"
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
            aria-label="Add"
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
                  {TITLES[type]}
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
                {/* Type picker — morphs the form below. */}
                <div className="mb-4 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                  {TYPES.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setType(t.key)}
                      className={`rounded-md border px-2 py-2 text-xs font-medium leading-tight transition-colors ${
                        type === t.key
                          ? "border-teal bg-teal-tint text-teal-dark"
                          : "border-line text-ink-soft hover:bg-paper"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {type === "spending" && (
                  <>
                    {/* Month picker — log against a different month than today. */}
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
                      onSaved={handleSpendingSaved}
                      onNavigate={() => setOpen(false)}
                    />
                  </>
                )}

                {type === "saving" && (
                  <SavingsForm
                    pots={pots}
                    cutoffDay={cutoffDay}
                    onSaved={() => done("Saved to savings.")}
                    manageHref="/savings"
                    onNavigate={() => setOpen(false)}
                  />
                )}

                {type === "installment" && (
                  <InstallmentForm
                    remainingCents={installmentRemaining}
                    currentMonth={currentMonth}
                    cards={cards.map((c) => ({
                      id: c.id,
                      label: c.label,
                      last4: c.last4,
                    }))}
                    onSaved={() => done("Installment added.")}
                  />
                )}

                {type === "subscription" && (
                  <SubscriptionForm
                    remainingCents={subscriptionRemaining}
                    currentMonth={currentMonth}
                    onSaved={() => done("Subscription added.")}
                  />
                )}

                {type === "loan" &&
                  (loans.length === 0 ? (
                    <SetupNotice
                      message="Add a loan first, then record payments against it."
                      href="/loans"
                      action="Go to Loans"
                      onNavigate={() => setOpen(false)}
                    />
                  ) : (
                    <div className="grid gap-3">
                      <label className="grid gap-1 text-xs text-ink-soft">
                        Which loan
                        <select
                          className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base focus:border-teal"
                          value={loanId}
                          onChange={(e) => setLoanId(Number(e.target.value))}
                        >
                          {loans.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <LoanPaymentForm
                        key={loanId}
                        loanId={loanId}
                        defaultAmount={loanDefault}
                        onSaved={() => done("Payment recorded.")}
                      />
                    </div>
                  ))}
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
