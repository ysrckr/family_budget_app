"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Generic button that fires a JSON request (POST/PATCH/DELETE) then refreshes.
 * Used for one-tap actions like archiving a pot or marking a loan payment.
 */
export default function ActionButton({
  url,
  method = "POST",
  body,
  label,
  busyLabel = "…",
  confirm: confirmMsg,
  className = "",
}: {
  url: string;
  method?: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  label: string;
  busyLabel?: string;
  confirm?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button onClick={onClick} disabled={busy} className={className}>
      {busy ? busyLabel : label}
    </button>
  );
}
