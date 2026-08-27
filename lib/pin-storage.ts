const PREFIX = "lpj_pin:";
const ACTIVITY_SUFFIX = ":activity";

/** Berapa lama mode bendahara tetap terbuka tanpa ada aktivitas sama sekali. */
export const AUTO_LOCK_MS = 30 * 60 * 1000; // 30 menit

export function getSavedPin(eventId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PREFIX + eventId);
  } catch {
    return null;
  }
}

export function savePin(eventId: string, pin: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + eventId, pin);
    touchActivity(eventId);
  } catch {
    // localStorage bisa gagal (mode privat, dsb) — abaikan, cukup minta PIN lagi nanti.
  }
}

export function clearSavedPin(eventId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIX + eventId);
    window.localStorage.removeItem(PREFIX + eventId + ACTIVITY_SUFFIX);
  } catch {
    // no-op
  }
}

/** Catat "terakhir aktif" sekarang — dipanggil tiap ada interaksi saat mode edit terbuka. */
export function touchActivity(eventId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + eventId + ACTIVITY_SUFFIX, String(Date.now()));
  } catch {
    // no-op
  }
}

/** Apakah PIN tersimpan masih "segar" (belum melewati batas idle AUTO_LOCK_MS). */
export function isPinStillFresh(eventId: string, maxAgeMs: number = AUTO_LOCK_MS): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(PREFIX + eventId + ACTIVITY_SUFFIX);
    if (!raw) return false;
    const last = Number(raw);
    if (!Number.isFinite(last)) return false;
    return Date.now() - last < maxAgeMs;
  } catch {
    return false;
  }
}
