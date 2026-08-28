"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Brand from "@/components/Brand";
import EventCard from "@/components/EventCard";
import EmptyState from "@/components/EmptyState";
import CreateEventModal from "@/components/CreateEventModal";
import CreditFooter from "@/components/CreditFooter";
import InstallPwaButton from "@/components/InstallPwaButton";
import { fetchEvents } from "@/lib/queries";
import type { Event, EventStatus } from "@/lib/types";

type Filter = "semua" | EventStatus;

export default function HomePage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[] | null>(null);
  const [filter, setFilter] = useState<Filter>("semua");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents()
      .then(setEvents)
      .catch((err) => {
        console.error(err);
        setError(
          "Gagal memuat data. Pastikan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY sudah diisi di .env.local."
        );
      });
  }, []);

  const filtered = useMemo(() => {
    if (!events) return [];
    if (filter === "semua") return events;
    return events.filter((e) => e.status === filter);
  }, [events, filter]);

  const tabs: { key: Filter; label: string }[] = [
    { key: "semua", label: "Semua" },
    { key: "berlangsung", label: "Berlangsung" },
    { key: "selesai", label: "Selesai" },
  ];

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 pb-28 pt-8 sm:pt-12">
      <div className="flex items-center justify-between">
        <Brand />
        <InstallPwaButton />
      </div>

      <div className="mt-9 sm:mt-12">
        <h1 className="font-display text-[28px] font-semibold italic leading-tight text-ink sm:text-3xl">
          Setiap acara, satu buku.
        </h1>
        <p className="mt-2 max-w-md text-[15px] text-ink-soft">
          Catat pemasukan & pengeluaran dari HP saat acara berlangsung. Laporan rapi tinggal
          digenerate kapan saja.
        </p>
      </div>

      <div className="mt-7 flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full bg-ink/5 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                filter === t.key ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="hidden shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark sm:flex"
        >
          <span className="text-base leading-none">+</span> Acara baru
        </button>
      </div>

      <div className="mt-6">
        {error && (
          <div className="rounded-xl border border-rust/20 bg-rust-50 p-4 text-sm text-rust">
            {error}
          </div>
        )}

        {!error && events === null && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl2 bg-ink/5" />
            ))}
          </div>
        )}

        {!error && events !== null && filtered.length === 0 && (
          <EmptyState
            title={events.length === 0 ? "Belum ada acara" : "Tidak ada acara di sini"}
            message={
              events.length === 0
                ? "Mulai dengan membuat acara pertamamu. Semua transaksi akan tercatat rapi per acara."
                : "Coba pilih tab lain, atau buat acara baru."
            }
            action={
              events.length === 0 ? (
                <button
                  onClick={() => setShowCreate(true)}
                  className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
                >
                  + Buat acara baru
                </button>
              ) : undefined
            }
          />
        )}

        {!error && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {filtered.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      <CreditFooter />

      {/* Mobile floating action button */}
      <button
        onClick={() => setShowCreate(true)}
        aria-label="Buat acara baru"
        className="fixed bottom-6 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-pop transition hover:bg-brand-dark sm:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {showCreate && (
        <CreateEventModal
          onClose={() => setShowCreate(false)}
          onCreated={(event) => {
            setShowCreate(false);
            router.push(`/acara/${event.id}`);
          }}
        />
      )}
    </main>
  );
}
