import Link from "next/link";
import type { Event } from "@/lib/types";
import { formatRentangTanggal } from "@/lib/format";

export default function EventCard({ event }: { event: Event }) {
  const selesai = event.status === "selesai";
  return (
    <Link
      href={`/acara/${event.id}`}
      className="group block rounded-xl2 border border-ink/10 bg-white/60 p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-pop"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold leading-snug text-ink">
          {event.nama_acara}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide ${
            selesai ? "bg-brand-50 text-brand-dark" : "bg-gold-50 text-gold"
          }`}
        >
          {selesai ? "Selesai" : "Berlangsung"}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-ink-soft">
        {formatRentangTanggal(event.tanggal_mulai, event.tanggal_selesai)}
      </p>
      {event.deskripsi && (
        <p className="mt-2.5 line-clamp-2 text-sm text-ink-soft/90">{event.deskripsi}</p>
      )}
      <div className="mt-4 flex items-center gap-1 text-sm font-medium text-brand opacity-90">
        Buka acara
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className="transition group-hover:translate-x-0.5"
        >
          <path
            d="M3 7h8M8 3.5L11.5 7 8 10.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </Link>
  );
}
