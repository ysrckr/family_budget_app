import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  date,
  boolean,
} from "drizzle-orm/pg-core";

// Created automatically on first Google sign-in (whitelisted emails only).
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Recurring, effective-dated settings -----------------------------------
// Both salaries and budgets are "standing" settings: set once, they apply to
// every month automatically. To change one you add a new row with a later
// effectiveFrom. Any month uses the latest row whose effectiveFrom <= that
// month, so past months keep their old figure and future months pick up the new.

export const salaries = pgTable("salaries", {
  id: serial("id").primaryKey(),
  person: text("person").notNull(),
  amountCents: integer("amount_cents").notNull(),
  effectiveFrom: date("effective_from", { mode: "string" }).notNull(), // "YYYY-MM-01"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Fixed recurring monthly costs (rent, internet, …). Effective-dated like
// salaries: set once and it applies every month until you add a later row with
// a new amount. Comes straight out of "Left to spend" — never logged as a
// manual expense.
export const fixedCosts = pgTable("fixed_costs", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  amountCents: integer("amount_cents").notNull(),
  effectiveFrom: date("effective_from", { mode: "string" }).notNull(), // "YYYY-MM-01"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// A budget envelope. Two kinds:
//   - "shared":    a household envelope (Market, Subs, Rent, ...)
//   - "allowance": one person's personal spending money; `owner` is the person.
// Everything is shared/visible to both; allowances just track each person's pool.
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("shared"), // "shared" | "allowance"
  owner: text("owner"), // person label for allowance envelopes; null for shared
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// The monthly amount for an envelope (shared budget OR an allowance), effective-dated.
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .references(() => categories.id, { onDelete: "cascade" })
    .notNull(),
  amountCents: integer("amount_cents").notNull(),
  effectiveFrom: date("effective_from", { mode: "string" }).notNull(), // "YYYY-MM-01"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Payment cards that card spending can be attributed to.
export const cards = pgTable("cards", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(), // e.g. "Amex Gold", "Joint Visa"
  last4: text("last4"), // optional last 4 digits
  cutDay: integer("cut_day"), // statement closing day 1-31 for credit cards; null = no shift
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Household-wide key/value settings. Currently holds "cutoff_day": the day of
// the month after which spending rolls into next month's budget (the pay/budget
// cycle). Cash and cards without their own closing day follow this.
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Transactions ----------------------------------------------------------

// One-off extra income on top of salary (bonus, freelance, gift).
export const incomes = pgTable("incomes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  source: text("source").notNull(),
  amountCents: integer("amount_cents").notNull(),
  occurredOn: date("occurred_on", { mode: "string" }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// A single spend taken out of an envelope (shared category or an allowance).
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .references(() => categories.id, { onDelete: "cascade" })
    .notNull(),
  // Who entered it (kept for the record; not shown in the UI).
  userId: integer("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  payee: text("payee").notNull(),
  amountCents: integer("amount_cents").notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"), // "cash" | "card"
  cardId: integer("card_id").references(() => cards.id, {
    onDelete: "set null",
  }),
  description: text("description"),
  occurredOn: date("occurred_on", { mode: "string" }).notNull(),
  // Which budget month this counts toward. Equal to occurredOn's month for cash/
  // debit; for a credit card it can roll to the next month based on the cut day.
  billingMonth: text("billing_month"), // "YYYY-MM", set at write time
  receiptKey: text("receipt_key"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Savings ---------------------------------------------------------------
// A savings pot/goal. Balance is derived = SUM(signed savings_txns). A null
// target is an open-ended pot (no progress bar). Soft-closed via archivedAt.
export const savingsPots = pgTable("savings_pots", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  targetCents: integer("target_cents"), // null = open-ended pot
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// A single movement on a pot. `inBudget` is load-bearing: a true deposit means
// the money came FROM the household budget and reduces "Left to spend" that
// month. Withdrawals are always inBudget=false (server-enforced). billingMonth
// is set (server-side, cutoff-aware) ONLY for in-budget deposits.
export const savingsTxns = pgTable("savings_txns", {
  id: serial("id").primaryKey(),
  potId: integer("pot_id")
    .references(() => savingsPots.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  txnType: text("txn_type").notNull(), // "deposit" | "withdrawal"
  amountCents: integer("amount_cents").notNull(), // always positive
  inBudget: boolean("in_budget").notNull().default(false),
  occurredOn: date("occurred_on", { mode: "string" }).notNull(),
  billingMonth: text("billing_month"), // "YYYY-MM", set only for in-budget deposits
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Loans -----------------------------------------------------------------
// A loan paid OUTSIDE the household budget — never queried by Overview totals.
// originalPrincipal is the payoff-bar denominator; openingBalance is the
// remaining balance when tracking started (lets you track a mid-life loan).
export const loans = pgTable("loans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  originalPrincipalCents: integer("original_principal_cents").notNull(),
  openingBalanceCents: integer("opening_balance_cents").notNull(),
  startMonth: text("start_month"), // "YYYY-MM", first scheduled payment
  termMonths: integer("term_months"),
  archivedAt: timestamp("archived_at"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// The recurring scheduled monthly payment, effective-dated like salaries.
export const loanSchedules = pgTable("loan_schedules", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id")
    .references(() => loans.id, { onDelete: "cascade" })
    .notNull(),
  amountCents: integer("amount_cents").notNull(),
  effectiveFrom: date("effective_from", { mode: "string" }).notNull(), // "YYYY-MM-01"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// An actual payment made against a loan. remaining = openingBalance - SUM(these).
export const loanPayments = pgTable("loan_payments", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id")
    .references(() => loans.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  amountCents: integer("amount_cents").notNull(),
  paidOn: date("paid_on", { mode: "string" }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// An installment plan (taksit): a purchase paid over `months` with a fixed
// monthly payment. Created either from amount + months + APR (the app computes
// the payment) or entered manually for one already in progress. Its monthly
// payment is committed against the household installments budget each month from
// startMonth for `months` months.
export const installmentPlans = pgTable("installment_plans", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  principalCents: integer("principal_cents"), // null for manually-entered plans
  aprBps: integer("apr_bps"), // APR in basis points (12.5% = 1250); null if manual
  months: integer("months").notNull(),
  monthlyPaymentCents: integer("monthly_payment_cents").notNull(),
  startMonth: text("start_month").notNull(), // "YYYY-MM" of the first payment
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type Salary = typeof salaries.$inferSelect;
export type FixedCost = typeof fixedCosts.$inferSelect;
export type InstallmentPlan = typeof installmentPlans.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type Income = typeof incomes.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type SavingsPot = typeof savingsPots.$inferSelect;
export type SavingsTxn = typeof savingsTxns.$inferSelect;
export type Loan = typeof loans.$inferSelect;
export type LoanSchedule = typeof loanSchedules.$inferSelect;
export type LoanPayment = typeof loanPayments.$inferSelect;
