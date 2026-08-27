# Buku Acara — Aplikasi LPJ Keuangan Acara

Aplikasi pencatatan & pelaporan keuangan acara. Input transaksi real-time dari HP,
generate laporan LPJ (PDF) otomatis, dan riwayat semua acara tersimpan rapi.

Dibangun sesuai `PRD-Aplikasi-LPJ-Acara.md` dengan stack: **Next.js (App Router) +
Supabase (Postgres) + Tailwind CSS + @react-pdf/renderer**, siap deploy ke **Vercel**.

## 1. Siapkan Supabase

**Project baru (belum pernah setup sebelumnya):**

1. Buat project baru di [supabase.com](https://supabase.com) (gratis).
2. Buka **SQL Editor** → **New query**, tempel seluruh isi file `supabase/schema.sql`
   dari project ini, lalu **Run**. Ini membuat tabel `events`, `categories`,
   `transactions`, mengisi kategori default, dan mengatur akses termasuk
   perlindungan PIN per acara (lihat bagian 5 di bawah).
3. Buka **Project Settings → API**, salin:
   - `Project URL` → jadi `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → jadi `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Sudah pernah setup dengan versi lama (tanpa PIN)?** Jangan jalankan
`schema.sql` lagi — cukup jalankan **`supabase/migration_v2_pin_dan_hapus.sql`**
sekali di SQL Editor. Ini menambahkan fitur PIN & hapus acara tanpa
mengubah data yang sudah ada. Acara-acara lama otomatis tetap terbuka
(tanpa PIN) sampai kamu klik "Atur PIN sekarang" di halaman acara itu.

**Sudah pakai versi PIN tapi belum ada foto struk?** Jalankan juga
**`supabase/migration_v3_foto_struk.sql`** sekali di SQL Editor. Ini
menambah kolom `foto_url` dan membuat bucket Storage `bukti-transaksi`
untuk menyimpan foto struk/bukti transaksi.

**Sudah pakai versi foto struk tapi belum bisa edit detail acara?**
Jalankan juga **`supabase/migration_v4_edit_acara.sql`** sekali di SQL
Editor. Ini menambahkan fungsi untuk mengubah nama/tanggal/deskripsi
acara setelah dibuat.

## 2. Konfigurasi lokal

```bash
npm install
cp .env.local.example .env.local
# isi .env.local dengan URL & anon key dari langkah 1
npm run dev
```

Buka `http://localhost:3000`.

## 3. Deploy ke Vercel

1. Push folder ini ke repo GitHub baru.
2. Import repo tersebut di [vercel.com](https://vercel.com) → **New Project**.
3. Di **Environment Variables**, tambahkan `NEXT_PUBLIC_SUPABASE_URL` dan
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (nilai yang sama seperti `.env.local`).
4. Deploy. Vercel otomatis build & memberi URL publik.
5. Setiap `git push` ke branch utama akan auto-deploy ulang.

## 4. Jaga Supabase tetap aktif (free tier)

Project Supabase gratis akan di-pause otomatis jika tidak ada aktivitas selama
7 hari. Tambahkan GitHub Actions berikut agar tetap "hidup" (opsional tapi
direkomendasikan jika acara jarang dipakai):

Buat file `.github/workflows/keep-alive.yml` di repo:

```yaml
name: Supabase Keep Alive
on:
  schedule:
    - cron: "0 3 * * 1" # tiap Senin jam 03:00 UTC
  workflow_dispatch: {}
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase REST endpoint
        run: |
          curl -s -o /dev/null -w "%{http_code}" \
            "${{ secrets.SUPABASE_URL }}/rest/v1/events?select=id&limit=1" \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}"
```

Tambahkan `SUPABASE_URL` dan `SUPABASE_ANON_KEY` sebagai **Repository Secrets**
di GitHub (Settings → Secrets and variables → Actions).

## 5. PIN per acara & mode hanya-lihat

Setiap acara punya PIN sendiri (6 digit), diatur saat acara dibuat:

- **Siapa pun dengan link bisa MELIHAT** acara: ringkasan saldo dan riwayat
  transaksi (mode "hanya lihat" / draft laporan) — tanpa perlu PIN.
- **Menambah, mengubah, atau menghapus transaksi** — juga mengubah status
  acara dan menghapus acara — **wajib tahu PIN acara itu**. Klik "Masuk
  sebagai bendahara" di halaman acara, masukkan PIN, dan mode edit terbuka
  di browser itu.
- Setelah PIN benar dimasukkan sekali, browser itu **mengingat PIN-nya**
  (tersimpan di localStorage) supaya bendahara tidak perlu input ulang
  setiap kali mau catat transaksi. Klik "Kunci lagi" untuk keluar dari mode
  edit di device itu.
- PIN di-hash (bcrypt) di database dan **tidak pernah dikirim ke browser**
  dalam bentuk apa pun — pengecekan PIN terjadi lewat fungsi database
  (`verify_event_pin`, dst.), bukan dibandingkan di JavaScript. Semua
  perintah tulis (insert/update/delete) ke tabel `events`/`transactions`/
  `categories` dicabut haknya dari peran publik dan hanya bisa lewat
  fungsi-fungsi ber-PIN ini — jadi PIN benar-benar menentukan siapa yang
  bisa menulis, bukan sekadar menyembunyikan tombol di UI.

**Batasan yang perlu disadari:** ini level proteksi yang wajar untuk
kebutuhan "beda bendahara per acara, tanpa login ribet" — bukan pengganti
sistem otentikasi penuh. PIN tersimpan sebagai teks biasa di localStorage
browser bendahara (mirip PIN kasir sederhana); siapa pun yang punya akses
fisik ke device & browser yang sama saat sudah dalam mode edit bisa
mengubah data. Kalau ke depannya butuh proteksi setara akun/role
sungguhan (multi-user dengan hak berbeda, approval berjenjang), itu perlu
Supabase Auth — sudah masuk daftar "Out of Scope" versi awal di PRD.

Karena tetap tanpa login, **jangan sebarkan URL aplikasi secara publik** —
bagikan hanya ke panitia/anggota terkait.

## 6. Menghapus acara (hemat kuota database gratis)

Kalau LPJ suatu acara sudah di-download/print dan tidak dibutuhkan lagi,
bendahara (setelah masuk mode edit) bisa klik **"Hapus acara ini"** di
bagian "Zona berbahaya" pada halaman acara tersebut. Ini menghapus acara
beserta seluruh transaksinya secara permanen dari Supabase — cocok
dipakai berkala supaya database gratis (500 MB di free tier) tidak penuh
oleh acara-acara lama yang sudah tidak relevan. Acara yang masih ingin
disimpan sebagai arsip cukup dibiarkan saja, tidak perlu dihapus.

## 7. Foto struk & tanda tangan di laporan

- Saat menambah/edit transaksi (mode bendahara), ada field opsional
  **"Foto struk"** — bisa ambil foto langsung dari kamera HP atau upload
  dari galeri. Fotonya tersimpan di Supabase Storage (bucket
  `bukti-transaksi`, maksimal 5MB per foto) dan ditandai dengan ikon
  kecil di baris transaksi (bisa diklik untuk lihat foto penuh).
- Laporan (PDF & halaman preview) otomatis menyertakan bagian
  **"Lampiran Bukti Transaksi"** berisi semua foto yang diunggah, kalau
  ada. Kalau tidak ada foto sama sekali, bagian ini otomatis disembunyikan.
- Laporan juga sekarang punya **blok tanda tangan** di bagian akhir
  (Bendahara Acara & Mengetahui Ketua Panitia) yang bisa diisi tangan
  setelah diprint — supaya dokumennya terasa resmi dan siap diserahkan.

## 8. Menghapus transaksi (dengan Urungkan)

Klik ikon hapus di suatu transaksi langsung menghapusnya dari tampilan
dan memunculkan notifikasi kecil di bawah layar selama 5 detik dengan
tombol **"Urungkan"**. Kalau tidak diklik, baru transaksi itu benar-benar
terhapus dari database setelah 5 detik — jadi kalau salah pencet, masih
ada jeda buat membatalkan tanpa perlu dialog konfirmasi yang mengganggu.
(Menghapus acara tetap pakai dialog konfirmasi biasa karena aksinya jauh
lebih besar dan permanen.)

## 9. Edit detail acara & auto-lock PIN

- Di mode bendahara (sudah unlock), ada ikon pensil kecil di sebelah
  nama acara untuk mengubah **nama, tanggal, dan deskripsi** acara kalau
  ada salah ketik atau perlu diperbarui. Tidak perlu hapus-buat-ulang lagi.
- Mode bendahara sekarang **otomatis terkunci setelah 30 menit tanpa
  aktivitas sama sekali** di halaman itu (tidak ada klik/ketik/scroll).
  Ini supaya kalau HP dipinjam orang lain atau lupa dikunci di device
  bersama (mis. tablet sekretariat), aksesnya tidak terbuka selamanya.
  Begitu ada aktivitas lagi (klik, ketik, scroll), timer-nya di-reset;
  PIN yang tersimpan di localStorage juga dianggap "basi" dan diminta
  ulang kalau terakhir aktif sudah lebih dari 30 menit yang lalu, bahkan
  setelah reload halaman.

## 10. Struktur proyek

```
app/
  page.tsx                     Daftar Acara (home)
  acara/[id]/page.tsx          Detail acara: input transaksi, ringkasan, riwayat, PIN
  acara/[id]/laporan/page.tsx  Laporan LPJ: preview, print, download PDF (selalu terbuka)
  layout.tsx, globals.css      Layout & tema global
components/                    Komponen UI (modal, kartu, form, dokumen PDF, PIN, toast)
lib/                           Tipe data, koneksi Supabase, query, format, laporan, pin-storage, storage
supabase/schema.sql                       Skema database siap-jalan (project baru)
supabase/migration_v2_pin_dan_hapus.sql   Migrasi PIN & hapus acara (project lama)
supabase/migration_v3_foto_struk.sql      Migrasi foto struk per transaksi (project lama)
supabase/migration_v4_edit_acara.sql      Migrasi fungsi edit detail acara (project lama)
```

## 11. Tahapan sesuai PRD

- ✅ Tahap 1 — Dasar: buat acara, input transaksi, ringkasan real-time
- ✅ Tahap 2 — Laporan: generate & download PDF, print langsung
- ✅ Tahap 3 — Penyempurnaan: riwayat acara, kategori custom, mobile-first
- ⬜ Tahap 4 (lanjutan, di luar cakupan MVP): multi-user, reminder, export Excel
