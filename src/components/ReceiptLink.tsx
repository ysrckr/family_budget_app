"use client";

import { useState } from "react";

export default function ReceiptLink({ receiptKey }: { receiptKey: string }) {
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/uploads/view?key=${encodeURIComponent(receiptKey)}`
      );
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank", "noopener");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={open}
      disabled={busy}
      className="text-sm text-teal underline-offset-2 hover:underline disabled:opacity-50"
    >
      {busy ? "Opening…" : "Receipt"}
    </button>
  );
}
