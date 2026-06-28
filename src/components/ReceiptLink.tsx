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
      className="inline-flex min-h-[40px] items-center rounded-md px-3 py-2 text-sm text-teal hover:bg-teal-tint disabled:opacity-50"
    >
      {busy ? "Opening…" : "Receipt"}
    </button>
  );
}
