import { formatMoney } from "@/lib/money";

type Item = { id: number; name: string; budgetCents: number; spentCents: number };

export default function SpendingChart({ items }: { items: Item[] }) {
  if (items.length === 0) return null;

  const scale = Math.max(
    1,
    ...items.map((i) => Math.max(i.budgetCents, i.spentCents))
  );
  const pct = (v: number) => `${Math.min((v / scale) * 100, 100)}%`;

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-medium">Where the budget goes</h2>
        <span className="text-xs uppercase tracking-wider text-ink-soft">
          spent / budget
        </span>
      </div>

      <div className="space-y-3">
        {items.map((i) => {
          const over = i.spentCents > i.budgetCents && i.budgetCents > 0;
          return (
            <div key={i.id} className="grid gap-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{i.name}</span>
                <span className="num text-ink-soft">
                  {formatMoney(i.spentCents)}
                  <span className="text-ink-soft/60">
                    {" "}
                    / {formatMoney(i.budgetCents)}
                  </span>
                </span>
              </div>
              <div className="relative h-2.5 rounded-full bg-paper">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-line"
                  style={{ width: pct(i.budgetCents) }}
                />
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${
                    over ? "bg-brick" : "bg-teal"
                  }`}
                  style={{ width: pct(i.spentCents) }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
