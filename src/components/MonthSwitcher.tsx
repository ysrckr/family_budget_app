"use client";

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

  function go(month: string) {
    const params = new URLSearchParams({ ...query, month });
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1">
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
