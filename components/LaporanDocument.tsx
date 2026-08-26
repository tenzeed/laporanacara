"use client";

import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { Event, Transaction } from "@/lib/types";
import { formatRupiah, formatTanggalPanjang, formatRentangTanggal } from "@/lib/format";
import { computeCategoryTotals, sortTransactionsChronological } from "@/lib/report";

const BRAND = "#1F6F5C";
const RUST = "#B5473B";
const INK = "#16231F";
const INK_SOFT = "#5B6A64";
const LINE = "#D8D3C4";

const styles = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingBottom: 48,
    paddingHorizontal: 42,
    fontSize: 9.5,
    color: INK,
    fontFamily: "Helvetica",
  },
  eyebrow: {
    fontSize: 8,
    color: INK_SOFT,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 10,
    color: INK_SOFT,
    marginBottom: 1,
  },
  headerRule: {
    borderBottomWidth: 1.5,
    borderBottomColor: BRAND,
    marginTop: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    marginTop: 18,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 4,
    padding: 10,
  },
  summaryLabel: {
    fontSize: 8,
    color: INK_SOFT,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  summaryValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
  },
  table: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 4,
    overflow: "hidden",
  },
  tHeadRow: {
    flexDirection: "row",
    backgroundColor: "#F1EFE6",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  tRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  tRowLast: {
    flexDirection: "row",
  },
  th: {
    padding: 6,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: INK_SOFT,
    textTransform: "uppercase",
  },
  td: {
    padding: 6,
    fontSize: 9,
  },
  colDate: { width: "13%" },
  colJenis: { width: "12%" },
  colKategori: { width: "20%" },
  colKeterangan: { width: "35%" },
  colNominal: { width: "20%", textAlign: "right" },
  colKategoriWide: { width: "55%" },
  colJumlah: { width: "20%", textAlign: "center" },
  colTotal: { width: "25%", textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 42,
    right: 42,
    fontSize: 7.5,
    color: INK_SOFT,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  signatureDate: {
    fontSize: 9,
    color: INK_SOFT,
  },
  signatureBlockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureCol: {
    width: "42%",
    alignItems: "center",
  },
  signatureRole: {
    fontSize: 9,
    marginBottom: 2,
  },
  signatureSubrole: {
    fontSize: 8,
    color: INK_SOFT,
    marginBottom: 45,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: INK,
    width: "100%",
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 8,
    color: INK_SOFT,
  },
  attachGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  attachItem: {
    width: "31%",
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 4,
    padding: 6,
  },
  attachImage: {
    width: "100%",
    height: 110,
    objectFit: "cover",
    borderRadius: 2,
    marginBottom: 5,
  },
  attachCaption: {
    fontSize: 7.5,
    color: INK_SOFT,
    lineHeight: 1.4,
  },
});

function Money({ value, negative }: { value: number; negative?: boolean }) {
  return (
    <Text style={{ color: negative ? RUST : BRAND, fontFamily: "Helvetica-Bold" }}>
      {formatRupiah(value)}
    </Text>
  );
}

export default function LaporanDocument({
  event,
  transactions,
}: {
  event: Event;
  transactions: Transaction[];
}) {
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

  const generatedAt = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const tanggalTtd = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>LAPORAN PERTANGGUNGJAWABAN KEUANGAN</Text>
        <Text style={styles.title}>{event.nama_acara}</Text>
        <Text style={styles.subtitle}>
          {formatRentangTanggal(event.tanggal_mulai, event.tanggal_selesai)}
        </Text>
        {event.deskripsi ? <Text style={styles.subtitle}>{event.deskripsi}</Text> : null}
        <View style={styles.headerRule} />

        <Text style={styles.sectionTitle}>Ringkasan</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Pemasukan</Text>
            <Money value={totalPemasukan} />
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Pengeluaran</Text>
            <Money value={totalPengeluaran} negative />
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Saldo Akhir</Text>
            <Money value={saldo} negative={saldo < 0} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Rincian Pemasukan per Kategori</Text>
        {pemasukanKategori.length === 0 ? (
          <Text style={{ fontSize: 9, color: INK_SOFT }}>Tidak ada data pemasukan.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tHeadRow}>
              <Text style={[styles.th, styles.colKategoriWide]}>Kategori</Text>
              <Text style={[styles.th, styles.colJumlah]}>Jumlah Transaksi</Text>
              <Text style={[styles.th, styles.colTotal]}>Total</Text>
            </View>
            {pemasukanKategori.map((c, i) => (
              <View
                style={i === pemasukanKategori.length - 1 ? styles.tRowLast : styles.tRow}
                key={c.kategori}
              >
                <Text style={[styles.td, styles.colKategoriWide]}>{c.kategori}</Text>
                <Text style={[styles.td, styles.colJumlah]}>{c.jumlah_transaksi}</Text>
                <Text style={[styles.td, styles.colTotal, { fontFamily: "Helvetica-Bold" }]}>
                  {formatRupiah(c.total)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Rincian Pengeluaran per Kategori</Text>
        {pengeluaranKategori.length === 0 ? (
          <Text style={{ fontSize: 9, color: INK_SOFT }}>Tidak ada data pengeluaran.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tHeadRow}>
              <Text style={[styles.th, styles.colKategoriWide]}>Kategori</Text>
              <Text style={[styles.th, styles.colJumlah]}>Jumlah Transaksi</Text>
              <Text style={[styles.th, styles.colTotal]}>Total</Text>
            </View>
            {pengeluaranKategori.map((c, i) => (
              <View
                style={i === pengeluaranKategori.length - 1 ? styles.tRowLast : styles.tRow}
                key={c.kategori}
              >
                <Text style={[styles.td, styles.colKategoriWide]}>{c.kategori}</Text>
                <Text style={[styles.td, styles.colJumlah]}>{c.jumlah_transaksi}</Text>
                <Text style={[styles.td, styles.colTotal, { fontFamily: "Helvetica-Bold" }]}>
                  {formatRupiah(c.total)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle} break>
          Daftar Transaksi Lengkap
        </Text>
        {kronologis.length === 0 ? (
          <Text style={{ fontSize: 9, color: INK_SOFT }}>Belum ada transaksi.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tHeadRow}>
              <Text style={[styles.th, styles.colDate]}>Tanggal</Text>
              <Text style={[styles.th, styles.colJenis]}>Jenis</Text>
              <Text style={[styles.th, styles.colKategori]}>Kategori</Text>
              <Text style={[styles.th, styles.colKeterangan]}>Keterangan</Text>
              <Text style={[styles.th, styles.colNominal]}>Nominal</Text>
            </View>
            {kronologis.map((t, i) => (
              <View style={i === kronologis.length - 1 ? styles.tRowLast : styles.tRow} key={t.id} wrap={false}>
                <Text style={[styles.td, styles.colDate]}>{formatTanggalPanjang(t.tanggal)}</Text>
                <Text
                  style={[
                    styles.td,
                    styles.colJenis,
                    { color: t.jenis === "pemasukan" ? BRAND : RUST },
                  ]}
                >
                  {t.jenis === "pemasukan" ? "Masuk" : "Keluar"}
                </Text>
                <Text style={[styles.td, styles.colKategori]}>{t.kategori}</Text>
                <Text style={[styles.td, styles.colKeterangan]}>{t.keterangan || "-"}</Text>
                <Text
                  style={[
                    styles.td,
                    styles.colNominal,
                    { fontFamily: "Helvetica-Bold", color: t.jenis === "pemasukan" ? BRAND : RUST },
                  ]}
                >
                  {t.jenis === "pengeluaran" ? "-" : ""}
                  {formatRupiah(t.nominal)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.signatureRow} break>
          <Text style={styles.signatureDate}>............................., {tanggalTtd}</Text>
        </View>
        <View style={styles.signatureBlockRow} wrap={false}>
          <View style={styles.signatureCol}>
            <Text style={styles.signatureRole}>Bendahara Acara</Text>
            <Text style={styles.signatureSubrole}> </Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>( ..................................... )</Text>
          </View>
          <View style={styles.signatureCol}>
            <Text style={styles.signatureRole}>Mengetahui,</Text>
            <Text style={styles.signatureSubrole}>Ketua Panitia</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>( ..................................... )</Text>
          </View>
        </View>

        {berfoto.length > 0 && (
          <>
            <Text style={styles.sectionTitle} break>
              Lampiran Bukti Transaksi
            </Text>
            <View style={styles.attachGrid}>
              {berfoto.map((t) => (
                <View style={styles.attachItem} key={t.id} wrap={false}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={t.foto_url as string} style={styles.attachImage} />
                  <Text style={styles.attachCaption}>
                    {formatTanggalPanjang(t.tanggal)} — {t.kategori}
                  </Text>
                  <Text
                    style={[
                      styles.attachCaption,
                      { fontFamily: "Helvetica-Bold", color: t.jenis === "pemasukan" ? BRAND : RUST },
                    ]}
                  >
                    {t.jenis === "pengeluaran" ? "-" : ""}
                    {formatRupiah(t.nominal)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.footer} fixed>
          <Text>Dibuat otomatis oleh Buku Acara</Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
          <Text>Digenerate {generatedAt}</Text>
        </View>
      </Page>
    </Document>
  );
}
