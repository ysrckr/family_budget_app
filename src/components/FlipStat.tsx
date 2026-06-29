"use client";

import { useState } from "react";

type Accent = "ink" | "teal" | "brick";

function colorFor(accent: Accent) {
  return accent === "teal"
    ? "text-teal-dark"
    : accent === "brick"
    ? "text-brick"
    : "text-ink";
}

function Face({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: Accent;
}) {
  return (
    <div
      className="flex h-full flex-col rounded-xl border border-line bg-surface p-4 shadow-card"
      style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs uppercase tracking-wider text-ink-soft">{label}</p>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className="mt-0.5 shrink-0 text-ink-soft/50"
        >
          <path
            d="M4 9a8 8 0 0113.5-3.5L20 8M20 4v4h-4M20 15a8 8 0 01-13.5 3.5L4 16M4 20v-4h4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p
        className={`num mt-1 text-base font-semibold leading-tight sm:text-lg ${colorFor(
          accent
        )}`}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * A stat tile that flips on click/tap to reveal a second value (e.g. Allocated
 * → Unallocated). Uses a 3D rotateY flip; both faces match the plain Stat tile.
 */
export default function FlipStat({
  frontLabel,
  frontValue,
  frontAccent = "ink",
  backLabel,
  backValue,
  backAccent = "ink",
}: {
  frontLabel: string;
  frontValue: string;
  frontAccent?: Accent;
  backLabel: string;
  backValue: string;
  backAccent?: Accent;
}) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      aria-label={`${frontLabel} — tap to see ${backLabel}`}
      className="min-w-0 text-left"
      style={{ perspective: "1000px" }}
    >
      <div
        className="relative transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "none",
        }}
      >
        {/* front (in flow — defines height) */}
        <Face label={frontLabel} value={frontValue} accent={frontAccent} />
        {/* back (overlaid, pre-rotated) */}
        <div
          className="absolute inset-0"
          style={{ transform: "rotateY(180deg)" }}
        >
          <Face label={backLabel} value={backValue} accent={backAccent} />
        </div>
      </div>
    </button>
  );
}
