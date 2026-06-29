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

/**
 * A stat tile that flips on click/tap to swap between two values (e.g.
 * Allocated → Unallocated). The card rotates edge-on, swaps its content at that
 * point, then rotates back — so the text is shown the right way up, never
 * mirrored.
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
  const [spinning, setSpinning] = useState(false);

  function toggle() {
    if (spinning) return;
    setSpinning(true);
    // Swap content while the card is edge-on (invisible), then rotate back.
    window.setTimeout(() => {
      setFlipped((f) => !f);
      setSpinning(false);
    }, 150);
  }

  const label = flipped ? backLabel : frontLabel;
  const value = flipped ? backValue : frontValue;
  const accent = flipped ? backAccent : frontAccent;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`${label} — tap to see ${flipped ? frontLabel : backLabel}`}
      className="min-w-0 text-left"
      style={{ perspective: "800px" }}
    >
      <div
        className="flex h-full flex-col rounded-xl border border-line bg-surface p-4 shadow-card"
        style={{
          transition: "transform 150ms ease-in",
          transform: spinning ? "rotateY(90deg)" : "rotateY(0deg)",
        }}
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
    </button>
  );
}
