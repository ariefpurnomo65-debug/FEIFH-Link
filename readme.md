# FEIFH Link — Katalog Digital UMKM Kampung Suaran

Website katalog digital untuk UMKM Kampung Suaran. Dibangun dengan HTML, CSS, dan JavaScript murni (tanpa framework).

## 📁 Struktur File

```
WEB/
├── index.html      → Halaman publik (beranda, katalog, detail UMKM)
├── admin.html      → Panel admin (CRUD data UMKM, statistik, pengaturan database & banner)
├── style.css       → Semua styling (publik + admin)
├── script.js       → Logika halaman publik (pencarian, filter, modal, banner, foto)
├── admin.js        → Logika panel admin (CRUD, statistik, database, banner, export)
├── data.js         → Data bawaan (seed data UMKM, kategori, banner)
├── netlify.toml    → Konfigurasi deploy ke Netlify
├── PRD.md          → Product Requirements Document
└── README.md       → File ini
```

## 🚀 Cara Menjalankan

### Lokal (Development)
1. Buka folder ini di VS Code
2. Klik kanan `index.html` → **Open with Live Server** (atau buka langsung di browser)
3. Panel admin: buka `admin.html` di browser

 ### Deploy ke GitHub Pages (Gratis)
 1. Buka repository di GitHub (https://github.com/username/FEIFH-Link)
 2. Pada halaman repository, pilih **Settings → Pages**
 3. Pada bagian **Source**, pilih branch `main` dan folder `/` (root), lalu klik **Save**
 4. GitHub Pages akan menghasilkan URL default:
    ```
    https://username.github.io/FEIFH-Link/
    ```
 5. Setiap kali Anda melakukan `git push` ke branch `main`, situs akan otomatis ter‑update.

 **Catatan:** Tidak diperlukan file `netlify.toml` atau konfigurasi build karena situs ini statis.

### Update Website Setelah Deploy
Ada 2 cara:

**Cara 1: Drag & drop ulang (cepat)**
- Edit file di lokal
- Drag & drop folder ke https://app.netlify.com/drop lagi
- Otomatis mengganti site yang sudah ada (URL tetap sama)

**Cara 2: Git push (otomatis)**
- Edit file di lokal
- `git add . && git commit -m "update" && git push`
- Netlify otomatis build ulang

## 🔐 Panel Admin

### Akses
 - URL: `admin.html` (akses langsung di GitHub Pages)
 - PIN default: `suaran2025` (disimpan sebagai hash SHA‑256 di `admin.js`)
 - **GANTI PIN** dengan mengubah nilai `ADMIN_PIN_HASH` di `admin.js` sebelum produksi

### Fitur Admin
- ✅ Dashboard statistik (Total UMKM, Kategori, Buka, Tutup)
- ✅ Tambah / Edit / Hapus data UMKM
- ✅ Upload foto usaha & foto produk (via URL gambar)
- ✅ Update lokasi Google Maps (koordinat GPS)
- ✅ Kelola kategori (tambah / ubah / hapus)
- ✅ **Edit teks website** (hero, about, footer, dll)
- ✅ Pengaturan banner website (gambar hero)
- ✅ Export data.js (untuk deploy permanen)
- ✅ Pengaturan database (localStorage / Supabase)

## 📸 Upload Foto Usaha & Produk

### Cara Upload Foto
1. Buka https://imgbb.com atau https://postimg.cc (gratis, tanpa login)
2. Upload gambar yang diinginkan
3. Copy URL gambar yang dihasilkan (contoh: `https://i.ibb.co/xxx/foto.jpg`)
4. Buka panel admin → Edit UMKM
5. Paste URL ke field **Foto Usaha** atau **Foto Produk**
6. Klik **Simpan**

### Tampilan Foto
- **Foto Usaha**: tampil di kartu grid (card) dan modal detail
- **Foto Produk**: tampil di modal detail UMKM
- Jika foto kosong, akan pakai emoji icon sebagai fallback

## 🗺️ Update Lokasi Google Maps

### Cara Mendapatkan Koordinat GPS
1. Buka https://maps.google.com
2. Cari lokasi usaha
3. Klik kanan di lokasi yang tepat → pilih koordinat (angka latitude, longitude)
4. Copy angka tersebut (contoh: `-7.1234` dan `110.5678`)
5. Buka panel admin → Edit UMKM
6. Paste ke field **Latitude** dan **Longitude**
7. Klik **Simpan**

### Cara Kerja Link Maps
- Jika GPS diisi: link Maps pakai `google.com/maps/dir/?api=1&destination=lat,lng` (lebih presisi)
- Jika GPS kosong: link Maps pakai `mapsQuery` (kata kunci pencarian) sebagai fallback

## 🖼️ Banner Website

### Cara Ganti Banner
1. Buka panel admin
2. Klik tombol **🖼️ Banner** di toolbar
3. Upload gambar ke ImgBB/PostIMG, copy URL
4. Paste URL ke field **URL Gambar Banner**
5. Centang **Tampilkan gambar banner**
6. Klik **Simpan**

### Ukuran Rekomendasi Banner
- **1200 x 400 pixel** (format landscape)
- Format JPG atau PNG
- Ukuran file maksimal 1MB (agar loading cepat)

### Catatan
- Banner hanya tampil di halaman utama (hero section)
- Jika nonaktif, akan pakai SVG peta rute default
- Banner disimpan di localStorage browser admin
- Untuk deploy permanen, export data.js

## 📝 Edit Teks Website

### Cara Mengubah Teks
1. Buka panel admin
2. Klik tombol **📝 Teks Website** di toolbar
3. Edit teks yang ingin diubah:
   - **Hero**: eyebrow, title, description, search placeholder, stats
   - **Kategori & Katalog**: heading
   - **About**: eyebrow, title, description, 3 points, admin note
   - **Footer**: text
4. Klik **Simpan**
5. Teks langsung berubah di halaman publik

### Catatan
- Teks disimpan di localStorage browser admin
- Untuk deploy permanen, export data.js
- Jika teks kosong, akan pakai teks default dari data.js

## 📬 Pengaduan & Saran

### Cara Mengirim Pengaduan/Saran (Pengunjung)
1. Buka halaman website
2. Scroll ke bagian **Pengaduan & Saran** (di footer)
3. Isi form:
   - Nama Anda
   - Kontak (WhatsApp/Email)
   - Jenis: Pengaduan / Saran / Masukan
   - Pesan
4. Klik **Kirim Pesan**
5. Pesan tersimpan dan admin akan melihatnya di panel admin

### Cara Melihat & Mengelola Pengaduan (Admin)
1. Buka panel admin
2. Klik tombol **📬 Pengaduan & Saran** di toolbar
3. Daftar pesan akan muncul:
   - **Warna kuning** = pesan baru (belum dibaca)
   - **Warna putih** = pesan sudah dibaca
4. Aksi yang bisa dilakukan:
   - **✓ Tandai Dibaca** — tandai pesan sudah dibaca
   - **🗑️ Hapus** — hapus pesan permanen
5. Klik **🔄 Refresh** untuk memperbarui daftar

### Catatan
- Data pengaduan disimpan di localStorage browser admin
- Untuk deploy permanen, export data.js
- Pesan baru akan muncul dengan highlight kuning

## 🗄️ Opsi Database

### Mode 1: localStorage (Default)
- Data disimpan di browser admin
- **Cocok untuk:** testing, development
- **Kelemahan:** data hilang jika browser dibersihkan, tidak tersinkron antar perangkat

### Mode 2: Supabase (Cloud)
- Data disimpan di PostgreSQL cloud
- **Cocok untuk:** produksi, multi-device
- **Kelebihan:** data tersinkron, bisa diakses dari mana saja

#### Setup Supabase (5 menit)

1. **Buat akun Supabase** (gratis)
   - Buka https://supabase.com
   - Sign up dengan GitHub/Google

2. **Buat project baru**
   - Klik **New Project**
   - Isi nama: `feifh-link`
   - Pilih region terdekat (Southeast Asia)
   - Klik **Create new project**

3. **Buat tabel database**
   - Buka tab **SQL Editor** di dashboard Supabase
   - Copy-paste kode SQL di bawah ini
   - Klik **Run**

```sql
-- Tabel untuk data UMKM
CREATE TABLE umkm (
  id BIGINT PRIMARY KEY,
  nama TEXT NOT NULL,
  kategori TEXT,
  icon TEXT,
  deskripsi TEXT,
  alamat TEXT,
  jam TEXT,
  whatsapp TEXT,
  mapsQuery TEXT,
  fotoUsaha TEXT,
  fotoProduk TEXT,
  latitude TEXT,
  longitude TEXT,
  buka BOOLEAN DEFAULT TRUE
);

-- Tabel untuk kategori
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT
);

-- Izinkan akses anon (untuk MVP, tanpa login)
-- WARNING: Untuk produksi nyata, batasi akses dengan RLS (Row Level Security)
ALTER TABLE umkm ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policy: izinkan semua operasi untuk anon (MVP)
CREATE POLICY "Allow all on umkm" ON umkm FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on categories" ON categories FOR ALL USING (true) WITH CHECK (true);
```

4. **Ambil kredensial API**
   - Buka tab **Settings** → **API**
   - Copy **Project URL** (contoh: `https://xxxxx.supabase.co`)
   - Copy **anon public key** (panjang, mulai dengan `eyJ...`)

5. **Hubungkan ke panel admin**
   - Buka `admin.html`
   - Login dengan PIN
   - Klik tombol **⚙️ Database**
   - Pilih **☁️ Supabase**
   - Paste **Project URL** dan **Anon Key**
   - Klik **🔌 Tes Koneksi** untuk memastikan
   - Klik **Simpan**

6. **Selesai!** Data sekarang tersimpan di cloud.

## 📝 Cara Maintain

### Ganti PIN Admin
Buka `admin.js`, cari baris:
```javascript
const ADMIN_PIN = "suaran2025";
```
Ganti dengan PIN baru.

### Tambah/Ubah Data UMKM
1. Buka panel admin
2. Klik **+ Tambah UMKM** atau tombol edit (✏️)
3. Isi form (termasuk foto & GPS jika ada)
4. Klik **Simpan**

### Deploy Perubahan Permanen
Jika pakai mode localStorage:
1. Klik **⬇️ Unduh data.js** di panel admin
2. File `data.js` terunduh
3. Ganti file `data.js` di hosting dengan file hasil unduh
4. Deploy ulang ke Netlify (drag & drop atau git push)

Jika pakai mode Supabase:
- Perubahan langsung tersimpan di cloud, tidak perlu deploy ulang

### Ganti Warna Tema
Buka `style.css`, cari bagian `:root`:
```css
--forest:   #1A8A7E;  /* turquoise gelap */
--leaf:     #40E0D0;  /* turquoise utama */
--marigold: #F2B705;  /* kuning aksen */
```

## ⚠️ Catatan Keamanan

- **PIN admin** bukan keamanan tingkat produksi. Siapa pun yang membaca kode bisa tahu PIN.
- **Supabase anon key** memang bisa dilihat publik (by design), tapi untuk keamanan lebih baik, aktifkan **Row Level Security** dan batasi operasi.
- Untuk produksi nyata dengan banyak admin, pertimbangkan:
  - Login berbasis server (bukan PIN browser)
  - Supabase Auth (login dengan email/password)
  - RLS policy yang ketat

## 📋 Data UMKM

Setiap UMKM memiliki field:
| Field | Keterangan |
|---|---|
| `nama` | Nama usaha |
| `kategori` | ID kategori (makanan, minuman, warung, jasa) |
| `icon` | Emoji representasi |
| `deskripsi` | Penjelasan singkat usaha |
| `alamat` | Alamat lengkap |
| `jam` | Jam operasional |
| `whatsapp` | Nomor WhatsApp (format: 62812xxxxxxx) |
| `mapsQuery` | Kata kunci untuk Google Maps |
| `fotoUsaha` | URL gambar foto usaha (opsional) |
| `fotoProduk` | URL gambar foto produk (opsional) |
| `latitude` | Koordinat GPS latitude (opsional) |
| `longitude` | Koordinat GPS longitude (opsional) |
| `buka` | Status buka/tutup (true/false) |

## 🎨 Teknologi

- HTML5
- CSS3 (Custom Properties, Grid, Flexbox)
- JavaScript (Vanilla, no framework)
- Supabase (opsional, untuk database cloud)
- Netlify (hosting)

## 📄 Lisensi

Bebas digunakan untuk keperluan Kampung Suaran.