# Buku Acara — Aplikasi LPJ Keuangan Acara

Aplikasi pencatatan & pelaporan keuangan acara. Input transaksi real-time dari HP,
generate laporan LPJ (PDF) otomatis, dan riwayat semua acara tersimpan rapi.

Dibangun sesuai `PRD-Aplikasi-LPJ-Acara.md` dengan stack: **Next.js (App Router) +
Supabase (Postgres) + Tailwind CSS + @react-pdf/renderer**, siap deploy ke **Vercel**.

## 1. Siapkan Supabase

1. Buat project baru di [supabase.com](https://supabase.com) (gratis).
2. Buka **SQL Editor** → **New query**, tempel seluruh isi file `supabase/schema.sql`
   dari project ini, lalu **Run**. Ini akan membuat tabel `events`, `categories`,
   `transactions`, mengisi kategori default, dan mengatur akses (lihat catatan
   keamanan di bawah).
3. Buka **Project Settings → API**, salin:
   - `Project URL` → jadi `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → jadi `NEXT_PUBLIC_SUPABASE_ANON_KEY`

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

## 5. Catatan keamanan (penting)

Sesuai kebutuhan di PRD ("tanpa proses login yang ribet"), aplikasi ini **tidak
memakai login** — siapa pun yang membuka link bisa langsung mencatat transaksi.
Konsekuensinya, Row Level Security di Supabase dibuka publik lewat *anon key*
(lihat `supabase/schema.sql`). Ini cocok untuk pemakaian internal/tertutup
(link hanya dibagikan ke panitia). **Jangan sebarkan URL aplikasi secara
publik** kalau tidak ingin orang asing bisa mengubah data. Jika ke depannya
butuh proteksi lebih (multi-user dengan role, approval berjenjang), tambahkan
Supabase Auth — ini memang sudah masuk daftar "Out of Scope" versi awal di PRD.

## 6. Struktur proyek

```
app/
  page.tsx                     Daftar Acara (home)
  acara/[id]/page.tsx          Detail acara: input transaksi, ringkasan, riwayat
  acara/[id]/laporan/page.tsx  Laporan LPJ: preview, print, download PDF
  layout.tsx, globals.css      Layout & tema global
components/                    Komponen UI (modal, kartu, form, dokumen PDF)
lib/                           Tipe data, koneksi Supabase, query, format, laporan
supabase/schema.sql            Skema database siap-jalan
```

## 7. Tahapan sesuai PRD

- ✅ Tahap 1 — Dasar: buat acara, input transaksi, ringkasan real-time
- ✅ Tahap 2 — Laporan: generate & download PDF, print langsung
- ✅ Tahap 3 — Penyempurnaan: riwayat acara, kategori custom, mobile-first
- ⬜ Tahap 4 (lanjutan, di luar cakupan MVP): multi-user, reminder, export Excel
