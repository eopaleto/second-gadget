# Pembaruan katalog dan dashboard

Perubahan aplikasi sudah tersedia di source. Pada 29 Oktober 2026, migration `002` dan `003` telah dipasang pada proyek Supabase yang cocok dengan konfigurasi frontend, dan fungsi `submit-review` telah di-deploy. Tabel model, kondisi baru, garansi, dan metode pembayaran sudah terbaca melalui API aplikasi. Stok produk tidak ditambahkan atau dihapus.

**Yang masih perlu dikonfigurasi:** kunci Cloudflare Turnstile pada frontend/server dan secrets fungsi untuk pengiriman ulasan. Kunci publik Turnstile belum tersedia saat pemeriksaan; formulir sengaja menonaktifkan pengiriman sampai layanan siap. Langkah di bawah juga menjadi panduan untuk instalasi lain atau deployment ulang.

## 1. Pasang skema dan katalog referensi

Untuk proyek yang sudah menjalankan migration `001`, pilih **salah satu** cara berikut.

**Melalui dashboard Supabase:** buka SQL Editor pada proyek toko, salin seluruh isi [artifacts/upgrade-catalog.sql](artifacts/upgrade-catalog.sql), lalu Run. File ini menggabungkan migration `002` dan `003` secara berurutan. Masing-masing berjalan dalam transaksi dan aman dijalankan ulang. Tidak ada penghapusan atau pembuatan stok produk. ID brand/kategori yang sudah mempunyai slug sama tetap dipertahankan; logo yang sudah diisi tidak ditimpa.

**Melalui CLI**, jika proyek sudah dikelola dengan migration:

```powershell
npx supabase login
npx supabase link --project-ref PROJECT_REF
npx supabase db push
```

Ganti `PROJECT_REF` dengan ID proyek toko. Jika migration sebelumnya dipasang manual dan CLI belum mencatatnya, periksa `npx supabase migration list`. Tandai hanya migration yang benar-benar sudah dipasang menggunakan `npx supabase migration repair VERSION --status applied`, sebelum melanjutkan. Jangan mereset database produksi.

Migration baru menambahkan 24 brand dengan logo lokal, 6 kategori, serta 60 model awal. Sumber produsen tersedia pada `source_url` setiap model di [src/data/device-catalog.json](src/data/device-catalog.json). Daftar ini referensi awal, bukan katalog seluruh model dunia dan bukan ketersediaan stok. Kapasitas/warna dapat berbeda menurut pasar; pilihan manual tetap tersedia. Model yang tidak mencantumkan spesifikasi pasti memakai pilihan umum, bukan menebak varian.

## 2. Aktifkan ulasan pengguna

Gunakan konfigurasi Turnstile/Edge Function yang dijelaskan di [README](README.md#4-mengaktifkan-trade-in-ulasan-dan-undangan-admin): `TURNSTILE_SECRET_KEY`, `RATE_LIMIT_SALT`, `ALLOWED_ORIGINS`, dan `SITE_URL` pada secrets server; `VITE_TURNSTILE_SITE_KEY` pada frontend.

Deploy endpoint baru:

```powershell
npx supabase functions deploy submit-review
```

Widget untuk ulasan memakai action `review` dan hostname frontend yang terdaftar. Pengunjung tidak perlu akun. Endpoint memeriksa persetujuan, rating, panjang teks, honeypot, CAPTCHA, dan batas 5 pengiriman per jam per hash IP. Ulasan baru selalu menunggu moderasi. Admin hanya mendapat izin mengubah persetujuan publikasi, bukan nama, rating, atau tulisan pengguna.

## 3. Jalankan frontend terbaru

```powershell
npm test
npm run build
npm run dev
```

Untuk produksi, deploy ulang frontend setelah migration dan fungsi server siap. Variabel `.env` yang ada tidak diubah. Jangan menaruh secret/service-role key dalam variabel `VITE_*`.

Pemeriksaan skema opsional, tanpa menampilkan key:

```powershell
node scripts/check-backend.mjs
```

Ketiga tabel harus menunjukkan `ready: true`. Script ini tidak memeriksa CAPTCHA atau deployment Edge Function.

## Menggunakan fitur baru

- **Tambah unit:** pilih brand → model → kapasitas/RAM/warna → kondisi → harga, garansi, foto, dan catatan unit. Kategori, nama, SKU, dan slug diisi otomatis. Pilih **Model lain / tambah manual** untuk model baru; setelah disimpan, model dapat digunakan lagi. Brand manual tetap tersedia di menu Brand, dengan unggahan logo opsional.
- **Kondisi:** Sangat Baik, Baik, Like New, Brand New In Box, Brand New Open Box. Unit lama tetap menampilkan grade sampai admin memeriksa dan memilih kondisi baru; migrasi tidak menyimpulkan kondisi fisik.
- **Koleksi bekas bergaransi:** hanya unit tersedia, bukan kondisi Brand New, dengan garansi yang diaktifkan dan keterangannya diisi. Produk lama perlu diperiksa dan diperbarui agar masuk koleksi. Slot tetap tampil dengan pesan kosong jika stok belum ada.
- **Grafik ringkasan:** periode 7/30/90 hari, jumlah listing masuk, listing yang saat ini berstatus terjual menurut tanggal status tersebut, serta komposisi stok. Bukan laporan omzet. Tanggal penjualan lama tidak direka; grafik mulai mencatat perpindahan ke Terjual setelah pembaruan.
- **Ulasan:** pengunjung mengirim dari `/ulasan`; admin menyetujui atau menyembunyikan di menu Ulasan. Permintaan penghapusan permanen dapat ditangani owner melalui dashboard database.
- **Footer:** isi alamat, Maps, jam buka, Instagram/Facebook/TikTok/YouTube dan WhatsApp lewat Pengaturan. Centang metode pembayaran yang diterima toko. Tautan “Beli … bekas” mengikuti unit bekas yang tersedia. Logo pembayaran adalah informasi metode di toko, bukan integrasi checkout/paylater.
- **Gerakan:** logo brand berjalan dengan kontrol jeda, berhenti saat hover/fokus, dan mengikuti preferensi reduced motion. Animasi tidak memicu permintaan data.
- **Alt-Tab:** pembaruan token/sesi pengguna yang sama mempertahankan modal dan isian. Logout atau perubahan akun tetap membersihkan cache. Polling 30 detik dan refetch saat fokus dinonaktifkan; perubahan database menggunakan Realtime dan penyimpanan lokal membatalkan cache terkait.

## Verifikasi

Tes mencakup sesi/fokus dengan dialog asli, draft form, pemilihan dan penyimpanan model, kapasitas, filter koleksi, tautan footer, tren tanggal WIB, validasi ulasan, migration berulang, atomic write, dan izin database. Endpoint ulasan diperiksa dengan `deno check`.

Pada 30 Oktober 2026, tampilan publik diperiksa menggunakan Chrome lokal melalui Playwright: 21 tampilan halaman pada lebar 320, 375, 390, 768, 1024, 1280, dan 1440 piksel. Pemeriksaan mencakup batas elemen navbar, pencarian desktop tanpa modal, pencarian mobile, logo rata kiri, tombol cari mobile yang menonjol, jeda animasi banner, dan reduced motion. Hasil serta screenshot tersimpan di `artifacts/responsive`. Data pengujian browser diisolasi dan tidak ditulis ke database.

Untuk mengulang pemeriksaan tersebut pada komputer dengan Chrome terpasang, jalankan `npm run dev`, lalu di terminal lain jalankan `npm exec --yes --package=playwright -- node scripts/responsive-smoke.cjs`. Browser bawaan lingkungan masih gagal memulai sandbox Windows, sehingga pemeriksaan memakai Chrome lokal. Lighthouse belum diukur. Login, CAPTCHA, pengiriman ulasan, dan Storage tetap perlu diuji dengan konfigurasi layanan yang sebenarnya.
