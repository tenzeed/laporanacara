"use client";

import { useState } from "react";
import Modal from "./Modal";
import { createEvent } from "@/lib/queries";
import { todayISO } from "@/lib/format";
import type { Event } from "@/lib/types";

export default function CreateEventModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (event: Event) => void;
}) {
  const today = todayISO();
  const [nama, setNama] = useState("");
  const [mulai, setMulai] = useState(today);
  const [selesai, setSelesai] = useState(today);
  const [deskripsi, setDeskripsi] = useState("");
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
      const event = await createEvent({
        nama_acara: nama.trim(),
        tanggal_mulai: mulai,
        tanggal_selesai: selesai,
        deskripsi: deskripsi.trim() || null,
      });
      onCreated(event);
    } catch (err) {
      console.error(err);
      setError("Gagal menyimpan acara. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Buat acara baru" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Nama acara</label>
          <input
            autoFocus
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="mis. Bakti Sosial Ramadan 2026"
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
            placeholder="Catatan singkat tentang acara ini"
            className="w-full resize-none rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        {error && <p className="text-sm text-rust">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="mt-2 w-full rounded-full bg-brand py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Buat acara"}
        </button>
      </form>
    </Modal>
  );
}
