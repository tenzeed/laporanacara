"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Kalau sudah dibuka sebagai app terinstall (mode standalone), sembunyikan tombolnya.
    if (
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    ) {
      setInstalled(true);
    }

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (installed || !deferredPrompt) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
    } catch {
      // Diabaikan — kalau gagal, tombol tetap muncul dan bisa dicoba lagi.
    } finally {
      setDeferredPrompt(null);
    }
  }

  return (
    <button
      onClick={handleInstall}
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-brand/25 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-dark transition hover:bg-brand-50/70"
      aria-label="Pasang aplikasi ke perangkat"
    >
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path
          d="M7 1.5v7.5M4 6.5L7 9.5l3-3"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 10.5v1.5A1 1 0 003 13h8a1 1 0 001-1v-1.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="hidden sm:inline">Pasang App</span>
      <span className="sm:hidden">Pasang</span>
    </button>
  );
}
