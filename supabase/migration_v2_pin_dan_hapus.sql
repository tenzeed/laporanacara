-- =========================================================
-- Migrasi v2: PIN per acara + hapus acara
--
-- Jalankan file ini SEKALI di Supabase Dashboard -> SQL Editor, HANYA
-- kalau project kamu sudah pernah menjalankan schema.sql versi lama
-- (tanpa PIN). Aman dijalankan berkali-kali (idempotent).
--
-- Setelah ini jalan, update juga kode aplikasi ke versi terbaru
-- (lib/queries.ts dkk) — keduanya harus sinkron.
-- =========================================================

create extension if not exists "pgcrypto";

-- Tambah kolom PIN ke tabel events yang sudah ada
alter table events add column if not exists pin_hash text;
alter table events add column if not exists has_pin boolean not null default false;

-- ---------------------------------------------------------
-- Perketat akses: hanya baca yang dibuka luas, semua tulis lewat fungsi
-- ---------------------------------------------------------
drop policy if exists "public_all_events" on events;
drop policy if exists "public_read_events" on events;
create policy "public_read_events" on events for select using (true);

drop policy if exists "public_all_categories" on categories;
drop policy if exists "public_read_categories" on categories;
create policy "public_read_categories" on categories for select using (true);

drop policy if exists "public_all_transactions" on transactions;
drop policy if exists "public_read_transactions" on transactions;
create policy "public_read_transactions" on transactions for select using (true);

revoke insert, update, delete on events from anon, authenticated;
revoke insert, update, delete on categories from anon, authenticated;
revoke insert, update, delete on transactions from anon, authenticated;

revoke select on events from anon, authenticated;
grant select (id, nama_acara, tanggal_mulai, tanggal_selesai, deskripsi, status, has_pin, created_at)
  on events to anon, authenticated;

-- ---------------------------------------------------------
-- Fungsi-fungsi ber-PIN (sama seperti di schema.sql)
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

create or replace function add_transaction_with_pin(
  p_event_id uuid, p_pin text, p_jenis text, p_kategori text,
  p_nominal numeric, p_tanggal date, p_keterangan text
) returns table (
  id uuid, event_id uuid, jenis text, kategori text, nominal numeric,
  tanggal date, keterangan text, created_at timestamptz
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
  insert into transactions (event_id, jenis, kategori, nominal, tanggal, keterangan)
  values (p_event_id, p_jenis, p_kategori, p_nominal, p_tanggal, p_keterangan)
  returning transactions.id into v_id;

  return query
    select t.id, t.event_id, t.jenis, t.kategori, t.nominal, t.tanggal, t.keterangan, t.created_at
    from transactions t where t.id = v_id;
end;
$$;
grant execute on function add_transaction_with_pin(uuid, text, text, text, numeric, date, text) to anon, authenticated;

create or replace function update_transaction_with_pin(
  p_transaction_id uuid, p_pin text, p_jenis text, p_kategori text,
  p_nominal numeric, p_tanggal date, p_keterangan text
) returns table (
  id uuid, event_id uuid, jenis text, kategori text, nominal numeric,
  tanggal date, keterangan text, created_at timestamptz
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
        tanggal = p_tanggal, keterangan = p_keterangan
    where id = p_transaction_id;

  return query
    select t.id, t.event_id, t.jenis, t.kategori, t.nominal, t.tanggal, t.keterangan, t.created_at
    from transactions t where t.id = p_transaction_id;
end;
$$;
grant execute on function update_transaction_with_pin(uuid, text, text, text, numeric, date, text) to anon, authenticated;

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

-- Selesai. Acara yang sudah ada sebelumnya otomatis has_pin = false
-- (tetap terbuka seperti biasa) sampai kamu klik "Atur PIN sekarang"
-- di halaman acara tersebut.
