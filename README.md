# Second Device

Website etalase gadget second dengan React + Vite + TypeScript, Tailwind CSS, Supabase, React Router, TanStack Query, React Hook Form + Zod, Motion, dan Lucide.

**Aplikasi disiapkan tanpa inventaris, kontak, promo, atau ulasan rekaan.** Tanpa environment Supabase, halaman publik tetap dapat dibuka dengan empty state. Login dan pengiriman trade in tetap nonaktif. Isi data asli lewat dashboard setelah backend dikonfigurasi.

**Untuk proyek yang sudah berjalan:** ikuti [panduan pembaruan katalog dan dashboard](UPGRADE.md). Migration `002` dan `003` serta fungsi `submit-review` diperlukan untuk fitur terbaru. File SQL gabungan siap dijalankan tersedia di `artifacts/upgrade-catalog.sql` (dapat dibuat ulang melalui `node scripts/build-upgrade.mjs`).

## Menjalankan aplikasi

Gunakan Node.js 22.12+ atau 24 LTS dan npm. Versi dependency terkunci di `package-lock.json`.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Buka URL lokal yang dicetak Vite, biasanya `http://127.0.0.1:5173`. Halaman admin: `/admin/login`. Mengubah environment membutuhkan restart Vite.

```powershell
npm test
npm run build
npm run preview
```

## 1. Konfigurasi Supabase

Buat proyek Supabase milik toko. Isi `.env.local` menggunakan Project URL dan **publishable key**, bukan secret/service-role key:

```dotenv
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
VITE_TURNSTILE_SITE_KEY=
VITE_SITE_URL=
```

`VITE_SITE_URL` diisi dengan origin produksi setelah domain tersedia, misalnya domain Vercel milik toko. Nilai ini digunakan untuk canonical URL dan sitemap build. Biarkan kosong sebelum mempunyai domain sebenarnya. Semua variabel `VITE_*` dapat dibaca browser.

Gunakan Supabase CLI untuk memasang skema:

```powershell
npx supabase login
npx supabase link --project-ref PROJECT_REF
npx supabase db push
```

Migration `supabase/migrations/202610290001_initial.sql` membuat tabel, index, constraint, RLS, fungsi penyimpanan atomik, audit log, serta dua bucket:

| Bucket             | Akses                                                         |
| ------------------ | ------------------------------------------------------------- |
| `product-images`   | Foto etalase publik; penulisan hanya admin/owner              |
| `trade-in-private` | Privat; baca melalui signed URL oleh admin; hapus hanya owner |

Tidak ada seed produk. Satu baris pengaturan hanya berisi identitas Second Device dari PRD; kontak dan alamat kosong. Tabel role, transaksi, dan penyimpanan foto dilindungi di database, tidak bergantung pada tombol yang disembunyikan frontend. Lihat [dokumentasi RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

Untuk pengembangan backend lokal, Supabase CLI membutuhkan Docker. Jalankan `npx supabase start`, kemudian `npx supabase db reset` **hanya pada database lokal yang boleh direset**. Jangan reset database produksi.

## 2. Membuat owner pertama

1. Di Supabase Authentication, matikan pendaftaran akun baru untuk proyek hosted. `enable_signup = false` dalam `config.toml` mengatur pengembangan lokal; pengaturan proyek hosted harus diperiksa tersendiri.
2. Buat satu user owner lewat dashboard Authentication menggunakan email toko dan password yang kuat. Tidak ada password bawaan di repository.
3. Salin UUID user tersebut. Jalankan SQL berikut di SQL Editor, mengganti UUID dan nama tampilan:

```sql
insert into public.admin_profiles(user_id, display_name, role)
values ('UUID_USER_DARI_AUTH', 'Nama Owner', 'owner');
```

4. Masuk lewat `/admin/login`.
5. Lengkapi **Pengaturan**, kemudian **Produk**. Brand, logo, kategori, dan model awal dipasang oleh migration `003`.

Owner dapat mengundang admin, mengubah role akun lain, dan mencabut akses. Admin biasa tidak dapat mengubah role. Owner tidak dapat menurunkan atau menghapus aksesnya sendiri. Undangan membutuhkan fungsi `manage-admin`, URL redirect, dan layanan email Auth/SMTP yang sudah dikonfigurasi. Akun undangan mengatur password melalui `/admin/atur-password`.

## 3. Mengisi toko

- Gunakan 24 brand, 6 kategori, dan 60 model awal yang sudah disediakan. Brand tambahan tetap dapat dibuat manual; logo opsional. Menonaktifkan brand/kategori menyembunyikan produk terkait dari katalog.
- Setiap perangkat bekas adalah listing terpisah dengan SKU dan slug unik. Tambahkan foto unit asli; foto pertama menjadi foto utama dan bisa diurutkan lewat tombol **Jadikan utama**.
- Pilih brand lalu model. Kategori, nama, SKU, dan slug otomatis terisi. Pilih kapasitas, RAM, warna, kondisi, serta garansi yang sesuai unit; opsi manual tetap tersedia. Isi harga dan catatan pemeriksaan. Kosongkan informasi opsional yang belum diketahui.
- Simpan sebagai **Draft** saat belum siap; ubah menjadi **Tersedia** untuk publikasi. Publikasi melalui form/RPC mewajibkan foto. Semua foto baru disimpan bersama metadata produk secara atomik; unggahan yang gagal disimpan akan dicoba dihapus.
- **Dipesan** tetap dapat dibaca tetapi tanpa CTA transaksi. **Terjual** otomatis memiliki stok nol dan tetap dapat dibaca melalui URL lama. **Diarsipkan** disembunyikan. Tidak ada hapus permanen produk dari aplikasi.
- Lengkapi WhatsApp bisnis, tautan media sosial, alamat, Google Maps, jam operasional, deskripsi, logo, dan metode pembayaran di **Pengaturan**. Kontak kosong tidak menghasilkan tautan palsu. Link WhatsApp berisi nama unit, harga, dan URL; bukan reservasi atau pembayaran.
- Promo membutuhkan periode dan relasi produk. Promo aktif hanya tampil selama periode berlaku dan masih memiliki unit tersedia. Harga coret sengaja tidak ditampilkan tanpa bukti riwayat harga.
- Pengunjung menulis ulasan dari `/ulasan`. Admin hanya menyetujui atau menyembunyikan ulasan; izin database membatasi pengubahan nama, rating, dan isi tulisan.

Katalog menyimpan pencarian, brand, kategori, rentang harga, kapasitas, kondisi, warna, koleksi, status, battery health, sort, dan halaman ke query URL. Admin dapat mencari/filter stok dan mengarsipkan dengan konfirmasi. Polling dan refetch saat tab kembali aktif dinonaktifkan. Perubahan database menggunakan Realtime; perubahan pada dashboard membatalkan cache lokal. Pembaruan sesi untuk pengguna yang sama mempertahankan modal dan isian yang belum disimpan.

## 4. Mengaktifkan trade in, ulasan, dan undangan admin

Form publik memakai Cloudflare Turnstile dan Supabase Edge Functions. Buat widget Turnstile dengan hostname frontend yang sebenarnya, lalu isi `VITE_TURNSTILE_SITE_KEY` dan restart/rebuild frontend.

Simpan nilai berikut pada **Supabase Edge Functions → Secrets**, bukan pada variabel frontend:

| Secret                 | Isi                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `SITE_URL`             | Origin produksi frontend, tanpa path                                                                                                         |
| `ALLOWED_ORIGINS`      | Origin yang diizinkan, dipisahkan koma, tanpa trailing slash; untuk lokal tambahkan `http://127.0.0.1:5173` dan/atau `http://localhost:5173` |
| `TURNSTILE_SECRET_KEY` | Secret widget Turnstile                                                                                                                      |
| `RATE_LIMIT_SALT`      | String acak panjang dari password manager; jangan gunakan publishable key                                                                    |

`SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` disediakan oleh runtime Supabase, hanya digunakan di fungsi server. Lihat [pengaturan secrets resmi](https://supabase.com/docs/guides/functions/secrets).

Deploy fungsi:

```powershell
npx supabase functions deploy submit-trade-in
npx supabase functions deploy submit-review
npx supabase functions deploy manage-admin
```

`verify_jwt = false` di `config.toml` disengaja: pengajuan tidak memerlukan login. Fungsi `manage-admin` tetap **memverifikasi JWT caller lewat Auth dan mengecek role owner di database** sebelum menggunakan service role. Jangan menghilangkan pemeriksaan ini.

Di Authentication URL Configuration, set Site URL dan tambahkan `https://DOMAIN_TOKO/admin/atur-password` ke daftar redirect. Atur SMTP untuk pengiriman undangan yang andal. Panduan: [deployment fungsi Supabase](https://supabase.com/docs/guides/functions/deploy).

Validasi server mengharuskan consent, nomor Indonesia valid, kapasitas valid, honeypot kosong, CAPTCHA valid dengan hostname dan action `trade_in`, maksimal 4 foto JPG/PNG/WebP masing-masing 5 MB, signature file sesuai, dan body maksimal 21 MB. Token CAPTCHA diverifikasi server, bukan dipercaya dari browser ([dokumentasi Turnstile](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)).

Rate limit persisten: maksimal 5 percobaan per jam per nomor dan per IP, memakai hash bersalt. Data pengajuan tidak dapat di-SELECT/INSERT langsung oleh publik. Foto memakai bucket privat. Admin membuka foto melalui signed URL berumur 60 detik. Owner dapat menghapus data beserta foto ketika tindak lanjut selesai atau ada permintaan penghapusan. Tentukan kebijakan retensi operasional toko sebelum go-live; aplikasi tidak menghapus pengajuan secara otomatis.

## 5. Deploy frontend ke Vercel

1. Simpan repository ke Git milikmu dan import di Vercel.
2. Pilih framework **Vite**, build command `npm run build`, output `dist`.
3. Tambahkan environment publik yang sama pada environment Vercel yang digunakan.
4. Set `VITE_SITE_URL` ke URL produksi. Samakan origin pada secrets fungsi, hostname Turnstile, dan redirect Auth.
5. Deploy. `vercel.json` menangani fallback SPA untuk URL nested serta header keamanan dasar.
6. Coba akses langsung `/gadget/SLUG_ASLI` dan `/admin/login`, lalu lakukan alur stok, WhatsApp, dan trade in menggunakan data uji milik toko sebelum membuka layanan publik.

Ketika domain tersedia, build membuat `dist/sitemap.xml` dari rute publik dan slug yang dapat dibaca melalui RLS. Sitemap memerlukan build ulang setelah inventaris berubah. Admin dikecualikan dari robots dan memakai metadata noindex. Metadata halaman produk diperbarui di browser; preview sosial/SEO lengkap pada crawler tanpa JavaScript memerlukan prerender/SSR sebagai peningkatan lanjutan.

## Struktur source

```text
src/
  app/Auth.tsx               # sesi dan profil role
  components/               # layout, dialog, state, kartu produk
  features/                 # halaman katalog, detail, info, trade in
    admin/                  # dashboard, CRUD konten, editor produk
  hooks/useSeo.ts
  lib/                      # Supabase, queries, format, validasi
  types/
  test/                     # fixture hanya untuk pengujian
supabase/
  migrations/               # schema, constraints, RLS, storage, audit
  functions/                # pengajuan publik dan undangan owner
scripts/sitemap.mjs
```

Semua desain halaman menggunakan utility Tailwind. `src/index.css` hanya mengimpor Tailwind dan mendeklarasikan token `@theme`. Data bisnis tidak ditanam di JSX. Pembeli tidak memiliki akun, keranjang, checkout, atau reservasi otomatis.

## Pengujian dan batas verifikasi

`npm test` menjalankan tes filter gabungan/URL, pesan WhatsApp, kondisi unit terjual, validasi form/foto, serta migration dan RLS pada PostgreSQL WASM (PGlite). Hanya lapisan bawaan Supabase `auth`/`storage` yang disimulasikan pada tes database; SQL migration dan policy aplikasi yang sebenarnya dieksekusi dua kali untuk memeriksa pengulangan yang aman. Tes juga memeriksa pembatasan role, privasi pengajuan/foto, rollback produk-foto, promo habis stok, rate limit, dan audit log.

Tes juga mencakup modal/draft saat pergantian fokus dan pembaruan sesi, dropdown serta penyimpanan model, koleksi bergaransi, tautan footer sesuai stok, grafik tanggal WIB, validasi ulasan pengguna, dan pembatasan admin pada moderasi saja. Tes tersebut tidak menggantikan pengujian Auth, Storage HTTP, pengiriman email, CAPTCHA, dan Edge Functions pada proyek Supabase sungguhan. Pemeriksaan visual browser dan Lighthouse belum dapat dilakukan karena runtime browser lingkungan pengerjaan gagal memulai sandbox Windows. Target Lighthouse/Core Web Vitals belum diklaim tercapai.

Lakukan QA visual 320, 375, 768, 1024, dan 1440 px, navigasi keyboard/Escape, reduced motion, kontras, serta seluruh alur dengan data toko sebelum peluncuran. Dialog memakai elemen native dengan fokus modal. Tidak ada analytics tracker pada versi ini.

Katalog saat ini mengambil data publik dalam batch 500 baris lalu memfilter di client, sesuai penggunaan toko tunggal. Untuk inventaris besar, pindahkan pencarian/filter/pagination ke query server. Foto dioptimalkan seperlunya sebelum diunggah; aplikasi membatasi tipe dan ukuran, tetapi tidak mengubah resolusi otomatis. Snapshot SEO server, perbandingan produk, serta wishlist tidak termasuk versi ini.

## Aset editorial

Foto editorial lokal dipakai sebagai visual pengantar dan diberi label **bukan foto unit stok**. Tidak dipakai sebagai foto produk, bukti toko, atau promosi.

- `public/images/editorial-iphone.webp`: [Howard Bouchevereau / Unsplash](https://unsplash.com/photos/a-silver-cell-phone-sitting-on-top-of-a-black-table-2Q-pPfHZHyo).
- `public/images/trade-in-editorial.webp`: [Quinn Battick / Unsplash](https://unsplash.com/photos/two-iphones-sitting-next-to-each-other-on-a-table-WPz0fIpoXfM).

Logo default dibuat sebagai wordmark antarmuka dan dapat diganti dengan logo toko asli. Tidak ada foto gadget yang dihasilkan AI. Font Manrope dimuat dari Google Fonts; fallback sans-serif tetap tersedia.

Logo brand lokal memakai ikon [Simple Icons](https://simpleicons.org/) bila tersedia dan wordmark untuk merek yang tidak tersedia pada paket. Nama/merek tetap milik pemegangnya. Logo Visa/Mastercard berada di `public/payments`; QRIS, bank, e-wallet, dan Kredivo ditampilkan sebagai penanda metode pembayaran. Referensi model dan tautan produsen tersimpan di `src/data/device-catalog.json`.
#   s e c o n d - g a d g e t  
 