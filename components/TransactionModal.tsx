"use client";

import { useMemo, useState } from "react";
import Modal from "./Modal";
import { createCategory, createTransaction, updateTransaction } from "@/lib/queries";
import { todayISO } from "@/lib/format";
import type { Category, Jenis, Transaction } from "@/lib/types";

const jenisConfig: Record<Jenis, { label: string; active: string }> = {
  pemasukan: { label: "Pemasukan", active: "bg-brand text-white" },
  pengeluaran: { label: "Pengeluaran", active: "bg-rust text-white" },
};

export default function TransactionModal({
  eventId,
  pin,
  categories,
  onCategoriesChange,
  editing,
  onClose,
  onSaved,
}: {
  eventId: string;
  pin: string;
  categories: Category[];
  onCategoriesChange: (cats: Category[]) => void;
  editing?: Transaction | null;
  onClose: () => void;
  onSaved: (t: Transaction) => void;
}) {
  const [jenis, setJenis] = useState<Jenis>(editing?.jenis ?? "pengeluaran");
  const [kategori, setKategori] = useState(editing?.kategori ?? "");
  const [nominalRaw, setNominalRaw] = useState(editing ? String(editing.nominal) : "");
  const [tanggal, setTanggal] = useState(editing?.tanggal ?? todayISO());
  const [keterangan, setKeterangan] = useState(editing?.keterangan ?? "");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.jenis === jenis),
    [categories, jenis]
  );

  function handleJenisChange(next: Jenis) {
    setJenis(next);
    if (!categories.some((c) => c.jenis === next && c.nama_kategori === kategori)) {
      setKategori("");
    }
  }

  async function handleAddCategory() {
    if (!newCategory.trim()) return;
    try {
      const cat = await createCategory(eventId, pin, newCategory.trim(), jenis);
      onCategoriesChange([...categories, cat]);
      setKategori(cat.nama_kategori);
      setNewCategory("");
      setAddingCategory(false);
    } catch (err) {
      console.error(err);
      setError("Gagal menambah kategori. PIN mungkin salah, atau nama kategori sudah ada.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nominal = Number(nominalRaw);
    if (!kategori) {
      setError("Pilih atau tambah kategori dulu.");
      return;
    }
    if (!nominal || nominal <= 0) {
      setError("Nominal harus lebih dari 0.");
      return;
    }
    if (!tanggal) {
      setError("Tanggal wajib diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let result: Transaction;
      if (editing) {
        result = await updateTransaction(editing.id, pin, {
          jenis,
          kategori,
          nominal,
          tanggal,
          keterangan: keterangan.trim() || null,
        });
      } else {
        result = await createTransaction({
          event_id: eventId,
          pin,
          jenis,
          kategori,
          nominal,
          tanggal,
          keterangan: keterangan.trim() || null,
        });
      }
      onSaved(result);
    } catch (err) {
      console.error(err);
      setError("Gagal menyimpan transaksi. PIN mungkin salah, atau coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  const displayNominal = nominalRaw ? Number(nominalRaw).toLocaleString("id-ID") : "";

  return (
    <Modal title={editing ? "Edit transaksi" : "Tambah transaksi"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-full bg-ink/5 p-1">
          {(Object.keys(jenisConfig) as Jenis[]).map((j) => (
            <button
              type="button"
              key={j}
              onClick={() => handleJenisChange(j)}
              className={`rounded-full py-2 text-sm font-medium transition ${
                jenis === j ? jenisConfig[j].active : "text-ink-soft hover:text-ink"
              }`}
            >
              {jenisConfig[j].label}
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Kategori</label>
          {!addingCategory ? (
            <div className="flex flex-wrap gap-2">
              {filteredCategories.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setKategori(c.nama_kategori)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                    kategori === c.nama_kategori
                      ? "border-brand bg-brand-50 text-brand-dark"
                      : "border-ink/15 text-ink-soft hover:border-ink/30 hover:text-ink"
                  }`}
                >
                  {c.nama_kategori}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAddingCategory(true)}
                className="rounded-full border border-dashed border-ink/25 px-3.5 py-1.5 text-sm text-ink-soft transition hover:border-brand hover:text-brand"
              >
                + Kategori baru
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                autoFocus
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nama kategori baru"
                className="flex-1 rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="rounded-lg bg-brand px-3.5 text-sm font-medium text-white transition hover:bg-brand-dark"
              >
                Tambah
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingCategory(false);
                  setNewCategory("");
                }}
                className="rounded-lg border border-ink/15 px-3 text-sm text-ink-soft transition hover:bg-ink/5"
              >
                Batal
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Nominal (Rp)</label>
            <input
              inputMode="numeric"
              value={displayNominal}
              onChange={(e) => setNominalRaw(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="0"
              className="w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 font-mono text-sm text-ink placeholder:text-ink-soft/50 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Tanggal</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Keterangan <span className="font-normal text-ink-soft">(opsional)</span>
          </label>
          <input
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="mis. Beli konsumsi hari pertama"
            className="w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        {error && <p className="text-sm text-rust">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="mt-2 w-full rounded-full bg-brand py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : editing ? "Simpan perubahan" : "Simpan transaksi"}
        </button>
      </form>
    </Modal>
  );
}
