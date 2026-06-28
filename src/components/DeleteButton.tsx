"use client";

import { useState } from "react";
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
  const [busy, setBusy] = useState(false);

  async function onClick() {
    const ok = await confirm({
      message: confirmMsg,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    await fetch(url, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex min-h-[40px] items-center rounded-md px-3 py-2 text-sm text-ink-soft hover:bg-brick-tint hover:text-brick disabled:opacity-50"
    >
      {busy ? "…" : label}
    </button>
  );
}
