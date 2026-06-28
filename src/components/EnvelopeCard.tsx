"use client";

import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";
import RemainingToggle from "./RemainingToggle";

export default function EnvelopeCard({
  title,
  budgetCents,
  spentCents,
  href,
}: {
  title: string;
  budgetCents: number;
  spentCents: number;
  href: string;
}) {
  const router = useRouter();
  const pct =
    budgetCents > 0
      ? Math.min((spentCents / budgetCents) * 100, 100)
      : spentCents > 0
      ? 100
      : 0;
  const over = spentCents > budgetCents && budgetCents > 0;
  const close = !over && pct >= 80;
  const fill = over ? "bg-brick" : close ? "bg-amber" : "bg-teal";

  function go() {
    router.push(href);
  }

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      }}
      className="envelope cursor-pointer rounded-xl border border-line p-5 shadow-card transition-colors hover:border-teal/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-medium">{title}</h3>
        <span className="num text-sm text-ink-soft">
          {formatMoney(spentCents)}
          <span className="text-ink-soft/60"> / {formatMoney(budgetCents)}</span>
        </span>
      </div>
      <div className="meter mb-3">
        <span className={fill} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between">
        {/* tap-to-toggle remaining — don't let it trigger card navigation */}
        <span onClick={(e) => e.stopPropagation()}>
          <RemainingToggle budgetCents={budgetCents} spentCents={spentCents} />
        </span>
        <span className="text-sm text-teal" aria-hidden>
          View spending →
        </span>
      </div>
    </article>
  );
}
