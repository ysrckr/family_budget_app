"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = createContext<(o: ConfirmOptions) => Promise<boolean>>(
  async () => false
);

export function useConfirm() {
  return useContext(ConfirmContext);
}

export default function ConfirmProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const confirm = (o: ConfirmOptions) =>
    new Promise<boolean>((resolve) => setPending({ ...o, resolve }));

  function close(ok: boolean) {
    setPending((p) => {
      p?.resolve(ok);
      return null;
    });
  }

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [pending]);

  const danger = pending?.tone === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {mounted &&
        pending &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label={pending.title ?? "Confirm"}
          >
            <div
              className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm"
              onClick={() => close(false)}
            />
            <div className="relative w-full animate-sheet-up rounded-t-2xl bg-surface p-5 shadow-card sm:m-4 sm:max-w-sm sm:rounded-2xl">
              {pending.title && (
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  {pending.title}
                </h2>
              )}
              <p className="mt-1 text-sm text-ink-soft">{pending.message}</p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-paper hover:text-ink"
                >
                  {pending.cancelLabel ?? "Cancel"}
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => close(true)}
                  className={`rounded-md px-4 py-2.5 text-sm font-medium text-white ${
                    danger ? "bg-brick hover:opacity-90" : "bg-teal hover:bg-teal-dark"
                  }`}
                >
                  {pending.confirmLabel ?? "Confirm"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}
