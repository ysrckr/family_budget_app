"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function MonthSwitcher({
  basePath,
  label,
  prev,
  next,
  query = {},
}: {
  basePath: string;
  label: string;
  prev: string;
  next: string;
  query?: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const url = (month: string) =>
    `${basePath}?${new URLSearchParams({ ...query, month }).toString()}`;

  // Prefetch the neighbouring months so stepping prev/next is near-instant
  // instead of a fresh server round-trip each time.
  useEffect(() => {
    router.prefetch(url(prev));
    router.prefetch(url(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath, prev, next]);

  function go(month: string) {
    startTransition(() => router.push(url(month)));
  }

  return (
    <div
      className={`flex items-center gap-1 transition-opacity ${
        pending ? "opacity-50" : ""
      }`}
    >
      <button
        aria-label="Previous month"
        onClick={() => go(prev)}
        className="grid h-10 w-10 place-items-center rounded-md border border-line text-lg text-ink-soft hover:bg-paper"
      >
        ‹
      </button>
      <span className="min-w-[10rem] text-center font-display text-lg">
        {label}
      </span>
      <button
        aria-label="Next month"
        onClick={() => go(next)}
        className="grid h-10 w-10 place-items-center rounded-md border border-line text-lg text-ink-soft hover:bg-paper"
      >
        ›
      </button>
    </div>
  );
}
