# 💰 Nabung Bareng

> Aplikasi web kolaboratif untuk mencatat dan memantau tabungan serta pengeluaran bersama pasangan secara *real-time*, lengkap dengan laporan bulanan dan dukungan PWA (Progressive Web App) agar dapat diinstal layaknya aplikasi mobile.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Realtime-3ECF8E?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css)
![PWA](https://img.shields.io/badge/PWA-Supported-purple?style=flat-square)

---

## ✨ Fitur Utama

- **🔗 Sistem Pairing Akun:** Hubungkan akunmu dan pasangan menggunakan kode *invite* unik yang otomatis ter-generate saat registrasi.
- **⚡ Real-time Synchronization:** Sinkronisasi data instan menggunakan Supabase Realtime—perubahan data atau entri tabungan baru dari pasangan akan langsung muncul di layar tanpa perlu *refresh*.
- **📊 Statistik & Laporan Bulanan:**
  - Visualisasi persentase kontribusi tabungan masing-masing pengguna.
  - Grafik dan rincian pengeluaran bulanan berdasarkan kategori (Makanan, Kencan, Belanja, Liburan, Tagihan, dll).
- **📝 Manajemen Transaksi Lengkap:** Catat, edit, dan hapus transaksi (pemasukan tabungan atau pengeluaran) dengan mudah.
- **🎉 Gamifikasi & Notifikasi:** Efek konfeti (*confetti*) dan notifikasi bergaya *retro-glassmorphism* saat pasangan berhasil menabung.
- **⚙️ Kustomisasi & Profil:** Atur judul target tabungan bersama, nominal target dinamis, dan unggah foto profil (didukung oleh Supabase Storage).
- **📱 PWA (Progressive Web App):** Dapat diinstal langsung ke layar utama (*Home Screen*) HP Android maupun iOS layaknya aplikasi native.

---

## 🛠️ Teknologi yang Digunakan

- **Frontend:** Next.js (App Router), React, Tailwind CSS, Heroicons
- **Backend & Database:** Supabase (PostgreSQL, Auth, Real-time Subscriptions, Storage)
- **Gamifikasi:** Canvas Confetti
- **PWA:** `@ducanh2912/next-pwa`

---

## 📂 Struktur Database Supabase

Aplikasi ini menggunakan dua tabel utama di Supabase:
1. **`profiles`**: Menyimpan informasi pengguna (`id`, `name`, `invite_code`, `partner_id`, `avatar_url`, `target_title`, `target_amount`).
2. **`transactions`**: Menyimpan riwayat keuangan (`id`, `user_id`, `type` [saving/expense], `category`, `amount`, `description`, `created_at`).

---

## 🚀 Cara Menjalankan Secara Lokal (Local Development)

Jika ingin menjalankan atau mengembangkan proyek ini di komputer lokal, ikuti langkah-langkah berikut:

1. **Clone repository ini:**
   ```bash
   git clone [https://github.com/username-kamu/nabung-bareng.git](https://github.com/username-kamu/nabung-bareng.git)
   cd nabung-bareng

   Instal dependencies:

Bash
npm install
Buat file environment:
Buat file bernama .env.local di root folder proyek, lalu masukkan konfigurasi Supabase kamu:

Cuplikan kode
NEXT_PUBLIC_SUPABASE_URL=url_supabase_kamu_disini
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon_key_supabase_kamu_disini
Jalankan server lokal:

Bash
npm run dev
Buka http://localhost:3000 di browser.

📦 Deployment ke Vercel
Proyek ini dirancang agar sangat mudah di-deploy ke Vercel:

Push repository ini ke GitHub.

Buat proyek baru di Vercel Dashboard dan impor repository nabung-bareng.

Masukkan Environment Variables (NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY) di pengaturan Vercel.

Klik Deploy!

👥 Author
Dibuat dengan ❤️ untuk pengelolaan finansial bersama.

---
