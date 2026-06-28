"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

type NavLink = { href: string; label: string };

export default function MobileNav({
  links,
  active,
  userName,
}: {
  links: NavLink[];
  active: string;
  userName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="grid h-10 w-10 place-items-center rounded-md border border-line text-ink-soft hover:bg-paper hover:text-ink sm:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 sm:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div
              className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div
              className="absolute right-0 top-0 flex h-full w-72 max-w-[82%] animate-slide-in-right flex-col bg-surface shadow-card"
              style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
            >
              <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
                <span className="font-display text-lg font-semibold tracking-tight">
                  Menu
                </span>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-md text-ink-soft hover:bg-paper hover:text-ink"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-2">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    aria-current={active === l.href ? "page" : undefined}
                    className={`flex items-center justify-between rounded-lg px-4 py-3 text-base ${
                      active === l.href
                        ? "bg-teal-tint font-medium text-teal-dark"
                        : "text-ink hover:bg-paper"
                    }`}
                  >
                    {l.label}
                    {active === l.href && (
                      <span className="h-2 w-2 rounded-full bg-teal" aria-hidden />
                    )}
                  </Link>
                ))}
              </nav>

              <div
                className="border-t border-line p-4"
                style={{
                  paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
                }}
              >
                {userName && (
                  <p className="mb-2 truncate text-sm text-ink-soft">{userName}</p>
                )}
                <LogoutButton />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
