# Portfolio

Web portofolio: Next.js (App Router, JavaScript), Tailwind CSS v4, Supabase.
Tema gelap dengan satu aksen biru. Ada blog, project, dan album foto yang
semuanya bisa dikelola dari panel `/admin` tanpa menyentuh kode.

## Fitur

- **Blog dan Project**: ditulis dengan editor bergaya Notion (WYSIWYG). Tulisan
  tersimpan sebagai **Markdown**, jadi tetap portabel.
  - Ketik `/` untuk memilih blok (judul, daftar, kutipan, kode, gambar).
  - Shortcut Markdown tetap jalan: `## ` jadi judul, `- ` jadi daftar, ``` jadi blok kode.
  - Tempel (paste) atau seret gambar langsung ke tulisan.
  - Autosave, tidak ada tombol "Simpan". Draft tidak tampil di situs sampai dipublikasikan.
- **Album**: seret banyak foto sekaligus, atur urutan dengan drag, beri keterangan, pilih sampul. Lightbox dengan navigasi keyboard.
- **Pengaturan**: nama, foto profil, tautan sosial, ikon teknologi, dan halaman About, semuanya dari admin.
- Foto otomatis diputar sesuai EXIF dan dikecilkan (maks 2400px) sebelum disimpan.

## Menjalankan

### 1. Siapkan Supabase
1. Buat project di https://supabase.com.
2. Buka **SQL Editor**, paste isi `supabase/schema.sql`, lalu **Run**.
   Ini membuat tabel, mengunci akses lewat RLS, dan membuat bucket `uploads` untuk gambar.
3. Buka **Project Settings > API**, salin **Project URL** dan **service_role key**.

### 2. Isi environment
```bash
cp .env.example .env.local
```
Isi `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, dan `SESSION_SECRET`
(string acak panjang, misalnya hasil `openssl rand -hex 32`).

> `service_role` key itu rahasia. Hanya dipakai di server, jangan beri prefix `NEXT_PUBLIC_`
> dan jangan di-commit. Karena semua tabel dikunci RLS tanpa policy, kunci `anon` tidak bisa mengakses data.

### 3. Jalankan
```bash
npm install
npm run seed     # opsional: isi contoh tulisan, project, dan album
npm run dev
```
Buka http://localhost:3000, lalu http://localhost:3000/admin untuk masuk.

Hapus data contoh dari admin kalau sudah tidak diperlukan, lalu isi profilmu di **Pengaturan**.

## Deploy (Vercel)
Impor repo, lalu isi empat environment variable yang sama
(`NEXT_PUBLIC_SITE_URL` diisi domain aslimu). Tidak ada disk lokal yang dipakai,
jadi aman di hosting serverless.

## Struktur singkat

```
app/(site)/        halaman publik (home, blog, projects, album, about)
app/admin/         panel admin dan editor
app/api/           route handler CRUD, upload, login
components/admin/  editor Tiptap, editor album, form
lib/db.js          semua query Supabase
supabase/schema.sql
scripts/seed.mjs   data contoh
test/              tes (lihat bawah)
```

## Tes

Proyek ini diuji end-to-end memakai server tiruan Supabase (tanpa akun):

```bash
node test/fake-supabase.mjs &                       # API Supabase tiruan di :54321
set -a; . test/env.test; set +a
npm run seed && npm run build && npm start &
FAKE=http://127.0.0.1:54321 node test/smoke.mjs     # alur API
python3 test/editor.py                              # editor di Chromium (butuh playwright)
```

Server tiruan hanya meniru fitur yang dipakai aplikasi. Sebelum launching,
coba alurnya sekali di project Supabase aslimu.
