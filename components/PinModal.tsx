"use client";

import { useState } from "react";
import Modal from "./Modal";
import { setEventPinIfMissing, verifyEventPin } from "@/lib/queries";

export default function PinModal({
  eventId,
  mode,
  onClose,
  onSuccess,
}: {
  eventId: string;
  mode: "unlock" | "set";
  onClose: () => void;
  onSuccess: (pin: string) => void;
}) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cleanDigits(v: string) {
    return v.replace(/[^\d]/g, "").slice(0, 6);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 4) {
      setError("PIN minimal 4 digit.");
      return;
    }
    if (mode === "set" && pin !== confirmPin) {
      setError("Konfirmasi PIN tidak sama.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (mode === "unlock") {
        const ok = await verifyEventPin(eventId, pin);
        if (!ok) {
          setError("PIN salah. Coba lagi.");
          setSaving(false);
          return;
        }
      } else {
        const ok = await setEventPinIfMissing(eventId, pin);
        if (!ok) {
          setError("Gagal mengatur PIN — mungkin acara ini sudah punya PIN.");
          setSaving(false);
          return;
        }
      }
      onSuccess(pin);
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={mode === "unlock" ? "Masuk sebagai bendahara" : "Atur PIN acara ini"}
      onClose={onClose}
      maxWidth="max-w-xs"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-ink-soft">
          {mode === "unlock"
            ? "Masukkan PIN acara ini untuk membuka mode edit (tambah/ubah/hapus transaksi)."
            : "Acara ini belum punya PIN. Atur sekarang supaya hanya kamu yang bisa mengedit transaksinya."}
        </p>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">PIN (4–6 digit)</label>
          <input
            autoFocus
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(cleanDigits(e.target.value))}
            placeholder="••••"
            className="w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-ink placeholder:tracking-normal placeholder:text-ink-soft/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        {mode === "set" && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Ulangi PIN</label>
            <input
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(cleanDigits(e.target.value))}
              placeholder="••••"
              className="w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-ink placeholder:tracking-normal placeholder:text-ink-soft/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        )}
        {error && <p className="text-sm text-rust">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Memeriksa..." : mode === "unlock" ? "Buka mode edit" : "Simpan PIN"}
        </button>
      </form>
    </Modal>
  );
}
