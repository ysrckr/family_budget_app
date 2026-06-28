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
      className="text-sm text-ink-soft underline-offset-2 hover:text-brick hover:underline disabled:opacity-50"
    >
      {busy ? "…" : label}
    </button>
  );
}
