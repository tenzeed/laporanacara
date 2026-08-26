-- =========================================================
-- Migrasi v3: foto struk per transaksi
--
-- Jalankan file ini SEKALI di Supabase Dashboard -> SQL Editor, kalau
-- project kamu sudah pernah menjalankan schema.sql atau
-- migration_v2_pin_dan_hapus.sql sebelumnya. Aman dijalankan berkali-kali.
-- =========================================================

alter table transactions add column if not exists foto_url text;

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
-- Ganti fungsi transaksi supaya mendukung foto_url.
-- DROP dulu karena bentuk kolom hasil (return table) berubah —
-- CREATE OR REPLACE tidak bisa mengubah return type fungsi yang sudah ada.
-- ---------------------------------------------------------
drop function if exists add_transaction_with_pin(uuid, text, text, text, numeric, date, text);
drop function if exists update_transaction_with_pin(uuid, text, text, text, numeric, date, text);

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

-- Selesai. Transaksi lama otomatis foto_url = null (tidak ada foto),
-- tetap tampil normal tanpa foto di daftar maupun laporan.
