import { supabase } from "./supabase";
import type { Category, Event, EventStatus, Jenis, Transaction } from "./types";

// ---------- Events ----------

export async function fetchEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchEvent(id: string): Promise<Event> {
  const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createEvent(input: {
  nama_acara: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  deskripsi?: string | null;
}): Promise<Event> {
  const { data, error } = await supabase
    .from("events")
    .insert({
      nama_acara: input.nama_acara,
      tanggal_mulai: input.tanggal_mulai,
      tanggal_selesai: input.tanggal_selesai,
      deskripsi: input.deskripsi || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEventStatus(id: string, status: EventStatus): Promise<void> {
  const { error } = await supabase.from("events").update({ status }).eq("id", id);
  if (error) throw error;
}

// ---------- Categories ----------

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("nama_kategori", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(nama_kategori: string, jenis: Jenis): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .insert({ nama_kategori: nama_kategori.trim(), jenis, is_default: false })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------- Transactions ----------

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
  jenis: Jenis;
  kategori: string;
  nominal: number;
  tanggal: string;
  keterangan?: string | null;
}): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...input, keterangan: input.keterangan || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTransaction(
  id: string,
  input: Partial<{
    jenis: Jenis;
    kategori: string;
    nominal: number;
    tanggal: string;
    keterangan: string | null;
  }>
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}
