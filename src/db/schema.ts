import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  date,
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

export type User = typeof users.$inferSelect;
export type Salary = typeof salaries.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type Income = typeof incomes.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
