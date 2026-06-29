"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "./ConfirmProvider";

/**
 * Generic button that fires a JSON request (POST/PATCH/DELETE) then refreshes.
 * Used for one-tap actions like archiving a pot or marking a loan payment.
 * Set `removesRow` for actions that take the row out of the current list (e.g.
 * archive) so it disappears immediately instead of lingering until the refresh.
 */
export default function ActionButton({
  url,
  method = "POST",
  body,
  label,
  busyLabel = "…",
  confirm: confirmMsg,
  className = "",
  removesRow = false,
}: {
  url: string;
  method?: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  label: string;
  busyLabel?: string;
  confirm?: string;
  className?: string;
  removesRow?: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function onClick() {
    if (confirmMsg && !(await confirm({ message: confirmMsg }))) return;
    setBusy(true);

    const row = removesRow
      ? (btnRef.current?.closest(
          "[data-row], li, tr, article"
        ) as HTMLElement | null)
      : null;
    const prevDisplay = row?.style.display ?? "";
    if (row) row.style.display = "none";

    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error("action failed");
      startTransition(() => router.refresh());
      if (!removesRow) setBusy(false);
    } catch {
      if (row) row.style.display = prevDisplay;
      setBusy(false);
    }
  }

  return (
    <button ref={btnRef} onClick={onClick} disabled={busy} className={className}>
      {busy ? busyLabel : label}
    </button>
  );
}
