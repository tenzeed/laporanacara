const PREFIX = "lpj_pin:";

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
  } catch {
    // localStorage bisa gagal (mode privat, dsb) — abaikan, cukup minta PIN lagi nanti.
  }
}

export function clearSavedPin(eventId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIX + eventId);
  } catch {
    // no-op
  }
}
