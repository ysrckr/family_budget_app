"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function CutoffForm({
  cutoffDay,
}: {
  cutoffDay: number | null;
}) {
  const router = useRouter();
  const [day, setDay] = useState(cutoffDay ? String(cutoffDay) : "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save(next: string) {
    setBusy(true);
    setError("");
    setSaved(false);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cutoffDay: next === "" ? null : Number(next) }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not save.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="grid gap-2">
      <label className="flex flex-wrap items-center justify-between gap-3 text-sm font-medium">
        New month starts after the
        <select
          className="num rounded-md border border-line bg-surface px-3 py-2.5 text-base focus:border-teal"
          value={day}
          disabled={busy}
          onChange={(e) => {
            setDay(e.target.value);
            save(e.target.value);
          }}
        >
          <option value="">— (calendar month)</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {ordinal(d)}
            </option>
          ))}
        </select>
      </label>

      <p className="text-xs text-ink-soft">
        {day ? (
          <>
            Spending <strong>after the {ordinal(Number(day))}</strong> counts
            toward next month&rsquo;s budget — for both cash and cards without
            their own closing day. Cards with a closing day use that instead.
          </>
        ) : (
          <>
            Each budget month follows the calendar. Set a day to shift the cycle
            — e.g. if your pay lands on the 25th, spending after it belongs to
            next month.
          </>
        )}
      </p>

      {saved && <p className="text-xs text-teal-dark">Saved.</p>}
      {error && <p className="text-sm text-brick">{error}</p>}
    </div>
  );
}
