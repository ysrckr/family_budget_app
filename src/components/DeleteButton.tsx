"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!window.confirm(confirmMsg)) return;
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
