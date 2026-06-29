"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "./ConfirmProvider";

export default function DeleteButton({
  url,
  confirm: confirmMsg = "Delete this?",
  label = "Delete",
}: {
  url: string;
  confirm?: string;
  label?: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function onClick() {
    const ok = await confirm({
      message: confirmMsg,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);

    // Optimistic: hide the row right away so it doesn't linger while the
    // server round-trip + refresh complete. Restored if the delete fails.
    const row = btnRef.current?.closest(
      "[data-row], li, tr, article"
    ) as HTMLElement | null;
    const prevDisplay = row?.style.display ?? "";
    if (row) row.style.display = "none";

    try {
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      startTransition(() => router.refresh());
    } catch {
      if (row) row.style.display = prevDisplay;
      setBusy(false);
    }
  }

  return (
    <button
      ref={btnRef}
      onClick={onClick}
      disabled={busy}
      className="inline-flex min-h-[40px] items-center rounded-md px-3 py-2 text-sm text-ink-soft hover:bg-brick-tint hover:text-brick disabled:opacity-50"
    >
      {busy ? "…" : label}
    </button>
  );
}
