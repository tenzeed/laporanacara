import { supabase } from "./supabase";
import type { Category, Event, EventStatus, Jenis, Transaction } from "./types";

// Kolom yang boleh dibaca publik dari tabel events. pin_hash SENGAJA tidak
// pernah diminta di sini — akses ke kolom itu memang dicabut lewat GRANT
// di database, jadi query select('*') akan gagal. Selalu sebutkan kolom
// secara eksplisit untuk tabel events.
const EVENT_COLUMNS =
  "id, nama_acara, tanggal_mulai, tanggal_selesai, deskripsi, status, has_pin, created_at";

// ---------- Events (baca: publik / tanpa PIN) ----------

export async function fetchEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Event[];
}

export async function fetchEvent(id: string): Promise<Event> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as unknown as Event;
}

// ---------- Events (tulis: wajib lewat fungsi ber-PIN) ----------

export async function createEvent(input: {
  nama_acara: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  deskripsi?: string | null;
  pin: string;
}): Promise<Event> {
  const { data, error } = await supabase
    .rpc("create_event_with_pin", {
      p_nama_acara: input.nama_acara,
      p_tanggal_mulai: input.tanggal_mulai,
      p_tanggal_selesai: input.tanggal_selesai,
      p_deskripsi: input.deskripsi || null,
      p_pin: input.pin,
    })
    .single();
  if (error) throw error;
  return data as unknown as Event;
}

/** Mengecek PIN suatu acara. Acara tanpa PIN (has_pin=false) selalu lolos. */
export async function verifyEventPin(eventId: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("verify_event_pin", {
    p_event_id: eventId,
    p_pin: pin,
  });
  if (error) throw error;
  return Boolean(data);
}

/** Memasang PIN untuk acara lama yang belum punya PIN (has_pin masih false). */
export async function setEventPinIfMissing(eventId: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("set_event_pin_if_missing", {
    p_event_id: eventId,
    p_pin: pin,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function updateEventStatus(
  eventId: string,
  status: EventStatus,
  pin: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("update_event_status_with_pin", {
    p_event_id: eventId,
    p_pin: pin,
    p_status: status,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function updateEventDetails(
  eventId: string,
  pin: string,
  input: {
    nama_acara: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
    deskripsi?: string | null;
  }
): Promise<boolean> {
  const { data, error } = await supabase.rpc("update_event_details_with_pin", {
    p_event_id: eventId,
    p_pin: pin,
    p_nama_acara: input.nama_acara,
    p_tanggal_mulai: input.tanggal_mulai,
    p_tanggal_selesai: input.tanggal_selesai,
    p_deskripsi: input.deskripsi || null,
  });
  if (error) throw error;
  return Boolean(data);
}

/** Menghapus acara beserta seluruh transaksinya. Aksi permanen. */
export async function deleteEvent(eventId: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("delete_event_with_pin", {
    p_event_id: eventId,
    p_pin: pin,
  });
  if (error) throw error;
  return Boolean(data);
}

// ---------- Categories (baca: publik, tulis: lewat fungsi ber-PIN) ----------

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("nama_kategori", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(
  eventId: string,
  pin: string,
  nama_kategori: string,
  jenis: Jenis
): Promise<Category> {
  const { data, error } = await supabase
    .rpc("add_category_with_pin", {
      p_event_id: eventId,
      p_pin: pin,
      p_nama_kategori: nama_kategori.trim(),
      p_jenis: jenis,
    })
    .single();
  if (error) throw error;
  return data as unknown as Category;
}

// ---------- Transactions (baca: publik, tulis: lewat fungsi ber-PIN) ----------

export async function fetchTransactions(eventId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("event_id", eventId)
    .order("tanggal", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTransaction(input: {
  event_id: string;
  pin: string;
  jenis: Jenis;
  kategori: string;
  nominal: number;
  tanggal: string;
  keterangan?: string | null;
  foto_url?: string | null;
}): Promise<Transaction> {
  const { data, error } = await supabase
    .rpc("add_transaction_with_pin", {
      p_event_id: input.event_id,
      p_pin: input.pin,
      p_jenis: input.jenis,
      p_kategori: input.kategori,
      p_nominal: input.nominal,
      p_tanggal: input.tanggal,
      p_keterangan: input.keterangan || null,
      p_foto_url: input.foto_url || null,
    })
    .single();
  if (error) throw error;
  return data as unknown as Transaction;
}

export async function updateTransaction(
  id: string,
  pin: string,
  input: {
    jenis: Jenis;
    kategori: string;
    nominal: number;
    tanggal: string;
    keterangan?: string | null;
    foto_url?: string | null;
  }
): Promise<Transaction> {
  const { data, error } = await supabase
    .rpc("update_transaction_with_pin", {
      p_transaction_id: id,
      p_pin: pin,
      p_jenis: input.jenis,
      p_kategori: input.kategori,
      p_nominal: input.nominal,
      p_tanggal: input.tanggal,
      p_keterangan: input.keterangan || null,
      p_foto_url: input.foto_url || null,
    })
    .single();
  if (error) throw error;
  return data as unknown as Transaction;
}

export async function deleteTransaction(id: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("delete_transaction_with_pin", {
    p_transaction_id: id,
    p_pin: pin,
  });
  if (error) throw error;
  return Boolean(data);
}
