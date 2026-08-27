-- =========================================================
-- Migrasi v4: edit detail acara (nama, tanggal, deskripsi)
--
-- Jalankan file ini SEKALI di Supabase Dashboard -> SQL Editor, kalau
-- project kamu sudah pernah menjalankan schema.sql atau migrasi
-- sebelumnya. Aman dijalankan berkali-kali.
-- =========================================================

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

-- Selesai. Fitur "Edit acara" di halaman detail sekarang bisa dipakai
-- (muncul di mode bendahara, di sebelah nama acara).
