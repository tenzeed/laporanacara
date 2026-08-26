export type Jenis = "pemasukan" | "pengeluaran";
export type EventStatus = "berlangsung" | "selesai";

export interface Event {
  id: string;
  nama_acara: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  deskripsi: string | null;
  status: EventStatus;
  created_at: string;
}

export interface Category {
  id: string;
  nama_kategori: string;
  jenis: Jenis;
  is_default: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  event_id: string;
  jenis: Jenis;
  kategori: string;
  nominal: number;
  tanggal: string;
  keterangan: string | null;
  created_at: string;
}

export interface CategoryTotal {
  kategori: string;
  total: number;
  jumlah_transaksi: number;
}
