"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchEvent, fetchTransactions } from "@/lib/queries";
import { formatRupiah, formatRentangTanggal, formatTanggalPanjang } from "@/lib/format";
import { computeCategoryTotals, sortTransactionsChronological } from "@/lib/report";
import type { Event, Transaction } from "@/lib/types";

export default function LaporanPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const [event, setEvent] = useState<Event | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [namaBendahara, setNamaBendahara] = useState("");
  const [namaKetua, setNamaKetua] = useState("");
  const [tempatTtd, setTempatTtd] = useState("");

  useEffect(() => {
    Promise.all([fetchEvent(eventId), fetchTransactions(eventId)])
      .then(([ev, tx]) => {
        setEvent(ev);
        setTransactions(tx);
      })
      .catch((err) => {
        console.error(err);
        setError("Gagal memuat laporan.");
      });
  }, [eventId]);

  async function handleDownload() {
    if (!event || !transactions) return;
    setDownloading(true);
    try {
      const [{ pdf }, { default: LaporanDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/LaporanDocument"),
      ]);
      const blob = await pdf(
        <LaporanDocument
          event={event}
          transactions={transactions}
          namaBendahara={namaBendahara}
          namaKetua={namaKetua}
          tempat={tempatTtd}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeName = event.nama_acara.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      a.href = url;
      a.download = `LPJ-${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Gagal membuat PDF. Coba lagi.");
    } finally {
      setDownloading(false);
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-10">
        <div className="rounded-xl border border-rust/20 bg-rust-50 p-4 text-sm text-rust">{error}</div>
      </main>
    );
  }

  if (!event || !transactions) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-10">
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-ink/5" />
        <div className="mt-6 h-64 animate-pulse rounded-xl2 bg-ink/5" />
      </main>
    );
  }

  const totalPemasukan = transactions
    .filter((t) => t.jenis === "pemasukan")
    .reduce((a, b) => a + b.nominal, 0);
  const totalPengeluaran = transactions
    .filter((t) => t.jenis === "pengeluaran")
    .reduce((a, b) => a + b.nominal, 0);
  const saldo = totalPemasukan - totalPengeluaran;
  const pemasukanKategori = computeCategoryTotals(transactions, "pemasukan");
  const pengeluaranKategori = computeCategoryTotals(transactions, "pengeluaran");
  const kronologis = sortTransactionsChronological(transactions);
  const berfoto = kronologis.filter((t) => t.foto_url);
  const tanggalTtd = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-6 print-area sm:pt-9">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/acara/${eventId}`}
          className="flex items-center gap-1.5 text-sm text-ink-soft transition hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M8.5 2.5L3 7l5.5 4.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Kembali ke acara
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition hover:bg-ink/5"
          >
            Print
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {downloading ? "Membuat PDF..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Report content — mirrors the PDF layout for an accurate print/download preview */}
      <div className="rounded-xl2 border border-ink/10 bg-white p-6 sm:p-10">
        <p className="text-[11px] font-medium uppercase tracking-widest text-ink-soft">
          Laporan Pertanggungjawaban Keuangan
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">
          {event.nama_acara}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {formatRentangTanggal(event.tanggal_mulai, event.tanggal_selesai)}
        </p>
        {event.deskripsi && <p className="mt-1 text-sm text-ink-soft/90">{event.deskripsi}</p>}
        <div className="receipt-edge mt-5 border-b-2 border-brand" />

        <h2 className="mb-3 mt-8 font-display text-lg font-semibold text-ink">Ringkasan</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-ink/10 p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-ink-soft">Pemasukan</p>
            <p className="mt-1 font-mono text-base font-semibold tabular-nums text-brand-dark sm:text-lg">
              {formatRupiah(totalPemasukan)}
            </p>
          </div>
          <div className="rounded-lg border border-ink/10 p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-ink-soft">Pengeluaran</p>
            <p className="mt-1 font-mono text-base font-semibold tabular-nums text-rust sm:text-lg">
              {formatRupiah(totalPengeluaran)}
            </p>
          </div>
          <div className="rounded-lg border border-ink/10 p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-ink-soft">Saldo akhir</p>
            <p
              className={`mt-1 font-mono text-base font-semibold tabular-nums sm:text-lg ${
                saldo < 0 ? "text-rust" : "text-brand-dark"
              }`}
            >
              {formatRupiah(saldo)}
            </p>
          </div>
        </div>

        <ReportCategoryTable title="Rincian Pemasukan per Kategori" rows={pemasukanKategori} />
        <ReportCategoryTable title="Rincian Pengeluaran per Kategori" rows={pengeluaranKategori} />

        <h2 className="mb-3 mt-8 font-display text-lg font-semibold text-ink">
          Daftar Transaksi Lengkap
        </h2>
        {kronologis.length === 0 ? (
          <p className="text-sm text-ink-soft">Belum ada transaksi.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-ink/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper-dim/60 text-[11px] uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Tanggal</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Jenis</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Kategori</th>
                  <th className="px-3 py-2 font-semibold">Keterangan</th>
                  <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {kronologis.map((t) => (
                  <tr key={t.id} className="border-t border-ink/10">
                    <td className="whitespace-nowrap px-3 py-2 text-ink-soft">
                      {formatTanggalPanjang(t.tanggal)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-2 ${
                        t.jenis === "pemasukan" ? "text-brand-dark" : "text-rust"
                      }`}
                    >
                      {t.jenis === "pemasukan" ? "Masuk" : "Keluar"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{t.kategori}</td>
                    <td className="px-3 py-2 text-ink-soft">{t.keterangan || "-"}</td>
                    <td
                      className={`whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums ${
                        t.jenis === "pemasukan" ? "text-brand-dark" : "text-rust"
                      }`}
                    >
                      {t.jenis === "pengeluaran" ? "-" : ""}
                      {formatRupiah(t.nominal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-14 border-t border-dashed border-ink/15 pt-8">
          <div className="mb-8 flex items-baseline justify-end gap-1 text-sm text-ink-soft">
            <input
              value={tempatTtd}
              onChange={(e) => setTempatTtd(e.target.value)}
              placeholder="Kota"
              size={Math.max(tempatTtd.length, 8)}
              className="no-print border-0 bg-transparent text-right text-sm text-ink-soft outline-none placeholder:text-ink-soft/40 focus:bg-ink/5"
            />
            <span className="print-only hidden">
              {tempatTtd.trim() || "....................."}
            </span>
            <span>, {tanggalTtd}</span>
          </div>
          <div className="flex justify-between gap-8">
            <div className="flex flex-1 flex-col items-center text-center">
              <p className="invisible text-xs text-ink-soft">Mengetahui,</p>
              <p className="text-sm text-ink">Bendahara Acara</p>
              <div className="mt-12 w-full border-b border-ink" />
              <input
                value={namaBendahara}
                onChange={(e) => setNamaBendahara(e.target.value)}
                placeholder="Nama lengkap bendahara"
                className="no-print mt-1.5 w-full border-0 bg-transparent text-center text-xs text-ink outline-none placeholder:text-ink-soft/40 focus:bg-ink/5"
              />
              <p className="print-only mt-1.5 hidden text-xs text-ink">
                {namaBendahara.trim() || "....................................."}
              </p>
            </div>
            <div className="flex flex-1 flex-col items-center text-center">
              <p className="text-xs text-ink-soft">Mengetahui,</p>
              <p className="text-sm text-ink">Ketua Panitia</p>
              <div className="mt-12 w-full border-b border-ink" />
              <input
                value={namaKetua}
                onChange={(e) => setNamaKetua(e.target.value)}
                placeholder="Nama lengkap ketua panitia"
                className="no-print mt-1.5 w-full border-0 bg-transparent text-center text-xs text-ink outline-none placeholder:text-ink-soft/40 focus:bg-ink/5"
              />
              <p className="print-only mt-1.5 hidden text-xs text-ink">
                {namaKetua.trim() || "....................................."}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-ink-soft/70">
          Dibuat otomatis oleh Buku Acara
        </p>
      </div>

      {berfoto.length > 0 && (
        <div className="mt-6 rounded-xl2 border border-ink/10 bg-white p-6 sm:p-10">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink">
            Lampiran Bukti Transaksi
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {berfoto.map((t) => (
              <a
                key={t.id}
                href={t.foto_url as string}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg border border-ink/10"
              >
                <img src={t.foto_url as string} alt="" className="h-28 w-full object-cover" />
                <div className="p-2">
                  <p className="text-[11px] text-ink-soft">
                    {formatTanggalPanjang(t.tanggal)} — {t.kategori}
                  </p>
                  <p
                    className={`font-mono text-xs font-semibold tabular-nums ${
                      t.jenis === "pemasukan" ? "text-brand-dark" : "text-rust"
                    }`}
                  >
                    {t.jenis === "pengeluaran" ? "-" : ""}
                    {formatRupiah(t.nominal)}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function ReportCategoryTable({
  title,
  rows,
}: {
  title: string;
  rows: { kategori: string; total: number; jumlah_transaksi: number }[];
}) {
  return (
    <>
      <h2 className="mb-3 mt-8 font-display text-lg font-semibold text-ink">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft">Tidak ada data.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-ink/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper-dim/60 text-[11px] uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">Kategori</th>
                <th className="whitespace-nowrap px-3 py-2 text-center font-semibold">
                  Jumlah Transaksi
                </th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.kategori} className="border-t border-ink/10">
                  <td className="whitespace-nowrap px-3 py-2">{r.kategori}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-center text-ink-soft">
                    {r.jumlah_transaksi}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-mono font-semibold tabular-nums">
                    {formatRupiah(r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
