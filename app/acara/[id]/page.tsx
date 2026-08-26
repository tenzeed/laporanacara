"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Brand from "@/components/Brand";
import SummaryCards from "@/components/SummaryCards";
import TransactionList from "@/components/TransactionList";
import TransactionModal from "@/components/TransactionModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import {
  fetchCategories,
  fetchEvent,
  fetchTransactions,
  updateEventStatus,
  deleteTransaction,
} from "@/lib/queries";
import { formatRentangTanggal } from "@/lib/format";
import type { Category, Event, Transaction } from "@/lib/types";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params.id;

  const [event, setEvent] = useState<Event | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [toDelete, setToDelete] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    Promise.all([fetchEvent(eventId), fetchTransactions(eventId), fetchCategories()])
      .then(([ev, tx, cats]) => {
        setEvent(ev);
        setTransactions(tx);
        setCategories(cats);
      })
      .catch((err) => {
        console.error(err);
        setError("Acara tidak ditemukan atau gagal memuat data.");
      });
  }, [eventId]);

  const totalPemasukan =
    transactions?.filter((t) => t.jenis === "pemasukan").reduce((a, b) => a + b.nominal, 0) ?? 0;
  const totalPengeluaran =
    transactions?.filter((t) => t.jenis === "pengeluaran").reduce((a, b) => a + b.nominal, 0) ?? 0;

  async function toggleStatus() {
    if (!event) return;
    const next = event.status === "berlangsung" ? "selesai" : "berlangsung";
    setSavingStatus(true);
    try {
      await updateEventStatus(event.id, next);
      setEvent({ ...event, status: next });
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

  async function handleDelete(t: Transaction) {
    try {
      await deleteTransaction(t.id);
      setTransactions((prev) => (prev ?? []).filter((x) => x.id !== t.id));
    } catch (err) {
      console.error(err);
    }
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
              <h1 className="font-display text-2xl font-semibold leading-tight text-ink sm:text-[28px]">
                {event.nama_acara}
              </h1>
              <p className="mt-1.5 text-sm text-ink-soft">
                {formatRentangTanggal(event.tanggal_mulai, event.tanggal_selesai)}
              </p>
              {event.deskripsi && (
                <p className="mt-2 max-w-md text-sm text-ink-soft/90">{event.deskripsi}</p>
              )}
            </div>
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
          </div>

          <div className="mt-6">
            <SummaryCards totalPemasukan={totalPemasukan} totalPengeluaran={totalPengeluaran} />
          </div>

          <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
            <button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="hidden flex-1 items-center justify-center gap-1.5 rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark sm:flex"
            >
              <span className="text-base leading-none">+</span> Tambah transaksi
            </button>
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
                onEdit={(t) => {
                  setEditing(t);
                  setShowForm(true);
                }}
                onDelete={(t) => setToDelete(t)}
              />
            )}
          </div>

          {/* Mobile floating action button */}
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

          {showForm && (
            <TransactionModal
              eventId={eventId}
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

          {toDelete && (
            <ConfirmDialog
              title="Hapus transaksi?"
              message={`Transaksi "${toDelete.kategori}" akan dihapus permanen dan tidak bisa dikembalikan.`}
              onClose={() => setToDelete(null)}
              onConfirm={() => handleDelete(toDelete)}
            />
          )}
        </>
      )}
    </main>
  );
}
