"use client";

import { useState } from "react";
import Modal from "./Modal";
import { updateEventDetails } from "@/lib/queries";
import type { Event } from "@/lib/types";

export default function EditEventModal({
  event,
  pin,
  onClose,
  onSaved,
}: {
  event: Event;
  pin: string;
  onClose: () => void;
  onSaved: (event: Event) => void;
}) {
  const [nama, setNama] = useState(event.nama_acara);
  const [mulai, setMulai] = useState(event.tanggal_mulai);
  const [selesai, setSelesai] = useState(event.tanggal_selesai);
  const [deskripsi, setDeskripsi] = useState(event.deskripsi ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim()) {
      setError("Nama acara wajib diisi.");
      return;
    }
    if (selesai < mulai) {
      setError("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = {
        nama_acara: nama.trim(),
        tanggal_mulai: mulai,
        tanggal_selesai: selesai,
        deskripsi: deskripsi.trim() || null,
      };
      const ok = await updateEventDetails(event.id, pin, input);
      if (!ok) {
        setError("Gagal menyimpan. Coba buka mode edit ulang (PIN mungkin sudah tidak valid).");
        setSaving(false);
        return;
      }
      onSaved({ ...event, ...input });
    } catch (err) {
      console.error(err);
      setError("Gagal menyimpan perubahan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit detail acara" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Nama acara</label>
          <input
            autoFocus
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Tanggal mulai</label>
            <input
              type="date"
              value={mulai}
              onChange={(e) => setMulai(e.target.value)}
              className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Tanggal selesai</label>
            <input
              type="date"
              value={selesai}
              onChange={(e) => setSelesai(e.target.value)}
              className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Deskripsi <span className="font-normal text-ink-soft">(opsional)</span>
          </label>
          <textarea
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        {error && <p className="text-sm text-rust">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="mt-2 w-full rounded-full bg-brand py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan perubahan"}
        </button>
      </form>
    </Modal>
  );
}
