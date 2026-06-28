import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

export const CUTOFF_KEY = "cutoff_day";

/**
 * The household budget-cycle cutoff day (1–31), or null if not set.
 * Spending AFTER this day counts toward next month's budget. Applies to cash
 * and to cards that have no closing day of their own.
 */
export async function getCutoffDay(): Promise<number | null> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, CUTOFF_KEY));
  const n = row?.value ? parseInt(row.value, 10) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
}

export async function setCutoffDay(day: number | null): Promise<void> {
  const value = day && day >= 1 && day <= 31 ? String(day) : "";
  const [existing] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, CUTOFF_KEY));
  if (existing) {
    await db
      .update(settings)
      .set({ value })
      .where(eq(settings.key, CUTOFF_KEY));
  } else {
    await db.insert(settings).values({ key: CUTOFF_KEY, value });
  }
}
