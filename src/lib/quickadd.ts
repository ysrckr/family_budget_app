import "server-only";
import { asc, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  savingsPots,
  loans,
  loanSchedules,
  installmentPlans,
  subscriptions,
} from "@/db/schema";
import { currentBudgetMonth } from "@/lib/money";
import {
  getInstallmentBudgetCents,
  getSubscriptionBudgetCents,
} from "@/lib/settings";
import { effectiveLoanPayments } from "@/lib/recurring";
import { isActiveIn } from "@/lib/installments";
import { monthlyCostCents, subActiveIn } from "@/lib/subscriptions";

export type QuickAddData = {
  currentMonth: string;
  pots: { id: number; name: string; currency: string }[];
  loans: { id: number; name: string; scheduledCents: number }[];
  installmentRemaining: number;
  subscriptionRemaining: number;
};

/**
 * Everything the unified "Add" form needs to morph between spending, saving,
 * installment, subscription and loan-payment shapes. Fetched once per page in
 * the TopBar and passed down to the floating add button.
 */
export async function getQuickAddData(
  cutoffDay: number | null
): Promise<QuickAddData> {
  const currentMonth = currentBudgetMonth(cutoffDay);

  const [
    potRows,
    loanRows,
    scheduleRows,
    planRows,
    subRows,
    installmentBudget,
    subscriptionBudget,
  ] = await Promise.all([
    db
      .select()
      .from(savingsPots)
      .where(isNull(savingsPots.archivedAt))
      .orderBy(asc(savingsPots.name)),
    db
      .select()
      .from(loans)
      .where(isNull(loans.archivedAt))
      .orderBy(asc(loans.name)),
    db.select().from(loanSchedules),
    db.select().from(installmentPlans),
    db.select().from(subscriptions),
    getInstallmentBudgetCents(),
    getSubscriptionBudgetCents(),
  ]);

  const scheduled = effectiveLoanPayments(scheduleRows, currentMonth);

  const installmentsCommitted = planRows
    .filter((p) => isActiveIn(p.startMonth, p.months, currentMonth))
    .reduce((s, p) => s + p.monthlyPaymentCents, 0);

  const subscriptionsCommitted = subRows
    .filter((s) => subActiveIn(s.startMonth, currentMonth))
    .reduce((s, x) => s + monthlyCostCents(x.amountCents, x.cycle), 0);

  return {
    currentMonth,
    pots: potRows.map((p) => ({
      id: p.id,
      name: p.name,
      currency: p.currency,
    })),
    loans: loanRows.map((l) => ({
      id: l.id,
      name: l.name,
      scheduledCents: scheduled.get(l.id) ?? 0,
    })),
    installmentRemaining: installmentBudget - installmentsCommitted,
    subscriptionRemaining: subscriptionBudget - subscriptionsCommitted,
  };
}
