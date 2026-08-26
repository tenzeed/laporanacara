"use client";

import { useMemo } from "react";
import { formatRupiah, formatTanggalPanjang } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export default function TransactionList({
  transactions,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[];
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const list = map.get(t.tanggal) ?? [];
      list.push(t);
      map.set(t.tanggal, list);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [transactions]);

  if (transactions.length === 0) return null;

  return (
    <div className="space-y-6">
      {grouped.map(([tanggal, items]) => (
        <div key={tanggal}>
          <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-ink-soft">
            {formatTanggalPanjang(tanggal)}
          </p>
          <div className="space-y-2">
            {items.map((t) => (
              <div
                key={t.id}
                className="group flex items-center gap-3 rounded-xl border border-ink/10 bg-white/70 p-3.5 transition hover:border-ink/20"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    t.jenis === "pemasukan" ? "bg-brand-50 text-brand-dark" : "bg-rust-50 text-rust"
                  }`}
                >
                  {t.jenis === "pemasukan" ? "+" : "−"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-ink">{t.kategori}</p>
                  </div>
                  {t.keterangan && (
                    <p className="truncate text-xs text-ink-soft">{t.keterangan}</p>
                  )}
                </div>
                <p
                  className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${
                    t.jenis === "pemasukan" ? "text-brand-dark" : "text-rust"
                  }`}
                >
                  {t.jenis === "pengeluaran" ? "-" : ""}
                  {formatRupiah(t.nominal)}
                </p>
                <div className="ml-1 flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 sm:opacity-100">
                  <button
                    onClick={() => onEdit(t)}
                    aria-label="Edit transaksi"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition hover:bg-ink/5 hover:text-ink"
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
                  <button
                    onClick={() => onDelete(t)}
                    aria-label="Hapus transaksi"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition hover:bg-rust-50 hover:text-rust"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M2.5 3.5h9M5.5 3.5V2a1 1 0 011-1h1a1 1 0 011 1v1.5M11 3.5l-.6 8.1a1 1 0 01-1 .9H4.6a1 1 0 01-1-.9L3 3.5"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
