export function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function formatAngka(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n || 0);
}

export function formatTanggalPanjang(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatTanggalPendek(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatRentangTanggal(mulai: string, selesai: string): string {
  if (mulai === selesai) return formatTanggalPanjang(mulai);
  const d1 = new Date(mulai + "T00:00:00");
  const d2 = new Date(selesai + "T00:00:00");
  const sameMonth = d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  const fmtDay = new Intl.DateTimeFormat("id-ID", { day: "numeric" });
  const fmtFull = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" });
  if (sameMonth) {
    return `${fmtDay.format(d1)} - ${fmtFull.format(d2)}`;
  }
  return `${fmtFull.format(d1)} - ${fmtFull.format(d2)}`;
}

export function todayISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}
