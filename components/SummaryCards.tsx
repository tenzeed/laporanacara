import { formatRupiah } from "@/lib/format";

export default function SummaryCards({
  totalPemasukan,
  totalPengeluaran,
}: {
  totalPemasukan: number;
  totalPengeluaran: number;
}) {
  const saldo = totalPemasukan - totalPengeluaran;
  const negatif = saldo < 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <div className="rounded-xl2 border border-ink/10 bg-white/70 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Pemasukan</p>
        <p className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-brand-dark sm:text-xl">
          {formatRupiah(totalPemasukan)}
        </p>
      </div>
      <div className="rounded-xl2 border border-ink/10 bg-white/70 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Pengeluaran</p>
        <p className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-rust sm:text-xl">
          {formatRupiah(totalPengeluaran)}
        </p>
      </div>

      {/* Signature element: running balance styled like a torn receipt tape */}
      <div className="receipt-edge col-span-2 mb-3 rounded-t-xl2 bg-ink px-5 pb-6 pt-5 text-paper">
        <p className="text-xs font-medium uppercase tracking-wide text-paper/60">Saldo akhir</p>
        <p
          className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums sm:text-3xl ${
            negatif ? "text-rust-light" : "text-paper"
          }`}
        >
          {formatRupiah(saldo)}
        </p>
        <p className="mt-1 text-[11px] text-paper/50">
          Update otomatis setiap ada transaksi baru
        </p>
      </div>
    </div>
  );
}
