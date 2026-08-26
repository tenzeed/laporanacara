import type { CategoryTotal, Jenis, Transaction } from "./types";

export function computeCategoryTotals(transactions: Transaction[], jenis: Jenis): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  for (const t of transactions) {
    if (t.jenis !== jenis) continue;
    const existing = map.get(t.kategori) ?? {
      kategori: t.kategori,
      total: 0,
      jumlah_transaksi: 0,
    };
    existing.total += t.nominal;
    existing.jumlah_transaksi += 1;
    map.set(t.kategori, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export function sortTransactionsChronological(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.tanggal !== b.tanggal) return a.tanggal < b.tanggal ? -1 : 1;
    return a.created_at < b.created_at ? -1 : 1;
  });
}
