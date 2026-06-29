"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className={
        className ??
        "rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper hover:text-ink"
      }
    >
      Sign out
    </button>
  );
}
