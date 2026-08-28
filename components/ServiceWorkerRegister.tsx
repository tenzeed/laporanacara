"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Diamkan — kalau gagal daftar, aplikasi tetap jalan normal,
        // cuma tombol "Pasang App" mungkin tidak muncul di beberapa browser.
      });
    }
  }, []);

  return null;
}
