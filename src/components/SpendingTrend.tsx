import { formatMoney, formatMoneyCompact } from "@/lib/money";

type Point = { label: string; income: number; spent: number };

// Two-series area+line trend (income vs spent) with gridlines, axis labels,
// a legend showing the latest values, and a month-over-month summary. Pure SVG,
// light-mode, brand colors. Server component.
export default function SpendingTrend({ points }: { points: Point[] }) {
  if (points.length < 2) return null;

  const W = 360;
  const H = 210;
  const padL = 42;
  const padR = 14;
  const padT = 16;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = points.length;

  const max = Math.max(1, ...points.flatMap((p) => [p.income, p.spent]));
  const x = (i: number) => padL + (innerW * i) / (n - 1);
  const y = (v: number) => padT + innerH - (innerH * v) / max;
  const baseY = padT + innerH;

  const line = (key: "income" | "spent") =>
    points
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`)
      .join(" ");
  const area = (key: "income" | "spent") =>
    `${line(key)} L${x(n - 1).toFixed(1)} ${baseY} L${x(0).toFixed(1)} ${baseY} Z`;

  const TEAL = "#0E7C66";
  const AMBER = "#C68A12";

  const last = points[n - 1];
  const prev = points[n - 2];
  const spentDelta =
    prev.spent > 0 ? Math.round(((last.spent - prev.spent) / prev.spent) * 100) : null;
  const avgSpent = Math.round(
    points.reduce((s, p) => s + p.spent, 0) / n
  );
  const grid = [0, 1, 2, 3]; // 4 gridlines incl. baseline

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-medium">
            Income vs spending
          </h2>
          <p className="text-xs text-ink-soft">last {n} months</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          <span className="flex items-center gap-1.5 text-ink-soft">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: TEAL }} />
            Income{" "}
            <span className="num font-medium text-ink">{formatMoney(last.income)}</span>
          </span>
          <span className="flex items-center gap-1.5 text-ink-soft">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: AMBER }} />
            Spent{" "}
            <span className="num font-medium text-ink">{formatMoney(last.spent)}</span>
          </span>
        </div>
      </div>

      <p className="mb-3 text-xs text-ink-soft">
        This month spent{" "}
        <span className="num font-medium text-ink">{formatMoney(last.spent)}</span>
        {spentDelta !== null && (
          <span className={spentDelta > 0 ? "text-brick" : "text-teal-dark"}>
            {" "}
            {spentDelta > 0 ? "▲" : spentDelta < 0 ? "▼" : ""}
            {Math.abs(spentDelta)}% vs last month
          </span>
        )}{" "}
        · avg <span className="num">{formatMoney(avgSpent)}</span>
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Income versus spending over recent months"
      >
        {grid.map((t) => {
          const gy = padT + (innerH * t) / 3;
          const val = (max * (3 - t)) / 3;
          return (
            <g key={t}>
              <line x1={padL} y1={gy} x2={W - padR} y2={gy} stroke="#E4E5DF" strokeWidth="1" />
              <text x={padL - 6} y={gy + 3} fill="#55607A" fontSize="9" textAnchor="end">
                {formatMoneyCompact(val)}
              </text>
            </g>
          );
        })}

        <path d={area("income")} fill={TEAL} opacity="0.10" />
        <path d={area("spent")} fill={AMBER} opacity="0.12" />
        <path d={line("income")} fill="none" stroke={TEAL} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <path d={line("spent")} fill="none" stroke={AMBER} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => (
          <g key={p.label}>
            <circle cx={x(i)} cy={y(p.income)} r={i === n - 1 ? 3.5 : 2.4} fill={TEAL} />
            <circle cx={x(i)} cy={y(p.spent)} r={i === n - 1 ? 3.5 : 2.4} fill={AMBER} />
            <text x={x(i)} y={H - 8} fill="#55607A" fontSize="10" textAnchor="middle">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
