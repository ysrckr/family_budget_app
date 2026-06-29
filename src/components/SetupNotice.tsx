"use client";

import Link from "next/link";

/**
 * An empty-state notice that also offers a button taking the user straight to
 * the page where they can do the prerequisite (e.g. "Add a loan first" → Loans).
 */
export default function SetupNotice({
  message,
  href,
  action,
  onNavigate,
}: {
  message: string;
  href: string;
  action: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="rounded-md border border-line bg-paper px-4 py-4 text-sm text-ink-soft">
      <p>{message}</p>
      <Link
        href={href}
        onClick={onNavigate}
        className="mt-3 inline-flex min-h-[40px] items-center rounded-md bg-teal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-dark"
      >
        {action} →
      </Link>
    </div>
  );
}
