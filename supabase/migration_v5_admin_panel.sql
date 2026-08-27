-- =========================================================
-- Migrasi v5: Panel Admin (PIN master pengelola utama)
--
-- Jalankan file ini SEKALI di Supabase Dashboard -> SQL Editor, kalau
-- project kamu sudah pernah menjalankan migrasi sebelumnya. Aman
-- dijalankan berkali-kali.
--
-- SETELAH menjalankan file ini, jalankan SEKALI LAGI secara terpisah
-- (ganti teks contoh dengan PIN rahasiamu sendiri, minimal 8 karakter,
-- boleh campur huruf & angka):
--
--   insert into app_admin (id, pin_hash)
--   values (1, crypt('GANTI-DENGAN-PIN-RAHASIA-KAMU', gen_salt('bf')))
--   on conflict (id) do nothing;
--
-- PIN ini adalah kunci induk seluruh aplikasi — beda dari PIN acara
-- biasa, dan hanya kamu sebagai pengelola utama yang boleh tahu.
-- Simpan baik-baik (mis. di password manager), karena kalau lupa,
-- satu-satunya cara memulihkan adalah lewat SQL Editor lagi (UPDATE
-- manual ke tabel app_admin), bukan lewat aplikasi.
-- =========================================================

create extension if not exists "pgcrypto";

create table if not exists app_admin (
  id smallint primary key default 1,
  pin_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now(),
  constraint app_admin_singleton check (id = 1)
);

alter table app_admin enable row level security;
revoke all on app_admin from anon, authenticated;

create or replace function verify_admin_pin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_failed integer;
  v_locked_until timestamptz;
  v_ok boolean;
begin
  select pin_hash, failed_attempts, locked_until into v_hash, v_failed, v_locked_until
  from app_admin where id = 1;

  if v_hash is null then
    return false;
  end if;

  if v_locked_until is not null and v_locked_until > now() then
    return false;
  end if;

  v_ok := (v_hash = crypt(p_pin, v_hash));

  if v_ok then
    update app_admin set failed_attempts = 0, locked_until = null where id = 1;
  else
    update app_admin
      set failed_attempts = failed_attempts + 1,
          locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else locked_until end
      where id = 1;
  end if;

  return v_ok;
end;
$$;
grant execute on function verify_admin_pin(text) to anon, authenticated;

create or replace function admin_reset_event_pin(p_admin_pin text, p_event_id uuid, p_new_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not verify_admin_pin(p_admin_pin) then
    return false;
  end if;
  if p_new_pin is null or length(p_new_pin) < 6 then
    return false;
  end if;
  update events
    set pin_hash = crypt(p_new_pin, gen_salt('bf')),
        has_pin = true
    where id = p_event_id;
  return true;
end;
$$;
grant execute on function admin_reset_event_pin(text, uuid, text) to anon, authenticated;

create or replace function admin_delete_event(p_admin_pin text, p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not verify_admin_pin(p_admin_pin) then
    return false;
  end if;
  delete from events where id = p_event_id;
  return true;
end;
$$;
grant execute on function admin_delete_event(text, uuid) to anon, authenticated;

create or replace function admin_change_pin(p_current_admin_pin text, p_new_admin_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not verify_admin_pin(p_current_admin_pin) then
    return false;
  end if;
  if p_new_admin_pin is null or length(p_new_admin_pin) < 8 then
    return false;
  end if;
  update app_admin set pin_hash = crypt(p_new_admin_pin, gen_salt('bf')), updated_at = now() where id = 1;
  return true;
end;
$$;
grant execute on function admin_change_pin(text, text) to anon, authenticated;

-- Selesai. Setelah menjalankan insert app_admin di atas, buka
-- https://domain-kamu.vercel.app/admin untuk masuk ke panel admin.
