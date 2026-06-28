import { formatMoney } from "@/lib/money";

type Point = { label: string; income: number; spent: number };

// A small two-line trend chart (income vs spent) over recent months. Pure SVG,
// light-mode, brand colors. Server component — no interactivity needed.
export default function SpendingTrend({ points }: { points: Point[] }) {
  if (points.length < 2) return null;

  const W = 340;
  const H = 168;
  const padL = 10;
  const padR = 10;
  const padT = 26;
  const padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = points.length;

  const max = Math.max(1, ...points.flatMap((p) => [p.income, p.spent]));
  const x = (i: number) => padL + (innerW * i) / (n - 1);
  const y = (v: number) => padT + innerH - (innerH * v) / max;
  const path = (key: "income" | "spent") =>
    points
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`)
      .join(" ");

  const TEAL = "#0E7C66";
  const AMBER = "#C68A12";

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-medium">Income vs spending</h2>
        <div className="flex items-center gap-3 text-xs text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: TEAL }}
            />
            Income
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: AMBER }}
            />
            Spent
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Income versus spending over recent months"
        className="overflow-visible"
      >
        {/* top gridline at the max, with a faint value label */}
        <line x1={padL} y1={padT} x2={W - padR} y2={padT} stroke="#E4E5DF" strokeWidth="1" />
        <line
          x1={padL}
          y1={padT + innerH}
          x2={W - padR}
          y2={padT + innerH}
          stroke="#E4E5DF"
          strokeWidth="1"
        />
        <text x={padL} y={padT - 8} fill="#55607A" fontSize="10">
          {formatMoney(max)}
        </text>

        <path d={path("income")} fill="none" stroke={TEAL} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path d={path("spent")} fill="none" stroke={AMBER} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => (
          <g key={p.label}>
            <circle cx={x(i)} cy={y(p.income)} r="2.6" fill={TEAL} />
            <circle cx={x(i)} cy={y(p.spent)} r="2.6" fill={AMBER} />
            <text
              x={x(i)}
              y={H - 8}
              fill="#55607A"
              fontSize="10"
              textAnchor="middle"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
