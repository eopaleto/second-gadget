# Owner, admin, dan editor produk

**Status 1 November 2026:** migrasi koreksi akses admin sudah dipasang dan diverifikasi pada Supabase `wcirlhbdzfvpsakkbzow`. Terdapat 8 policy pengelolaan data toko untuk admin/owner dan 3 policy tulis akun yang tetap khusus owner. Data tetap 2 produk, 1 owner, dan 1 admin. Seluruh 63 test lulus dan build produksi berhasil. Frontend terbaru masih memerlukan deployment ulang ke Vercel.

## Hak akses yang berlaku

- Owner dan admin dapat mengelola produk (CRUD), brand, kategori, model, promo, pengaturan toko, gambar, ulasan, tindak lanjut trade-in, serta melihat riwayat aktivitas.
- Hanya owner yang dapat mengakses Akun Admin dan membuat, melihat, mengubah, atau menghapus akun/kredensial admin.
- Admin tidak dapat mengubah role sendiri atau role akun lain. Pemeriksaan berlaku di database dan Edge Function, termasuk jika mengakses URL akun secara langsung.
- Kedua role dapat mengubah password akun sendiri melalui Pengaturan.

## Koreksi policy database

Migrasi `202611010001_admin_store_access.sql` mengoreksi pembatasan monitoring pada migrasi sebelumnya. Tidak ada produk atau akun yang dihapus oleh migrasi ini.

Untuk pemasangan manual pada database yang sudah menjalankan migrasi sebelumnya, jalankan seluruh isi `supabase/UPDATE_ADMIN_PERMISSIONS.sql` di SQL Editor. `supabase/UPDATE_OWNER_ADMIN.sql` juga telah disamakan dengan policy terbaru. Jangan menjalankan ulang migrasi monitoring lama sendirian setelah migrasi koreksi.

Instalasi yang memakai Supabase CLI dapat memakai `supabase db push` setelah riwayat migrasi diselaraskan. Generator `node scripts/build-upgrade.mjs` menyertakan koreksi ini pada akhir file gabungan `artifacts/upgrade-catalog.sql`.

## Pembuatan akun langsung

Owner mengisi nama, email, password awal (12-128 karakter), dan konfirmasi password. Fungsi `manage-admin` membuat akun melalui `auth.admin.createUser` dengan `email_confirm: true`, kemudian menyimpan role `admin` di `public.admin_profiles`. Admin dapat langsung login tanpa undangan atau aktivasi email. Password tidak disimpan di tabel profil atau audit.

Jika profil gagal disimpan, fungsi mencoba menghapus akun Auth yang baru dibuat. Email yang sudah terdaftar ditolak tanpa mengubah akun lama. Akun owner tidak dapat diubah/dihapus melalui menu akun admin.

Fungsi `manage-admin` sudah diperbarui pada proyek `wcirlhbdzfvpsakkbzow` untuk pembuatan akun langsung. Koreksi hak akses toko tidak mengubah pembatasan owner pada fungsi tersebut.

Untuk deployment ulang fungsi:

```powershell
npx supabase functions deploy manage-admin --project-ref wcirlhbdzfvpsakkbzow --use-api
```

Untuk update manual, salin seluruh isi `supabase/manual/manage-admin.ts` ke editor fungsi `manage-admin`, lalu Deploy updates. Buat ulang file satu ini dengan `node scripts/build-manage-admin-manual.mjs`. Secrets `SITE_URL` dan `ALLOWED_ORIGINS` mengikuti domain frontend. Service-role key tetap di server. Handler memverifikasi sesi dan role owner sebelum memakai Admin Auth API.

## Frontend

```powershell
npm test
npm run build
```

Deploy source frontend terbaru ke Vercel agar kontrol admin aktif dan teks lama pada sidebar/dashboard hilang. Deploy frontend tidak otomatis memasang migrasi SQL atau Edge Function.

Sidebar desktop berada di kiri. Mobile memakai drawer kiri dengan tombol menu, fokus modal, Escape, backdrop, dan tombol tutup. Produk memakai kartu pada ponsel dan tabel pada layar lebih lebar.

Menutup modal produk mempertahankan isian dan foto di memori. IndexedDB menyimpan draf per akun/produk pada browser ini. Buka kembali produk yang sama untuk melanjutkan. Buang draf memerlukan konfirmasi; Simpan yang berhasil membersihkan draf. Jika IndexedDB diblokir atau penuh, pemulihan setelah reload tidak dijamin, tetapi penutupan/pembukaan modal dalam sesi yang sama tetap mempertahankan isian.

Gambar baru/lama memiliki tombol Hapus gambar di bawah pratinjau. Perubahan foto lama diterapkan ke server setelah Simpan.
