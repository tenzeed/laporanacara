-- =========================================================
-- LPJ Acara — Skema Database Supabase (PostgreSQL)
-- Jalankan seluruh file ini di: Supabase Dashboard -> SQL Editor -> New query
--
-- Kalau project Supabase kamu SUDAH pernah menjalankan versi schema
-- sebelumnya (tanpa PIN), JANGAN jalankan file ini lagi — cukup jalankan
-- supabase/migration_v2_pin_dan_hapus.sql sekali saja.
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- Tabel: events (acara)
-- pin_hash disimpan ter-enkripsi (bcrypt) dan TIDAK PERNAH dikirim ke
-- browser — semua pengecekan PIN terjadi di dalam database lewat fungsi
-- di bawah. has_pin adalah kolom biasa supaya aplikasi tahu apakah suatu
-- acara sudah dilindungi PIN atau belum, tanpa perlu membaca pin_hash.
-- ---------------------------------------------------------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  nama_acara text not null,
  tanggal_mulai date not null,
  tanggal_selesai date not null,
  deskripsi text,
  status text not null default 'berlangsung' check (status in ('berlangsung', 'selesai')),
  pin_hash text,
  has_pin boolean not null default false,
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
  foto_url text,
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
--
-- Model akses aplikasi ini:
--  - SEMUA ORANG dengan link bisa MELIHAT acara, ringkasan, dan riwayat
--    transaksi (mode "hanya lihat" / draft laporan) — tanpa PIN.
--  - MENGUBAH data (tambah/edit/hapus transaksi, ubah status, hapus
--    acara, tambah kategori) HARUS lewat fungsi ber-PIN di bawah.
--    Karena itu hak INSERT/UPDATE/DELETE langsung ke tabel dicabut dari
--    anon/authenticated — satu-satunya jalan menulis data adalah lewat
--    fungsi-fungsi yang memverifikasi PIN terlebih dahulu.
--  - Kolom pin_hash disembunyikan total lewat pembatasan hak akses per
--    kolom, supaya tidak bisa "diintip" lewat network tab browser.
-- ---------------------------------------------------------
alter table events enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;

drop policy if exists "public_all_events" on events;
create policy "public_read_events" on events for select using (true);

drop policy if exists "public_all_categories" on categories;
create policy "public_read_categories" on categories for select using (true);

drop policy if exists "public_all_transactions" on transactions;
create policy "public_read_transactions" on transactions for select using (true);

-- Cabut semua hak tulis langsung; hanya baca yang dibuka luas.
revoke insert, update, delete on events from anon, authenticated;
revoke insert, update, delete on categories from anon, authenticated;
revoke insert, update, delete on transactions from anon, authenticated;

-- Sembunyikan pin_hash: anon/authenticated hanya boleh SELECT kolom berikut.
revoke select on events from anon, authenticated;
grant select (id, nama_acara, tanggal_mulai, tanggal_selesai, deskripsi, status, has_pin, created_at)
  on events to anon, authenticated;

-- ---------------------------------------------------------
-- Fungsi: verifikasi PIN suatu acara
-- Acara tanpa PIN (has_pin = false, mis. dibuat sebelum fitur ini ada)
-- dianggap terbuka: verifikasi otomatis lolos.
-- ---------------------------------------------------------
create or replace function verify_event_pin(p_event_id uuid, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_has_pin boolean;
begin
  select pin_hash, has_pin into v_hash, v_has_pin from events where id = p_event_id;
  if v_has_pin is not true then
    return true;
  end if;
  if p_pin is null or p_pin = '' then
    return false;
  end if;
  return v_hash = crypt(p_pin, v_hash);
end;
$$;
grant execute on function verify_event_pin(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------
-- Fungsi: buat acara baru dengan PIN
-- ---------------------------------------------------------
create or replace function create_event_with_pin(
  p_nama_acara text,
  p_tanggal_mulai date,
  p_tanggal_selesai date,
  p_deskripsi text,
  p_pin text
) returns table (
  id uuid, nama_acara text, tanggal_mulai date, tanggal_selesai date,
  deskripsi text, status text, has_pin boolean, created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_has_pin boolean := p_pin is not null and p_pin <> '';
begin
  insert into events (nama_acara, tanggal_mulai, tanggal_selesai, deskripsi, pin_hash, has_pin, status)
  values (
    p_nama_acara, p_tanggal_mulai, p_tanggal_selesai, p_deskripsi,
    case when v_has_pin then crypt(p_pin, gen_salt('bf')) else null end,
    v_has_pin,
    'berlangsung'
  )
  returning events.id into v_id;

  return query
    select e.id, e.nama_acara, e.tanggal_mulai, e.tanggal_selesai, e.deskripsi, e.status, e.has_pin, e.created_at
    from events e where e.id = v_id;
end;
$$;
grant execute on function create_event_with_pin(text, date, date, text, text) to anon, authenticated;

-- ---------------------------------------------------------
-- Fungsi: pasang PIN untuk acara lama yang belum punya PIN
-- (menolak jika acara sudah punya PIN — mencegah pengambilalihan tanpa
-- tahu PIN lama, karena MVP ini belum punya fitur ganti/reset PIN).
-- ---------------------------------------------------------
create or replace function set_event_pin_if_missing(p_event_id uuid, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_has_pin boolean;
begin
  select has_pin into v_has_pin from events where id = p_event_id;
  if v_has_pin is true then
    return false;
  end if;
  if p_pin is null or p_pin = '' then
    return false;
  end if;
  update events set pin_hash = crypt(p_pin, gen_salt('bf')), has_pin = true where id = p_event_id;
  return true;
end;
$$;
grant execute on function set_event_pin_if_missing(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------
-- Fungsi: ubah status acara (berlangsung/selesai) dengan PIN
-- ---------------------------------------------------------
create or replace function update_event_status_with_pin(p_event_id uuid, p_pin text, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('berlangsung', 'selesai') then
    return false;
  end if;
  if not verify_event_pin(p_event_id, p_pin) then
    return false;
  end if;
  update events set status = p_status where id = p_event_id;
  return true;
end;
$$;
grant execute on function update_event_status_with_pin(uuid, text, text) to anon, authenticated;

-- ---------------------------------------------------------
-- Fungsi: ubah detail acara — nama, tanggal, deskripsi (dengan PIN)
-- ---------------------------------------------------------
create or replace function update_event_details_with_pin(
  p_event_id uuid, p_pin text, p_nama_acara text,
  p_tanggal_mulai date, p_tanggal_selesai date, p_deskripsi text
) returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not verify_event_pin(p_event_id, p_pin) then
    return false;
  end if;
  update events
    set nama_acara = p_nama_acara,
        tanggal_mulai = p_tanggal_mulai,
        tanggal_selesai = p_tanggal_selesai,
        deskripsi = p_deskripsi
    where id = p_event_id;
  return true;
end;
$$;
grant execute on function update_event_details_with_pin(uuid, text, text, date, date, text) to anon, authenticated;

-- ---------------------------------------------------------
-- Fungsi: hapus acara beserta seluruh transaksinya (dengan PIN)
-- Dipakai untuk membersihkan acara lama yang LPJ-nya sudah tidak
-- dibutuhkan lagi, supaya kuota database gratis tidak penuh.
-- ---------------------------------------------------------
create or replace function delete_event_with_pin(p_event_id uuid, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not verify_event_pin(p_event_id, p_pin) then
    return false;
  end if;
  delete from events where id = p_event_id;
  return true;
end;
$$;
grant execute on function delete_event_with_pin(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------
-- Storage bucket untuk foto struk/bukti transaksi
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bukti-transaksi', 'bukti-transaksi', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public_upload_bukti_transaksi" on storage.objects;
create policy "public_upload_bukti_transaksi" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'bukti-transaksi');

drop policy if exists "public_read_bukti_transaksi" on storage.objects;
create policy "public_read_bukti_transaksi" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'bukti-transaksi');

drop policy if exists "public_delete_bukti_transaksi" on storage.objects;
create policy "public_delete_bukti_transaksi" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'bukti-transaksi');

-- ---------------------------------------------------------
-- Fungsi: tambah transaksi (dengan PIN, foto struk opsional)
-- ---------------------------------------------------------
create or replace function add_transaction_with_pin(
  p_event_id uuid, p_pin text, p_jenis text, p_kategori text,
  p_nominal numeric, p_tanggal date, p_keterangan text,
  p_foto_url text default null
) returns table (
  id uuid, event_id uuid, jenis text, kategori text, nominal numeric,
  tanggal date, keterangan text, foto_url text, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not verify_event_pin(p_event_id, p_pin) then
    raise exception 'PIN salah';
  end if;
  insert into transactions (event_id, jenis, kategori, nominal, tanggal, keterangan, foto_url)
  values (p_event_id, p_jenis, p_kategori, p_nominal, p_tanggal, p_keterangan, p_foto_url)
  returning transactions.id into v_id;

  return query
    select t.id, t.event_id, t.jenis, t.kategori, t.nominal, t.tanggal, t.keterangan, t.foto_url, t.created_at
    from transactions t where t.id = v_id;
end;
$$;
grant execute on function add_transaction_with_pin(uuid, text, text, text, numeric, date, text, text) to anon, authenticated;

-- ---------------------------------------------------------
-- Fungsi: ubah transaksi (dengan PIN, foto struk opsional)
-- ---------------------------------------------------------
create or replace function update_transaction_with_pin(
  p_transaction_id uuid, p_pin text, p_jenis text, p_kategori text,
  p_nominal numeric, p_tanggal date, p_keterangan text,
  p_foto_url text default null
) returns table (
  id uuid, event_id uuid, jenis text, kategori text, nominal numeric,
  tanggal date, keterangan text, foto_url text, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  select event_id into v_event_id from transactions where id = p_transaction_id;
  if v_event_id is null then
    raise exception 'Transaksi tidak ditemukan';
  end if;
  if not verify_event_pin(v_event_id, p_pin) then
    raise exception 'PIN salah';
  end if;
  update transactions
    set jenis = p_jenis, kategori = p_kategori, nominal = p_nominal,
        tanggal = p_tanggal, keterangan = p_keterangan, foto_url = p_foto_url
    where id = p_transaction_id;

  return query
    select t.id, t.event_id, t.jenis, t.kategori, t.nominal, t.tanggal, t.keterangan, t.foto_url, t.created_at
    from transactions t where t.id = p_transaction_id;
end;
$$;
grant execute on function update_transaction_with_pin(uuid, text, text, text, numeric, date, text, text) to anon, authenticated;

-- ---------------------------------------------------------
-- Fungsi: hapus transaksi (dengan PIN)
-- ---------------------------------------------------------
create or replace function delete_transaction_with_pin(p_transaction_id uuid, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  select event_id into v_event_id from transactions where id = p_transaction_id;
  if v_event_id is null then
    return false;
  end if;
  if not verify_event_pin(v_event_id, p_pin) then
    return false;
  end if;
  delete from transactions where id = p_transaction_id;
  return true;
end;
$$;
grant execute on function delete_transaction_with_pin(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------
-- Fungsi: tambah kategori custom (dengan PIN, terikat ke satu acara
-- sebagai bukti otorisasi — kategorinya sendiri tetap dipakai bersama)
-- ---------------------------------------------------------
create or replace function add_category_with_pin(
  p_event_id uuid, p_pin text, p_nama_kategori text, p_jenis text
) returns table (id uuid, nama_kategori text, jenis text, is_default boolean, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not verify_event_pin(p_event_id, p_pin) then
    raise exception 'PIN salah';
  end if;
  insert into categories (nama_kategori, jenis, is_default)
  values (p_nama_kategori, p_jenis, false)
  on conflict (nama_kategori, jenis) do update set nama_kategori = excluded.nama_kategori
  returning categories.id into v_id;

  return query
    select c.id, c.nama_kategori, c.jenis, c.is_default, c.created_at
    from categories c where c.id = v_id;
end;
$$;
grant execute on function add_category_with_pin(uuid, text, text, text) to anon, authenticated;
