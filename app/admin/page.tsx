"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  fetchEvents,
  fetchTransactions,
  verifyAdminPin,
  adminResetEventPin,
  adminDeleteEvent,
} from "@/lib/queries";
import { deleteBuktiByUrl } from "@/lib/storage";
import { formatRentangTanggal } from "@/lib/format";
import type { Event } from "@/lib/types";

type Filter = "semua" | "berlangsung" | "selesai";

function cleanDigits(v: string) {
  return v.replace(/[^\d]/g, "").slice(0, 6);
}

export default function AdminPage() {
  // PIN admin sengaja HANYA disimpan di memori komponen (tidak ke
  // localStorage) — akan hilang begitu halaman ini ditutup/di-refresh,
  // karena stakes-nya jauh lebih tinggi dari PIN acara biasa.
  const [unlocked, setUnlocked] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [events, setEvents] = useState<Event[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("semua");

  const [resetTarget, setResetTarget] = useState<Event | null>(null);
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [revealedPin, setRevealedPin] = useState<{ eventName: string; pin: string } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!unlocked) return;
    fetchEvents()
      .then(setEvents)
      .catch((err) => {
        console.error(err);
        setLoadError("Gagal memuat daftar acara.");
      });
  }, [unlocked]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!pinInput) return;
    setLoggingIn(true);
    setLoginError(null);
    try {
      const ok = await verifyAdminPin(pinInput);
      if (!ok) {
        setLoginError(
          "PIN admin salah, atau sedang dikunci sementara karena terlalu banyak percobaan gagal."
        );
        setLoggingIn(false);
        return;
      }
      setAdminPin(pinInput);
      setUnlocked(true);
      setPinInput("");
    } catch (err) {
      console.error(err);
      setLoginError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoggingIn(false);
    }
  }

  const filtered = useMemo(() => {
    if (!events) return [];
    let list = events;
    if (filter !== "semua") list = list.filter((ev) => ev.status === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((ev) => ev.nama_acara.toLowerCase().includes(q));
    }
    return list;
  }, [events, filter, query]);

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    if (newPin.length !== 6) {
      setResetError("PIN baru harus 6 digit.");
      return;
    }
    if (newPin !== confirmNewPin) {
      setResetError("Konfirmasi PIN tidak sama.");
      return;
    }
    setResetting(true);
    setResetError(null);
    try {
      const ok = await adminResetEventPin(adminPin, resetTarget.id, newPin);
      if (!ok) {
        setResetError("Gagal reset PIN. Coba masuk ulang sebagai admin.");
        setResetting(false);
        return;
      }
      setEvents((prev) =>
        (prev ?? []).map((ev) => (ev.id === resetTarget.id ? { ...ev, has_pin: true } : ev))
      );
      setRevealedPin({ eventName: resetTarget.nama_acara, pin: newPin });
      setResetTarget(null);
      setNewPin("");
      setConfirmNewPin("");
    } catch (err) {
      console.error(err);
      setResetError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setResetting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleting(true);
    try {
      try {
        const txs = await fetchTransactions(target.id);
        txs.forEach((t) => {
          if (t.foto_url) deleteBuktiByUrl(t.foto_url).catch(() => {});
        });
      } catch {
        // kalau gagal ambil daftar transaksi, tetap lanjut hapus acaranya
      }
      const ok = await adminDeleteEvent(adminPin, target.id);
      if (ok) {
        setEvents((prev) => (prev ?? []).filter((ev) => ev.id !== target.id));
      } else {
        alert("Gagal menghapus acara. Coba masuk ulang sebagai admin.");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus acara.");
    } finally {
      setDeleting(false);
    }
  }

  if (!unlocked) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-5">
        <div className="w-full rounded-xl2 border border-ink/10 bg-white/70 p-6 shadow-card">
          <h1 className="font-display text-xl font-semibold text-ink">Panel Admin</h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            Khusus pengelola utama aplikasi — untuk reset PIN acara yang lupa, atau menghapus
            acara yang menumpuk, tanpa perlu tahu PIN acara itu sendiri.
          </p>
          <form onSubmit={handleLogin} className="mt-5 space-y-3">
            <input
              autoFocus
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="PIN admin"
              className="w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            {loginError && <p className="text-sm text-rust">{loginError}</p>}
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {loggingIn ? "Memeriksa..." : "Masuk"}
            </button>
          </form>
          <Link href="/" className="mt-5 block text-center text-xs text-ink-soft hover:text-ink">
            ← Kembali ke aplikasi
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 pb-16 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Panel Admin</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Reset PIN atau hapus acara mana pun — tanpa perlu tahu PIN acara itu sendiri.
          </p>
        </div>
        <Link href="/" className="text-sm text-ink-soft hover:text-ink">
          Keluar
        </Link>
      </div>

      {revealedPin && (
        <div className="mt-6 rounded-xl border border-brand/30 bg-brand-50 p-4">
          <p className="text-sm text-ink">
            PIN baru untuk <span className="font-semibold">{revealedPin.eventName}</span>:
          </p>
          <p className="select-text-force mt-1 font-mono text-2xl font-semibold tracking-[0.3em] text-brand-dark">
            {revealedPin.pin}
          </p>
          <p className="mt-2 text-xs text-ink-soft">
            Catat/sampaikan ke bendahara sekarang — PIN ini tidak akan ditampilkan lagi setelah
            ditutup.
          </p>
          <button
            onClick={() => setRevealedPin(null)}
            className="mt-3 rounded-full border border-ink/15 px-4 py-1.5 text-xs font-medium text-ink transition hover:bg-ink/5"
          >
            Tutup
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama acara..."
          className="min-w-0 flex-1 rounded-full border border-ink/15 bg-white px-4 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <div className="flex gap-1 rounded-full bg-ink/5 p-1">
          {(["semua", "berlangsung", "selesai"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                filter === f ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              {f === "semua" ? "Semua" : f === "berlangsung" ? "Berlangsung" : "Selesai"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {loadError && (
          <div className="rounded-xl border border-rust/20 bg-rust-50 p-4 text-sm text-rust">
            {loadError}
          </div>
        )}
        {!loadError && events === null && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-ink/5" />
            ))}
          </div>
        )}
        {!loadError && events !== null && filtered.length === 0 && (
          <p className="rounded-xl border border-dashed border-ink/15 p-6 text-center text-sm text-ink-soft">
            Tidak ada acara yang cocok.
          </p>
        )}
        {!loadError && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white/70 p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/acara/${ev.id}`}
                      className="truncate font-medium text-ink hover:text-brand hover:underline"
                    >
                      {ev.nama_acara}
                    </Link>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        ev.status === "selesai"
                          ? "bg-brand-50 text-brand-dark"
                          : "bg-gold-50 text-gold"
                      }`}
                    >
                      {ev.status === "selesai" ? "Selesai" : "Berlangsung"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {formatRentangTanggal(ev.tanggal_mulai, ev.tanggal_selesai)} ·{" "}
                    {ev.has_pin ? "Ada PIN" : "Belum ada PIN"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => {
                      setResetTarget(ev);
                      setNewPin("");
                      setConfirmNewPin("");
                      setResetError(null);
                    }}
                    className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-ink/5"
                  >
                    Reset PIN
                  </button>
                  <button
                    onClick={() => setDeleteTarget(ev)}
                    className="rounded-full border border-rust/30 px-3 py-1.5 text-xs font-medium text-rust transition hover:bg-rust hover:text-white"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {resetTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 pb-4 sm:items-center sm:pb-0"
          onClick={() => setResetTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl2 bg-paper p-6 shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg font-semibold text-ink">
              Reset PIN — {resetTarget.nama_acara}
            </h2>
            <p className="mt-1.5 text-sm text-ink-soft">
              PIN lama tidak diperlukan. PIN baru ini langsung menggantikan yang lama.
            </p>
            <form onSubmit={handleResetSubmit} className="mt-4 space-y-3">
              <input
                autoFocus
                inputMode="numeric"
                value={newPin}
                onChange={(e) => setNewPin(cleanDigits(e.target.value))}
                placeholder="PIN baru (6 digit)"
                className="w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.3em] text-ink outline-none placeholder:tracking-normal placeholder:text-ink-soft/40 focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <input
                inputMode="numeric"
                value={confirmNewPin}
                onChange={(e) => setConfirmNewPin(cleanDigits(e.target.value))}
                placeholder="Ulangi PIN baru"
                className="w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.3em] text-ink outline-none placeholder:tracking-normal placeholder:text-ink-soft/40 focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              {resetError && <p className="text-sm text-rust">{resetError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="flex-1 rounded-full border border-ink/15 py-2.5 text-sm font-medium text-ink transition hover:bg-ink/5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="flex-1 rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {resetting ? "Menyimpan..." : "Reset PIN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Hapus acara ini?"
          message={`Seluruh data "${deleteTarget.nama_acara}" beserta semua transaksinya akan dihapus permanen dari database. Aksi ini tidak bisa dibatalkan.`}
          confirmLabel={deleting ? "Menghapus..." : "Hapus permanen"}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </main>
  );
}
