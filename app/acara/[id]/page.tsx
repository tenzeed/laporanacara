"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Brand from "@/components/Brand";
import SummaryCards from "@/components/SummaryCards";
import TransactionList from "@/components/TransactionList";
import TransactionModal from "@/components/TransactionModal";
import EditEventModal from "@/components/EditEventModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import UndoToast from "@/components/UndoToast";
import PinModal from "@/components/PinModal";
import EmptyState from "@/components/EmptyState";
import {
  fetchCategories,
  fetchEvent,
  fetchTransactions,
  updateEventStatus,
  deleteTransaction,
  deleteEvent,
} from "@/lib/queries";
import { deleteBuktiByUrl } from "@/lib/storage";
import {
  getSavedPin,
  savePin,
  clearSavedPin,
  touchActivity,
  isPinStillFresh,
  AUTO_LOCK_MS,
} from "@/lib/pin-storage";
import { formatRentangTanggal } from "@/lib/format";
import type { Category, Event, Transaction } from "@/lib/types";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params.id;

  const [event, setEvent] = useState<Event | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pin, setPin] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    transaction: Transaction;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);
  const [showDeleteEvent, setShowDeleteEvent] = useState(false);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<"unlock" | "set" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [autoLockNotice, setAutoLockNotice] = useState(false);

  useEffect(() => {
    Promise.all([fetchEvent(eventId), fetchTransactions(eventId), fetchCategories()])
      .then(([ev, tx, cats]) => {
        setEvent(ev);
        setTransactions(tx);
        setCategories(cats);
        if (ev.has_pin) {
          const saved = getSavedPin(ev.id);
          if (saved) {
            if (isPinStillFresh(ev.id)) {
              setPin(saved);
              touchActivity(ev.id);
            } else {
              // Sudah lewat batas idle sejak terakhir aktif — minta PIN lagi.
              clearSavedPin(ev.id);
            }
          }
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Acara tidak ditemukan atau gagal memuat data.");
      });
  }, [eventId]);

  const unlocked = event ? !event.has_pin || pin !== null : false;
  const effectivePin = pin ?? "";

  // Auto-lock: kalau mode bendahara terbuka dan tidak ada interaksi sama
  // sekali selama AUTO_LOCK_MS, kunci lagi otomatis demi keamanan device bersama.
  useEffect(() => {
    if (!event?.has_pin || pin === null) return;
    let timeoutId: ReturnType<typeof setTimeout>;

    function resetTimer() {
      touchActivity(event!.id);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        clearSavedPin(event!.id);
        setPin(null);
        setAutoLockNotice(true);
      }, AUTO_LOCK_MS);
    }

    const activityEvents = ["click", "keydown", "touchstart", "scroll"];
    activityEvents.forEach((name) => window.addEventListener(name, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((name) => window.removeEventListener(name, resetTimer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, event?.has_pin, pin]);

  const totalPemasukan =
    transactions?.filter((t) => t.jenis === "pemasukan").reduce((a, b) => a + b.nominal, 0) ?? 0;
  const totalPengeluaran =
    transactions?.filter((t) => t.jenis === "pengeluaran").reduce((a, b) => a + b.nominal, 0) ?? 0;

  async function toggleStatus() {
    if (!event || !unlocked) return;
    const next = event.status === "berlangsung" ? "selesai" : "berlangsung";
    setSavingStatus(true);
    try {
      const ok = await updateEventStatus(event.id, next, effectivePin);
      if (ok) {
        setEvent({ ...event, status: next });
      } else {
        alert("Gagal mengubah status. Coba buka mode edit ulang.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingStatus(false);
    }
  }

  function handleSaved(t: Transaction) {
    setTransactions((prev) => {
      const list = prev ?? [];
      const exists = list.some((x) => x.id === t.id);
      return exists ? list.map((x) => (x.id === t.id ? t : x)) : [t, ...list];
    });
    setShowForm(false);
    setEditing(null);
  }

  async function finalizeDeleteTransaction(t: Transaction) {
    try {
      await deleteTransaction(t.id, effectivePin);
      if (t.foto_url) deleteBuktiByUrl(t.foto_url).catch(() => {});
    } catch (err) {
      console.error(err);
    } finally {
      setPendingDelete((curr) => (curr?.transaction.id === t.id ? null : curr));
    }
  }

  function handleDeleteTransaction(t: Transaction) {
    // Kalau ada penghapusan lain yang masih menunggu, selesaikan dulu segera
    // supaya tidak ada dua timer nunggu bareng.
    if (pendingDelete) {
      clearTimeout(pendingDelete.timeoutId);
      finalizeDeleteTransaction(pendingDelete.transaction);
    }
    setTransactions((prev) => (prev ?? []).filter((x) => x.id !== t.id));
    const timeoutId = setTimeout(() => finalizeDeleteTransaction(t), 5000);
    setPendingDelete({ transaction: t, timeoutId });
  }

  function handleUndoDeleteTransaction() {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timeoutId);
    setTransactions((prev) => [pendingDelete.transaction, ...(prev ?? [])]);
    setPendingDelete(null);
  }

  async function handleDeleteEvent() {
    if (!event) return;
    setDeletingEvent(true);
    try {
      const ok = await deleteEvent(event.id, effectivePin);
      if (ok) {
        (transactions ?? []).forEach((t) => {
          if (t.foto_url) deleteBuktiByUrl(t.foto_url).catch(() => {});
        });
        clearSavedPin(event.id);
        router.push("/");
      } else {
        alert("Gagal menghapus acara. Coba buka mode edit ulang.");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus acara.");
    } finally {
      setDeletingEvent(false);
    }
  }

  function handlePinSuccess(enteredPin: string) {
    if (!event) return;
    savePin(event.id, enteredPin);
    setPin(enteredPin);
    setAutoLockNotice(false);
    if (pinModalMode === "set") {
      setEvent({ ...event, has_pin: true });
    }
    setPinModalMode(null);
  }

  function handleEventDetailsSaved(updated: Event) {
    setEvent(updated);
    setShowEditEvent(false);
  }

  function handleLock() {
    if (!event) return;
    clearSavedPin(event.id);
    setPin(null);
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-10">
        <Link href="/" className="text-sm text-brand hover:underline">
          ← Kembali ke daftar acara
        </Link>
        <div className="mt-6 rounded-xl border border-rust/20 bg-rust-50 p-4 text-sm text-rust">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 pb-28 pt-6 sm:pt-9">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-ink-soft transition hover:text-ink">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M8.5 2.5L3 7l5.5 4.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Daftar acara
        </Link>
        <Brand compact />
      </div>

      {!event || !transactions ? (
        <div className="mt-8 space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded-lg bg-ink/5" />
          <div className="h-24 animate-pulse rounded-xl2 bg-ink/5" />
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-semibold leading-tight text-ink sm:text-[28px]">
                  {event.nama_acara}
                </h1>
                {unlocked && (
                  <button
                    onClick={() => setShowEditEvent(true)}
                    aria-label="Edit detail acara"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-ink/5 hover:text-ink"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M9.5 1.5l3 3-7 7-3.5.5.5-3.5 7-7z"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-sm text-ink-soft">
                {formatRentangTanggal(event.tanggal_mulai, event.tanggal_selesai)}
              </p>
              {event.deskripsi && (
                <p className="mt-2 max-w-md text-sm text-ink-soft/90">{event.deskripsi}</p>
              )}
            </div>
            {unlocked ? (
              <button
                onClick={toggleStatus}
                disabled={savingStatus}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
                  event.status === "selesai"
                    ? "bg-brand-50 text-brand-dark hover:bg-brand-50/70"
                    : "bg-gold-50 text-gold hover:bg-gold-50/70"
                }`}
                title="Klik untuk mengubah status"
              >
                {event.status === "selesai" ? "Selesai" : "Berlangsung"}
              </button>
            ) : (
              <span
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                  event.status === "selesai"
                    ? "bg-brand-50 text-brand-dark"
                    : "bg-gold-50 text-gold"
                }`}
              >
                {event.status === "selesai" ? "Selesai" : "Berlangsung"}
              </span>
            )}
          </div>

          {autoLockNotice && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-gold/30 bg-gold-50 px-3.5 py-2.5 text-xs text-ink">
              <span>Mode bendahara terkunci otomatis karena tidak ada aktivitas.</span>
              <button
                onClick={() => setAutoLockNotice(false)}
                className="shrink-0 text-ink-soft transition hover:text-ink"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
          )}

          {/* Mode indicator + unlock / lock / set-pin controls */}
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-ink/10 bg-white/60 px-3.5 py-2.5">
            <span
              className={`flex items-center gap-1.5 text-xs font-medium ${
                unlocked ? "text-brand-dark" : "text-ink-soft"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                {unlocked ? (
                  <path
                    d="M3 5.5V4a3 3 0 016 0M2.5 5.5h7a1 1 0 011 1V10a1 1 0 01-1 1h-7a1 1 0 01-1-1V6.5a1 1 0 011-1z"
                    stroke="currentColor"
                    strokeWidth="1.1"
                  />
                ) : (
                  <path
                    d="M3 5.5V3.8a3 3 0 016 0V5.5M2.5 5.5h7a1 1 0 011 1V10a1 1 0 01-1 1h-7a1 1 0 01-1-1V6.5a1 1 0 011-1z"
                    stroke="currentColor"
                    strokeWidth="1.1"
                  />
                )}
              </svg>
              {unlocked ? "Mode bendahara (bisa edit)" : "Mode hanya lihat"}
            </span>
            <span className="text-ink-soft/30">•</span>
            {event.has_pin ? (
              unlocked ? (
                <button
                  onClick={handleLock}
                  className="text-xs font-medium text-ink-soft underline-offset-2 hover:text-ink hover:underline"
                >
                  Kunci lagi
                </button>
              ) : (
                <button
                  onClick={() => setPinModalMode("unlock")}
                  className="text-xs font-medium text-brand underline-offset-2 hover:text-brand-dark hover:underline"
                >
                  Masuk sebagai bendahara
                </button>
              )
            ) : (
              <button
                onClick={() => setPinModalMode("set")}
                className="text-xs font-medium text-gold underline-offset-2 hover:underline"
              >
                Atur PIN sekarang
              </button>
            )}
          </div>

          <div className="mt-6">
            <SummaryCards totalPemasukan={totalPemasukan} totalPengeluaran={totalPengeluaran} />
          </div>

          <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
            {unlocked && (
              <button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                className="hidden flex-1 items-center justify-center gap-1.5 rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark sm:flex"
              >
                <span className="text-base leading-none">+</span> Tambah transaksi
              </button>
            )}
            <button
              onClick={() => router.push(`/acara/${eventId}/laporan`)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-ink/15 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink/5"
            >
              Generate laporan
            </button>
          </div>

          <div className="mt-8">
            <h2 className="mb-3 font-display text-base font-semibold text-ink">
              Riwayat transaksi
            </h2>
            {transactions.length === 0 ? (
              <EmptyState
                title="Belum ada transaksi"
                message="Tambahkan transaksi pertama begitu ada pemasukan atau pengeluaran."
              />
            ) : (
              <TransactionList
                transactions={transactions}
                readOnly={!unlocked}
                onEdit={(t) => {
                  setEditing(t);
                  setShowForm(true);
                }}
                onDelete={handleDeleteTransaction}
              />
            )}
          </div>

          {unlocked && (
            <div className="mt-10 rounded-xl border border-dashed border-rust/25 bg-rust-50/40 p-4">
              <p className="text-sm font-medium text-ink">Zona berbahaya</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Sudah download atau print LPJ acara ini dan tidak dibutuhkan lagi? Kamu bisa
                menghapusnya supaya tidak menumpuk di database. Transaksi di dalamnya ikut terhapus
                permanen.
              </p>
              <button
                onClick={() => setShowDeleteEvent(true)}
                className="mt-3 rounded-full border border-rust/30 px-4 py-1.5 text-xs font-semibold text-rust transition hover:bg-rust hover:text-white"
              >
                Hapus acara ini
              </button>
            </div>
          )}

          {/* Mobile floating action button */}
          {unlocked && (
            <button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              aria-label="Tambah transaksi"
              className="fixed bottom-6 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-pop transition hover:bg-brand-dark sm:hidden"
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          )}

          {showForm && unlocked && (
            <TransactionModal
              eventId={eventId}
              pin={effectivePin}
              categories={categories}
              onCategoriesChange={setCategories}
              editing={editing}
              onClose={() => {
                setShowForm(false);
                setEditing(null);
              }}
              onSaved={handleSaved}
            />
          )}

          {pendingDelete && (
            <UndoToast
              message={`Transaksi "${pendingDelete.transaction.kategori}" dihapus`}
              onUndo={handleUndoDeleteTransaction}
            />
          )}

          {showDeleteEvent && (
            <ConfirmDialog
              title="Hapus acara ini?"
              message={`Seluruh data "${event.nama_acara}" beserta ${transactions.length} transaksi di dalamnya akan dihapus permanen dari database. Pastikan kamu sudah download/print laporannya kalau masih dibutuhkan.`}
              confirmLabel={deletingEvent ? "Menghapus..." : "Hapus permanen"}
              onClose={() => setShowDeleteEvent(false)}
              onConfirm={handleDeleteEvent}
            />
          )}

          {showEditEvent && (
            <EditEventModal
              event={event}
              pin={effectivePin}
              onClose={() => setShowEditEvent(false)}
              onSaved={handleEventDetailsSaved}
            />
          )}

          {pinModalMode && (
            <PinModal
              eventId={event.id}
              mode={pinModalMode}
              onClose={() => setPinModalMode(null)}
              onSuccess={handlePinSuccess}
            />
          )}
        </>
      )}
    </main>
  );
}
