-- =========================================================
-- LPJ Acara — Skema Database Supabase (PostgreSQL)
-- Jalankan seluruh file ini di: Supabase Dashboard -> SQL Editor -> New query
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- Tabel: events (acara)
-- ---------------------------------------------------------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  nama_acara text not null,
  tanggal_mulai date not null,
  tanggal_selesai date not null,
  deskripsi text,
  status text not null default 'berlangsung' check (status in ('berlangsung', 'selesai')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Tabel: categories (kategori transaksi, termasuk custom)
-- ---------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  nama_kategori text not null,
  jenis text not null check (jenis in ('pemasukan', 'pengeluaran')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (nama_kategori, jenis)
);

-- ---------------------------------------------------------
-- Tabel: transactions (transaksi per acara)
-- ---------------------------------------------------------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  jenis text not null check (jenis in ('pemasukan', 'pengeluaran')),
  kategori text not null,
  nominal numeric(14, 2) not null check (nominal >= 0),
  tanggal date not null,
  keterangan text,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_event_id on transactions (event_id);
create index if not exists idx_transactions_tanggal on transactions (tanggal);

-- ---------------------------------------------------------
-- Kategori default (sesuai PRD)
-- ---------------------------------------------------------
insert into categories (nama_kategori, jenis, is_default) values
  ('Proposal', 'pemasukan', true),
  ('Sumbangan Masyarakat', 'pemasukan', true),
  ('Donatur', 'pemasukan', true),
  ('Transport', 'pengeluaran', true),
  ('Konsumsi', 'pengeluaran', true),
  ('Logistik', 'pengeluaran', true),
  ('Lain-lain', 'pengeluaran', true)
on conflict (nama_kategori, jenis) do nothing;

-- ---------------------------------------------------------
-- Row Level Security
-- Aplikasi ini didesain TANPA login (akses cepat dari HP untuk
-- panitia kecil/internal). Karena itu akses publik (anon key)
-- dibuka penuh pada tabel-tabel berikut.
--
-- PENTING (keamanan): siapa pun yang memegang URL Supabase +
-- anon key project ini bisa membaca/mengubah semua data di atas.
-- Cocok untuk pemakaian internal/tertutup. Jika butuh akses
-- privat, tambahkan Supabase Auth dan ganti policy di bawah agar
-- mensyaratkan auth.uid().
-- ---------------------------------------------------------
alter table events enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;

drop policy if exists "public_all_events" on events;
create policy "public_all_events" on events
  for all using (true) with check (true);

drop policy if exists "public_all_categories" on categories;
create policy "public_all_categories" on categories
  for all using (true) with check (true);

drop policy if exists "public_all_transactions" on transactions;
create policy "public_all_transactions" on transactions
  for all using (true) with check (true);
