"use client";

import { useEffect, useRef, useState } from "react";
import LogoutButton from "./LogoutButton";

/**
 * Desktop header account control: the username is a button that opens a small
 * dropdown with the Sign out action. Closes on outside click or Escape.
 */
export default function UserMenu({ userName }: { userName: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!userName) return <LogoutButton />;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper hover:text-ink"
      >
        {userName}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] animate-fade-in rounded-lg border border-line bg-surface p-1.5 shadow-card"
        >
          <LogoutButton className="w-full rounded-md px-3 py-2 text-left text-sm text-ink-soft transition-colors hover:bg-paper hover:text-ink" />
        </div>
      )}
    </div>
  );
}
