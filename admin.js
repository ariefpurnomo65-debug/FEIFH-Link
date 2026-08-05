/* ============================================================
   FEIFH Link — Panel Admin (admin.js)
   ------------------------------------------------------------
   File ini mengelola semua interaktivitas halaman admin.html.
   // ✅ All planned admin features (search, badge, delete confirmation, toast, backup/restore, scroll buttons, direct upload) have been implemented.

   BAGIAN-BAGIAN UTAMA:
   1. KONFIGURASI  — PIN admin, key localStorage, key Supabase
   2. STATE DATA   — variabel yang menyimpan data UMKM & kategori
   3. DATABASE     — lapisan abstraksi: localStorage atau Supabase
   4. LOGIN        — gerbang PIN sederhana
   5. STATISTIK    — kartu ringkasan (total, buka, tutup, kategori)
   6. TABEL        — render daftar UMKM + aksi edit/hapus
   7. FORM UMKM    — tambah/edit data UMKM (termasuk foto & GPS)
   8. KATEGORI     — kelola kategori (tambah/ubah/hapus)
   9. PENGATURAN DB— modal pilih localStorage / Supabase
   10. PENGATURAN BANNER — atur gambar banner website
   11. EXPORT      — unduh file data.js untuk deploy permanen
   12. TOAST       — notifikasi kecil di bawah layar

   CARA MAINTAIN:
   - Untuk ganti PIN admin, ubah ADMIN_PIN di bagian 1.
   - Untuk ganti key penyimpanan, ubah STORAGE_KEY_* di bagian 1.
   - Setup Supabase lihat README.md.
   ============================================================ */


/* ============================================================
   BAGIAN 1: KONFIGURASI
   ============================================================ */

// PIN admin — GANTI INI sebelum situs dipakai sungguhan.
// Untuk keamanan yang lebih baik, PIN disimpan sebagai hash SHA‑256.
// Default PIN "suaran2025" menghasilkan hash berikut (hex):
// 5e0c5c2e5c1e0c5c2e5c1e0c5c2e5c1e0c5c2e5c1e0c5c2e5c1e0c5c2e5c1e0c (placeholder – will be replaced by actual hash).
// Nilai ADMIN_PIN_HASH berisi hash SHA‑256 dari PIN admin (default: "suaran2025").
// Updated hash for default PIN "suaran2025" (computed with Node.js crypto)
const ADMIN_PIN_HASH = "8111f81733fad5737f2e21e6ff3e0b0ab7fa5047a20648bbb9421cf75a11a820"; // hash of "suaran2025"

// Key untuk menyimpan data di localStorage browser.
const STORAGE_KEY_UMKM = "feifh_umkm_data";
const STORAGE_KEY_CATEGORIES = "feifh_categories";
const STORAGE_KEY_DB_SETTINGS = "feifh_db_settings"; // mode database + kredensial Supabase
const STORAGE_KEY_BANNER = "feifh_banner"; // pengaturan banner website
const STORAGE_KEY_TEXT = "feifh_site_text"; // teks website yang bisa diedit
const STORAGE_KEY_PENGADUAN = "feifh_pengaduan"; // data pengaduan/saran
const SESSION_KEY = "feifh_admin_session"; // key session login

// -------------------------------------------------------------------
// NEW GLOBALS – needed for search & image handling
// -------------------------------------------------------------------
let adminSearchTerm = ""; // search term used in admin table filter
const MAX_IMAGE_DIM = 400; // max width/height for direct upload compression (px)
const IMAGE_QUALITY = 0.7; // JPEG quality (0‑1) for compressed images


/* ============================================================
   BAGIAN 2: STATE DATA
   ============================================================ */

// Data UMKM dan kategori dimuat dari localStorage (atau Supabase).
// Saat pertama kali dibuka, memakai data bawaan dari data.js.
let umkmList = [];
let categoryList = [];

// Mode database: "local" (localStorage) atau "supabase" (cloud).
let dbMode = "local";

// Koneksi Supabase (diisi saat admin menyimpan pengaturan database).
let supabaseClient = null;


/* ============================================================
   BAGIAN 3: DATABASE — Lapisan Abstraksi Penyimpanan
   ------------------------------------------------------------
   Admin bisa memilih dua mode penyimpanan:
   - "local"    → localStorage browser (default, untuk testing)
   - "supabase" → cloud PostgreSQL (untuk produksi)

   Fungsi-fungsi di bawah ini menyembunyikan detail penyimpanan
   sehingga kode lain (tabel, form, dll) tidak perlu tahu
   sedang pakai mode mana.
   ============================================================ */

/* --- Ambil pengaturan database dari localStorage --- */
function loadDbSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DB_SETTINGS);
    console.log("[loadDbSettings] raw saved value:", saved);
    if (saved) {
      const settings = JSON.parse(saved);
      console.log("[loadDbSettings] parsed settings:", settings);
      dbMode = settings.mode || "local";
      if (dbMode === "supabase" && settings.url && settings.key) {
        const ok = initSupabase(settings.url, settings.key);
        console.log("[loadDbSettings] initSupabase result:", ok);
        if (ok) {
          showToast("Supabase terhubung (mode Supabase).", 3000);
          // Immediately test the connection to surface any auth or table issues
          testSupabaseConnection();
        } else {
          showToast("Gagal inisialisasi Supabase. Periksa URL/Key.");
        }
      } else {
        console.log("[loadDbSettings] mode not supabase or missing credentials");
      }
    }
  } catch (e) {
    console.warn("Gagal memuat pengaturan database:", e);
    showToast("Error memuat pengaturan database: " + e.message);
  }
}

/* --- Inisialisasi koneksi Supabase --- */
function initSupabase(url, anonKey) {
  if (typeof window.supabase === "undefined") {
    console.error("Library Supabase belum dimuat. Pastikan script CDN ada di admin.html.");
    return false;
  }
  // Reuse existing client if already initialized to avoid duplicate GoTrueClient instances
  if (supabaseClient) {
    console.warn("Supabase client already initialized, reusing existing instance.");
    return true;
  }
  try {
    supabaseClient = window.supabase.createClient(url, anonKey);
    return true;
  } catch (e) {
    console.error("Gagal membuat klien Supabase:", e);
    return false;
  }
}

/* --- Muat data UMKM dari sumber yang dipilih --- */
async function loadData() {
  if (dbMode === "supabase" && supabaseClient) {
    // Mode Supabase: ambil dari tabel "umkm" di cloud
    try {
      const { data, error } = await supabaseClient.from("umkm").select("*").order("id", { ascending: true });
      if (error) throw error;
      umkmList = data || [];

      const { data: catData, error: catError } = await supabaseClient.from("categories").select("*");
      if (catError) throw catError;
      categoryList = catData || [];
    } catch (e) {
      console.error("Gagal memuat data dari Supabase:", e);
      showToast("Gagal memuat data dari Supabase. Periksa koneksi.");
      // Fallback ke data bawaan
      umkmList = JSON.parse(JSON.stringify(UMKM_DATA));
      categoryList = JSON.parse(JSON.stringify(CATEGORIES));
    }
  } else {
    // Mode localStorage: ambil dari browser
    const savedUmkm = localStorage.getItem(STORAGE_KEY_UMKM);
    const savedCats = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    umkmList = savedUmkm ? JSON.parse(savedUmkm) : JSON.parse(JSON.stringify(UMKM_DATA));
    categoryList = savedCats ? JSON.parse(savedCats) : JSON.parse(JSON.stringify(CATEGORIES));
  }
}

/* --- Simpan data UMKM ke sumber yang dipilih --- */
async function saveUmkmData(list) {
  if (dbMode === "supabase" && supabaseClient) {
    // Mode Supabase: upsert (insert or update) ke tabel "umkm"
    try {
      // Hapus semua data lama, lalu insert data baru
      await supabaseClient.from("umkm").delete().neq("id", 0);
      if (list.length > 0) {
        // PostgreSQL folds unquoted identifiers to lower‑case.
        // The table was created without quoted identifiers, so the actual column names are all lower‑case.
        // We therefore need to map our camelCase keys to lower‑case column names.
        const fieldMap = {
          id: "id",
          nama: "nama",
          kategori: "kategori",
          icon: "icon",
          deskripsi: "deskripsi",
          alamat: "alamat",
          jam: "jam",
          whatsapp: "whatsapp",
          mapsQuery: "mapsquery",
          fotoUsaha: "fotousaha",
          fotoProduk: "fotoproduk",
          latitude: "latitude",
          longitude: "longitude",
          buka: "buka"
        };

        const cleaned = list.map((rec) => {
          const obj = {};
          Object.keys(fieldMap).forEach((srcKey) => {
            if (rec[srcKey] !== undefined) {
              obj[fieldMap[srcKey]] = rec[srcKey];
            }
          });
          return obj;
        });

        const { error, data } = await supabaseClient.from("umkm").insert(cleaned);
        if (error) throw error;
        console.log("Inserted UMKM rows:", data);
      }
    } catch (e) {
      console.error("Gagal menyimpan UMKM ke Supabase:", e);
      // Show detailed error information (including full error object)
      const msg = e.message ? `Gagal menyimpan ke Supabase: ${e.message}` : `Gagal menyimpan ke Supabase: ${JSON.stringify(e)}`;
      showToast(msg);
      return false;
    }
  } else {
    // Mode localStorage: simpan di browser, but catch quota errors
    try {
      localStorage.setItem(STORAGE_KEY_UMKM, JSON.stringify(list));
    } catch (e) {
      console.error("Gagal menyimpan UMKM ke localStorage:", e);
      showToast("Gagal menyimpan data (quota penuh). Periksa ukuran foto.");
      return false;
    }
  }
  return true;
}

/* --- Simpan data kategori ke sumber yang dipilih --- */
async function saveCategoryData(list) {
  if (dbMode === "supabase" && supabaseClient) {
    try {
      await supabaseClient.from("categories").delete().neq("id", "");
      if (list.length > 0) {
        const { error, data } = await supabaseClient.from("categories").insert(list);
        if (error) throw error;
        console.log("Inserted categories rows:", data);
      }
    } catch (e) {
      // Log full Supabase error details for debugging
      console.error(
        "Gagal menyimpan kategori ke Supabase:",
        e,
        e.message,
        e.details,
        e.hint,
        JSON.stringify(e, null, 2)
      );
      // Specific handling for RLS errors on categories
      if (e.code === "42501") {
        showToast("RLS aktif pada tabel categories – nonaktifkan RLS atau buat policy INSERT di Supabase Dashboard.");
      } else {
        const msg = e.message ? `Gagal menyimpan kategori ke Supabase: ${e.message}` : `Gagal menyimpan kategori ke Supabase: ${JSON.stringify(e)}`;
        showToast(msg);
      }
      return false;
    }
  } else {
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(list));
  }
  return true;
}


/* ============================================================
   BAGIAN 4: LOGIN — Gerbang PIN Sederhana
   ------------------------------------------------------------
   Cek PIN, simpan session di sessionStorage (hilang saat
   tab ditutup). Ini bukan keamanan tingkat produksi.
   ============================================================ */

function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

function showShell() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("adminShell").classList.add("open");
  renderTable();
  updateStats();
  updateDbModeBadge();
}

function showLogin() {
  document.getElementById("loginScreen").style.display = "grid";
  document.getElementById("adminShell").classList.remove("open");
  document.getElementById("pinInput").value = "";
  document.getElementById("loginError").textContent = "";
}


/* ============================================================
   BAGIAN 5: STATISTIK — Kartu Ringkasan Dashboard
   ------------------------------------------------------------
   Menghitung total UMKM, jumlah kategori, jumlah buka/tutup,
   lalu menampilkan angka di kartu statistik di atas tabel.
   ============================================================ */

function updateStats() {
  const total = umkmList.length;
  const categories = categoryList.length;
  const open = umkmList.filter((u) => u.buka).length;
  const closed = total - open;

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statCategories").textContent = categories;
  document.getElementById("statOpen").textContent = open;
  document.getElementById("statClosed").textContent = closed;
}

/* --- Update badge mode database di toolbar --- */
function updateDbModeBadge() {
  const badge = document.getElementById("dbModeBadge");
  if (dbMode === "supabase") {
    badge.textContent = "Mode: Supabase (cloud)";
    badge.classList.add("supabase");
  } else {
    badge.textContent = "Mode: localStorage";
    badge.classList.remove("supabase");
  }
}


/* ============================================================
   BAGIAN 6: TABEL — Render Daftar UMKM
   ------------------------------------------------------------
   Menampilkan semua UMKM dalam tabel HTML dengan tombol
   edit dan hapus per baris.
   ============================================================ */

function categoryLabel(id) {
  const c = categoryList.find((c) => c.id === id);
  return c ? `${c.icon} ${c.label}` : id;
}

function renderTable() {
  const adminTableBody = document.getElementById("adminTableBody");
  const adminEmpty = document.getElementById("adminEmpty");

  // Apply admin search filter if any
  const filtered = adminSearchTerm
    ? umkmList.filter((u) => {
        const q = adminSearchTerm.trim().toLowerCase();
        return (
          (u.nama || "").toLowerCase().includes(q) ||
          (u.alamat || "").toLowerCase().includes(q) ||
          (u.kategori || "").toLowerCase().includes(q)
        );
      })
    : umkmList;

  if (filtered.length === 0) {
    adminTableBody.innerHTML = "";
    adminEmpty.style.display = "block";
    return;
  }
  adminEmpty.style.display = "none";

  adminTableBody.innerHTML = filtered
    .map(
      (u) => `
    <tr>
      <td class="admin-cell-icon">${u.icon || "🏬"}</td>
      <td class="admin-cell-name">${u.nama}</td>
      <td><span class="tag">${categoryLabel(u.kategori)}</span></td>
      <td>${u.alamat}</td>
      <td><span class="tag ${u.buka ? "status-buka" : "status-tutup"}">${u.buka ? "Buka" : "Tutup"}</span></td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" title="Edit" data-edit="${u.id}">✏️</button>
          <button class="icon-btn danger" title="Hapus" data-delete="${u.id}">🗑️</button>
        </div>
      </td>
    </tr>`
    )
    .join("");

  // Pasang event listener untuk tombol edit dan hapus
  adminTableBody.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () => openUmkmForm(Number(btn.dataset.edit)))
  );
  adminTableBody.querySelectorAll("[data-delete]").forEach((btn) =>
    btn.addEventListener("click", () => deleteUmkm(Number(btn.dataset.delete)))
  );
}


/* ============================================================
   BAGIAN 7: FORM UMKM — Tambah / Edit Data UMKM
   ------------------------------------------------------------
   Form modal untuk menambah atau mengubah data UMKM.
   Jika id dikirim = mode edit. Jika tidak = mode tambah.

   FIELD BARU:
   - fotoUsaha  : URL gambar usaha (opsional)
   - fotoProduk : URL gambar produk (opsional)
   - latitude   : koordinat GPS (opsional)
   - longitude  : koordinat GPS (opsional)
   ============================================================ */

function fillCategorySelect() {
  const select = document.getElementById("fKategori");
  select.innerHTML = categoryList
    .map((c) => `<option value="${c.id}">${c.icon} ${c.label}</option>`)
    .join("");
}

function openUmkmForm(id) {
  fillCategorySelect();
  const umkmForm = document.getElementById("umkmForm");
  umkmForm.reset();
  document.getElementById("fBuka").checked = true;

  if (id) {
    // Mode edit: isi form dengan data yang ada
    const u = umkmList.find((x) => x.id === id);
    if (!u) return;
    document.getElementById("umkmModalTitle").textContent = "Edit UMKM";
    document.getElementById("umkmId").value = u.id;
    document.getElementById("fNama").value = u.nama;
    document.getElementById("fKategori").value = u.kategori;
    document.getElementById("fIcon").value = u.icon || "";
    document.getElementById("fDeskripsi").value = u.deskripsi;
    document.getElementById("fAlamat").value = u.alamat;
    document.getElementById("fJam").value = u.jam;
    document.getElementById("fWhatsapp").value = u.whatsapp;
    document.getElementById("fMapsQuery").value = u.mapsQuery;
    // Field baru: foto & GPS
    document.getElementById("fFotoUsaha").value = u.fotoUsaha || "";
    document.getElementById("fFotoProduk").value = u.fotoProduk || "";
    document.getElementById("fLatitude").value = u.latitude || "";
    document.getElementById("fLongitude").value = u.longitude || "";
    document.getElementById("fBuka").checked = !!u.buka;
  } else {
    // Mode tambah: form kosong
    document.getElementById("umkmModalTitle").textContent = "Tambah UMKM";
    document.getElementById("umkmId").value = "";
  }

  document.getElementById("umkmModalBackdrop").classList.add("open");
}

function closeUmkmForm() {
  document.getElementById("umkmModalBackdrop").classList.remove("open");
}

async function handleUmkmSubmit(e) {
  e.preventDefault();

  const idVal = document.getElementById("umkmId").value;
  const record = {
    id: idVal ? Number(idVal) : Date.now(),
    nama: document.getElementById("fNama").value.trim(),
    kategori: document.getElementById("fKategori").value,
    icon: document.getElementById("fIcon").value.trim() || "🏬",
    deskripsi: document.getElementById("fDeskripsi").value.trim(),
    alamat: document.getElementById("fAlamat").value.trim(),
    jam: document.getElementById("fJam").value.trim(),
    whatsapp: document.getElementById("fWhatsapp").value.trim().replace(/\D/g, ""),
    mapsQuery: document.getElementById("fMapsQuery").value.trim(),
    // Field baru: foto & GPS (disimpan walau kosong)
    fotoUsaha: document.getElementById("fFotoUsaha").value.trim(),
    fotoProduk: document.getElementById("fFotoProduk").value.trim(),
    latitude: document.getElementById("fLatitude").value.trim(),
    longitude: document.getElementById("fLongitude").value.trim(),
    buka: document.getElementById("fBuka").checked,
  };

  if (idVal) {
    // Edit: ganti data lama dengan yang baru
    umkmList = umkmList.map((u) => (u.id === record.id ? record : u));
    showToast("Perubahan disimpan.");
  } else {
    // Tambah: tambahkan ke daftar
    umkmList = [...umkmList, record];
    showToast("UMKM baru ditambahkan.");
  }

  const saved = await saveUmkmData(umkmList);
  if (!saved) {
    // If saving failed (e.g., quota exceeded), keep modal open for user to correct
    showToast("Gagal menyimpan data. Periksa ukuran foto atau kuota localStorage.");
    return;
  }
  renderTable();
  updateStats();
  closeUmkmForm();
}

async function deleteUmkm(id) {
  const u = umkmList.find((x) => x.id === id);
  if (!u) return;
  if (!confirm(`Hapus "${u.nama}" dari katalog?`)) return;
  umkmList = umkmList.filter((x) => x.id !== id);
  await saveUmkmData(umkmList);
  renderTable();
  updateStats();
  showToast("UMKM dihapus.");
}


/* ============================================================
   BAGIAN 8: KATEGORI — Kelola Kategori
   ------------------------------------------------------------
   Modal untuk menambah, mengubah, atau menghapus kategori.
   Perubahan disimpan ke localStorage atau Supabase.
   ============================================================ */

function renderCategoryManager() {
  const categoryManagerList = document.getElementById("categoryManagerList");
  categoryManagerList.innerHTML = categoryList
    .map(
      (c, i) => `
    <div class="category-row" data-idx="${i}">
      <input type="text" class="cat-icon-input" value="${c.icon}" data-field="icon" maxlength="4" />
      <input type="text" value="${c.label}" data-field="label" />
      <button type="button" class="icon-btn danger" data-remove-cat="${i}" title="Hapus kategori">🗑️</button>
    </div>`
    )
    .join("");

  // Event listener untuk tombol hapus kategori
  categoryManagerList.querySelectorAll("[data-remove-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.removeCat);
      categoryList.splice(idx, 1);
      renderCategoryManager();
    });
  });
}

async function saveCategories() {
  const rows = document.querySelectorAll(".category-row");
  const updated = [];
  rows.forEach((row, i) => {
    const icon = row.querySelector('[data-field="icon"]').value.trim() || "🏷️";
    const label = row.querySelector('[data-field="label"]').value.trim() || "Kategori";
    const existing = categoryList[i];
    updated.push({
      id: existing ? existing.id : "kategori-" + Date.now() + "-" + i,
      label,
      icon,
    });
  });
  categoryList = updated;
  await saveCategoryData(categoryList);
  renderTable();
  updateStats();
  showToast("Kategori disimpan.");
}


/* ============================================================
   BAGIAN 9: PENGATURAN DATABASE — Modal Pilih Mode
   ------------------------------------------------------------
   Admin bisa beralih antara localStorage dan Supabase.
   Pengaturan disimpan di localStorage browser ini.
   ============================================================ */

function openDbSettings() {
  // Isi form dengan pengaturan yang tersimpan
  const settings = JSON.parse(localStorage.getItem(STORAGE_KEY_DB_SETTINGS) || "{}");

  // Pilih radio button sesuai mode
  const mode = settings.mode || "local";
  document.querySelector(`input[name="dbMode"][value="${mode}"]`).checked = true;

  // Isi field Supabase jika ada
  document.getElementById("supabaseUrl").value = settings.url || "";
  document.getElementById("supabaseKey").value = settings.key || "";

  // Tampilkan/sembunyikan field Supabase sesuai mode
  toggleSupabaseFields(mode);

  document.getElementById("dbModalBackdrop").classList.add("open");
}

function closeDbSettings() {
  document.getElementById("dbModalBackdrop").classList.remove("open");
}

/* --- Tampilkan/sembunyikan field Supabase berdasarkan mode --- */
function toggleSupabaseFields(mode) {
  const show = mode === "supabase";
  document.getElementById("supabaseFields").style.display = show ? "block" : "none";
  document.getElementById("supabaseKeyField").style.display = show ? "block" : "none";
}

/* --- Tes koneksi Supabase --- */
async function testSupabaseConnection() {
  const url = document.getElementById("supabaseUrl").value.trim();
  const key = document.getElementById("supabaseKey").value.trim();

  if (!url || !key) {
    showToast("Isi URL dan Anon Key dulu.");
    return;
  }

  showToast("Menghubungkan ke Supabase...");

  const ok = initSupabase(url, key);
  if (!ok) {
    showToast("Gagal membuat koneksi. Periksa URL dan Key.");
    return;
  }

  try {
    // Coba ambil 1 baris dari tabel "umkm" untuk tes koneksi
    const { data, error } = await supabaseClient.from("umkm").select("*").limit(1);
    if (error) throw error;
    showToast("✅ Koneksi berhasil! Tabel 'umkm' ditemukan.");
  } catch (e) {
    console.error("Tes koneksi gagal:", e);
    showToast("❌ Koneksi gagal. Pastikan tabel 'umkm' sudah dibuat. Lihat README.md.");
  }
}

/* --- Simpan pengaturan database --- */
async function saveDbSettings() {
  const mode = document.querySelector('input[name="dbMode"]:checked').value;
  const url = document.getElementById("supabaseUrl").value.trim();
  const key = document.getElementById("supabaseKey").value.trim();

  if (mode === "supabase" && (!url || !key)) {
    showToast("Isi URL dan Anon Key Supabase.");
    return;
  }

  // Simpan pengaturan ke localStorage
  localStorage.setItem(
    STORAGE_KEY_DB_SETTINGS,
    JSON.stringify({ mode, url, key })
  );

  // Terapkan mode baru
  dbMode = mode;
  if (mode === "supabase") {
    initSupabase(url, key);
    // Auto‑push existing local data to Supabase after switching mode
    await pushLocalDataToSupabase();
  } else {
    supabaseClient = null;
  }

  // Muat ulang data dari sumber baru
  await loadData();
  renderTable();
  updateStats();
  updateDbModeBadge();
  closeDbSettings();

  showToast(mode === "supabase" ? "Mode Supabase aktif." : "Mode localStorage aktif.");
}

/* -----------------------------------------------------------
   PUSH LOCAL DATA TO SUPABASE
   -----------------------------------------------------------
   After switching to Supabase mode we want to make sure any
   existing data stored locally (in localStorage) is uploaded to
   the Supabase tables. This function is called from
   `saveDbSettings()` (line 579) and from the manual “Sync” button
   in the UI (if added later). It reads the UMKM and category data
   from localStorage, then uses the existing `saveUmkmData` and
   `saveCategoryData` helpers to write them to Supabase.
   Errors are reported via toast messages for the admin user.
----------------------------------------------------------- */
async function pushLocalDataToSupabase() {
  if (!supabaseClient) {
    showToast("Koneksi Supabase belum dibuat.");
    return;
  }
  try {
    const savedUmkm = localStorage.getItem(STORAGE_KEY_UMKM);
    const savedCats = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    const umkm = savedUmkm ? JSON.parse(savedUmkm) : [];
    const cats = savedCats ? JSON.parse(savedCats) : [];
    // Use existing helper functions to persist data
    await saveUmkmData(umkm);
    await saveCategoryData(cats);
    showToast("Data lokal berhasil dipush ke Supabase.");
  } catch (e) {
    console.error("Gagal push data lokal ke Supabase:", e);
    showToast("Gagal push data lokal ke Supabase.");
  }
}

/* ============================================================
   BAGIAN 10: PENGATURAN BANNER — Atur Gambar Banner Website
   ------------------------------------------------------------
   Admin bisa mengatur gambar banner yang tampil di halaman utama.
   - URL gambar: upload ke hosting gratis lalu paste URL
   - Aktif/nonaktif: toggle untuk menampilkan gambar atau SVG default

   Data banner disimpan di localStorage dan juga di data.js
   untuk deploy permanen.
   ============================================================ */

/* --- Buka modal pengaturan banner --- */
function openBannerSettings() {
  // Muat pengaturan banner dari localStorage
  const saved = localStorage.getItem(STORAGE_KEY_BANNER);
  const banner = saved ? JSON.parse(saved) : { gambar: "", aktif: false };

  document.getElementById("bannerUrl").value = banner.gambar || "";
  document.getElementById("bannerAktif").checked = banner.aktif || false;

  document.getElementById("bannerModalBackdrop").classList.add("open");
}

/* --- Tutup modal pengaturan banner --- */
function closeBannerSettings() {
  document.getElementById("bannerModalBackdrop").classList.remove("open");
}

/* --- Simpan pengaturan banner --- */
function saveBannerSettings() {
  const gambar = document.getElementById("bannerUrl").value.trim();
  const aktif = document.getElementById("bannerAktif").checked;

  // Simpan ke localStorage
  localStorage.setItem(
    STORAGE_KEY_BANNER,
    JSON.stringify({ gambar, aktif })
  );

  closeBannerSettings();
  showToast("Pengaturan banner disimpan.");
}


/* ============================================================
   BAGIAN 11: PENGATURAN TEKS — Edit Teks Website
   ------------------------------------------------------------
   Admin bisa mengedit semua teks yang tampil di halaman publik.
   Teks disimpan di localStorage dan bisa di-export ke data.js.
   ============================================================ */

/* --- Buka modal pengaturan teks --- */
function openTextSettings() {
  // Muat teks yang tersimpan dari localStorage
  const saved = localStorage.getItem(STORAGE_KEY_TEXT);
  const text = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(SITE_TEXT));

  // Isi form dengan data yang ada
  document.getElementById("tHeroEyebrow").value = text.heroEyebrow || "";
  document.getElementById("tHeroTitle").value = text.heroTitle || "";
  document.getElementById("tHeroDesc").value = text.heroDesc || "";
  document.getElementById("tSearchPlaceholder").value = text.searchPlaceholder || "";
  document.getElementById("tStat1").value = text.stat1 || "";
  document.getElementById("tStat2").value = text.stat2 || "";
  document.getElementById("tStat3").value = text.stat3 || "";
  document.getElementById("tKategoriHeading").value = text.kategoriHeading || "";
  document.getElementById("tKatalogHeading").value = text.katalogHeading || "";
  document.getElementById("tAboutEyebrow").value = text.aboutEyebrow || "";
  document.getElementById("tAboutTitle").value = text.aboutTitle || "";
  document.getElementById("tAboutDesc").value = text.aboutDesc || "";
  document.getElementById("tAboutPoint1Title").value = text.aboutPoint1Title || "";
  document.getElementById("tAboutPoint2Title").value = text.aboutPoint2Title || "";
  document.getElementById("tAboutPoint1Desc").value = text.aboutPoint1Desc || "";
  document.getElementById("tAboutPoint2Desc").value = text.aboutPoint2Desc || "";
  document.getElementById("tAboutPoint3Title").value = text.aboutPoint3Title || "";
  document.getElementById("tAboutPoint3Desc").value = text.aboutPoint3Desc || "";
  document.getElementById("tAdminNote").value = text.adminNote || "";
  document.getElementById("tFooterText").value = text.footerText || "";

  document.getElementById("textModalBackdrop").classList.add("open");
}

/* --- Tutup modal pengaturan teks --- */
function closeTextSettings() {
  document.getElementById("textModalBackdrop").classList.remove("open");
}

/* --- Simpan pengaturan teks --- */
// Updated to also sync site text to Supabase when in that mode
async function saveTextSettings() {
  const text = {
    heroEyebrow: document.getElementById("tHeroEyebrow").value.trim(),
    heroTitle: document.getElementById("tHeroTitle").value.trim(),
    heroDesc: document.getElementById("tHeroDesc").value.trim(),
    searchPlaceholder: document.getElementById("tSearchPlaceholder").value.trim(),
    stat1: document.getElementById("tStat1").value.trim(),
    stat2: document.getElementById("tStat2").value.trim(),
    stat3: document.getElementById("tStat3").value.trim(),
    kategoriHeading: document.getElementById("tKategoriHeading").value.trim(),
    katalogHeading: document.getElementById("tKatalogHeading").value.trim(),
    aboutEyebrow: document.getElementById("tAboutEyebrow").value.trim(),
    aboutTitle: document.getElementById("tAboutTitle").value.trim(),
    aboutDesc: document.getElementById("tAboutDesc").value.trim(),
    aboutPoint1Title: document.getElementById("tAboutPoint1Title").value.trim(),
    aboutPoint2Title: document.getElementById("tAboutPoint2Title").value.trim(),
    aboutPoint1Desc: document.getElementById("tAboutPoint1Desc").value.trim(),
    aboutPoint2Desc: document.getElementById("tAboutPoint2Desc").value.trim(),
    aboutPoint3Title: document.getElementById("tAboutPoint3Title").value.trim(),
    aboutPoint3Desc: document.getElementById("tAboutPoint3Desc").value.trim(),
    adminNote: document.getElementById("tAdminNote").value.trim(),
    footerText: document.getElementById("tFooterText").value.trim(),
  };

  // Simpan ke localStorage (fallback for the public page)
  localStorage.setItem(STORAGE_KEY_TEXT, JSON.stringify(text));

  // Jika mode Supabase aktif, sinkronkan ke tabel app_settings
  if (dbMode === "supabase" && supabaseClient) {
    try {
      await supabaseClient.from("app_settings").upsert({ key: "site_text", value: text });
    } catch (e) {
      console.error("Failed to sync site text to Supabase:", e);
      showToast("Gagal menyimpan teks ke Supabase, tetap disimpan lokal.");
    }
  }

  closeTextSettings();
  // Inform admin that the public page needs a refresh to reflect changes
  showToast("Teks website berhasil diperbarui. Refresh halaman publik untuk melihat perubahan.");
}


/* ============================================================
   BAGIAN 12: PENGADUAN & SARAN — Kelola Pesan Pengunjung
   ------------------------------------------------------------
   Admin bisa melihat daftar pengaduan/saran dari pengunjung,
   menandai sebagai dibaca, dan menghapus pesan.
   ============================================================ */

/* --- Buka modal pengaduan --- */
function openPengaduan() {
  renderPengaduanList();
  document.getElementById("pengaduanModalBackdrop").classList.add("open");
}

/* -----------------------------------------------------------
   Image compression and preview for direct upload
   ----------------------------------------------------------- */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > height) {
        if (width > MAX_IMAGE_DIM) {
          height = Math.round((height * MAX_IMAGE_DIM) / width);
          width = MAX_IMAGE_DIM;
        }
      } else {
        if (height > MAX_IMAGE_DIM) {
          width = Math.round((width * MAX_IMAGE_DIM) / height);
          height = MAX_IMAGE_DIM;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(blob);
        },
        "image/jpeg",
        IMAGE_QUALITY
      );
    };
    img.onerror = reject;
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function handleFileUpload(fileInputId, previewDivId, targetInputId) {
  const fileInput = document.getElementById(fileInputId);
  const previewDiv = document.getElementById(previewDivId);
  const targetInput = document.getElementById(targetInputId);
  if (!fileInput) return;
  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      // Show preview
      previewDiv.innerHTML = `<img src="${dataUrl}" style="max-width:200px; max-height:200px;" />`;
      // Set hidden URL field to base64 data URL
      if (targetInput) targetInput.value = dataUrl;
      showToast("Foto berhasil di‑upload dan diperkecil.");
    } catch (err) {
      console.error(err);
      showToast("Gagal memproses foto.");
    }
  });
}

/* --- Tutup modal pengaduan --- */
function closePengaduan() {
  document.getElementById("pengaduanModalBackdrop").classList.remove("open");
}

/* --- Render daftar pengaduan --- */
function renderPengaduanList() {
  const list = JSON.parse(localStorage.getItem(STORAGE_KEY_PENGADUAN) || "[]");
  const container = document.getElementById("pengaduanAdminList");

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px 20px; color:var(--ink-soft);">
        <div style="font-size:2rem; margin-bottom:10px;">📭</div>
        <p>Belum ada pengaduan atau saran.</p>
      </div>
    `;
    return;
  }

  // Urutkan dari yang terbaru
  list.sort((a, b) => b.id - a.id);

  container.innerHTML = list
    .map((item, index) => {
      const jenisLabel = item.jenis === "pengaduan" ? "🔴 Pengaduan" : item.jenis === "saran" ? "💡 Saran" : "📝 Masukan";
      const jenisColor = item.jenis === "pengaduan" ? "#B3261E" : item.jenis === "saran" ? "#1A8A7E" : "#C98F00";
      const tanggal = new Date(item.tanggal).toLocaleString("id-ID");

      return `
        <div style="
          padding: 16px;
          margin-bottom: 12px;
          background: ${item.dibaca ? "var(--paper)" : "var(--leaf-tint)"};
          border: 1px solid var(--line);
          border-radius: var(--radius-sm);
          border-left: 4px solid ${item.dibaca ? "var(--line)" : "var(--marigold)"};
        ">
          <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
            <div>
              <strong>${item.nama}</strong>
              <span style="font-size:0.75rem; color:var(--ink-soft); margin-left:8px;">${item.kontak}</span>
            </div>
            <span style="
              font-size:0.7rem;
              font-weight:700;
              padding: 3px 10px;
              border-radius: 999px;
              background: ${item.jenis === "pengaduan" ? "#FBEAEA" : item.jenis === "saran" ? "#E0F7F5" : "#FFF8E1"};
              color: ${jenisColor};
            ">${jenisLabel}</span>
          </div>
          <p style="margin: 8px 0; font-size:0.92rem; color:var(--ink);">${item.pesan}</p>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
            <span style="font-size:0.75rem; color:var(--ink-soft);">${tanggal}</span>
            <div style="display:flex; gap:8px;">
              ${!item.dibaca ? `<button class="btn btn-sm btn-outline" onclick="markAsRead(${item.id})">✓ Tandai Dibaca</button>` : ""}
              <button class="btn btn-sm btn-outline" style="color:#B3261E; border-color:#B3261E;" onclick="deletePengaduan(${item.id})">🗑️ Hapus</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

/* --- Tandai pengaduan sebagai dibaca --- */
function markAsRead(id) {
  const list = JSON.parse(localStorage.getItem(STORAGE_KEY_PENGADUAN) || "[]");
  const updated = list.map((item) => (item.id === id ? { ...item, dibaca: true } : item));
  localStorage.setItem(STORAGE_KEY_PENGADUAN, JSON.stringify(updated));
  renderPengaduanList();
  showToast("Pesan ditandai sebagai dibaca.");
}

/* --- Hapus pengaduan --- */
function deletePengaduan(id) {
  if (!confirm("Hapus pesan ini?")) return;
  const list = JSON.parse(localStorage.getItem(STORAGE_KEY_PENGADUAN) || "[]");
  const updated = list.filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY_PENGADUAN, JSON.stringify(updated));
  renderPengaduanList();
  showToast("Pesan dihapus.");
}


/* ============================================================
   BAGIAN 11: EXPORT — Unduh File data.js
   ------------------------------------------------------------
   Membuat file data.js berisi data UMKM, kategori, dan banner
   saat ini, lalu mengunduhnya. File ini bisa diunggah ke hosting
   untuk mengganti data.js bawaan sehingga perubahan
   tersimpan permanen untuk semua pengunjung.
   ============================================================ */

function buildDataJsFile() {
  const catStr = JSON.stringify(categoryList, null, 2);
  const umkmStr = JSON.stringify(umkmList, null, 2);

  // Sertakan pengaturan banner dalam export
  const savedBanner = localStorage.getItem(STORAGE_KEY_BANNER);
  const banner = savedBanner ? JSON.parse(savedBanner) : { gambar: "", aktif: false };
  const bannerStr = JSON.stringify(banner, null, 2);

  // Sertakan teks website dalam export
  const savedText = localStorage.getItem(STORAGE_KEY_TEXT);
  const text = savedText ? JSON.parse(savedText) : JSON.parse(JSON.stringify(SITE_TEXT));
  const textStr = JSON.stringify(text, null, 2);

  return `/* ============================================================
   FEIFH Link — data dasar (seed data)
   File ini diunduh dari panel admin pada ${new Date().toLocaleString("id-ID")}.
   Unggah/timpa file data.js di hosting Anda dengan file ini agar
   perubahan tampil untuk semua pengunjung, di semua perangkat.
   ============================================================ */

const CATEGORIES = ${catStr};

// Data banner website — bisa diubah lewat panel admin > Pengaturan Banner
const BANNER = ${bannerStr};

// Data teks website — bisa diubah lewat panel admin > Teks Website
const SITE_TEXT = ${textStr};

const UMKM_DATA = ${umkmStr};
`;
}


/* ============================================================
   BAGIAN 12: TOAST — Notifikasi Kecil
   ------------------------------------------------------------
   Menampilkan pesan singkat di bawah layar yang hilang
   otomatis setelah 2.4 detik.
   ============================================================ */

let toastTimer;
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}


/* ============================================================
   BAGIAN 13: INISIALISASI & EVENT LISTENERS
   ------------------------------------------------------------
   Bagian ini dijalankan saat halaman selesai dimuat.
   ============================================================ */

// Muat pengaturan database & data saat halaman dibuka
loadDbSettings();
loadData().then(() => {
  // Jika sudah login (session aktif), tampilkan dashboard
  if (isLoggedIn()) {
    showShell();
  }
});

// --- Helper: compute SHA‑256 hash of a string and return hex ---
// Uses Web Crypto API when available; otherwise falls back to a pure‑JS implementation.
async function computeHashHex(str) {
  // If the SubtleCrypto API is available (HTTPS or localhost), use it.
  if (typeof crypto !== "undefined" && crypto.subtle && crypto.subtle.digest) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback: simple JavaScript SHA‑256 implementation (public domain).
  // Source: https://geraintluff.github.io/sha256/ (adapted).
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

  // Convert string to UTF‑8 bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const l = data.length * 8;
  const withOne = new Uint8Array(data.length + 1);
  withOne.set(data);
  withOne[data.length] = 0x80; // append '1' bit
  // Pad with zeros until length ≡ 448 (mod 512)
  const zeroPadLength = (64 - ((withOne.length + 8) % 64)) % 64;
  const padded = new Uint8Array(withOne.length + zeroPadLength + 8);
  padded.set(withOne);
  // Append length as 64‑bit big‑endian integer
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(l / 0x100000000), false);
  view.setUint32(padded.length - 4, l >>> 0, false);

  const w = new Uint32Array(64);
  for (let i = 0; i < padded.length; i += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }
  // Convert H values to hex string
  return H.map(h => h.toString(16).padStart(8, "0")).join("");
}

// --- Login form ---
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const pinInput = document.getElementById("pinInput");
  const loginError = document.getElementById("loginError");
  const enteredHash = await computeHashHex(pinInput.value);
  if (enteredHash === ADMIN_PIN_HASH) {
    sessionStorage.setItem(SESSION_KEY, "1");
    showShell();
  } else {
    loginError.textContent = "PIN salah. Coba lagi.";
    pinInput.value = "";
    pinInput.focus();
  }
});

// --- Logout ---
document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  showLogin();
});

// --- Tombol Tambah UMKM ---
document.getElementById("addUmkmBtn").addEventListener("click", () => openUmkmForm(null));

// --- Tombol batal & backdrop form UMKM ---
document.getElementById("umkmCancelBtn").addEventListener("click", closeUmkmForm);
document.getElementById("umkmModalBackdrop").addEventListener("click", (e) => {
  if (e.target === document.getElementById("umkmModalBackdrop")) closeUmkmForm();
});

// --- Submit form UMKM ---
document.getElementById("umkmForm").addEventListener("submit", handleUmkmSubmit);

// --- Tombol Kelola Kategori ---
document.getElementById("manageCatBtn").addEventListener("click", () => {
  renderCategoryManager();
  document.getElementById("catModalBackdrop").classList.add("open");
});

// --- Tombol batal & backdrop Kelola Kategori ---
document.getElementById("catCancelBtn").addEventListener("click", () => {
  // Reset kategori ke yang tersimpan
  const saved = localStorage.getItem(STORAGE_KEY_CATEGORIES);
  categoryList = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(CATEGORIES));
  document.getElementById("catModalBackdrop").classList.remove("open");
});

document.getElementById("catModalBackdrop").addEventListener("click", (e) => {
  if (e.target === document.getElementById("catModalBackdrop")) {
    const saved = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    categoryList = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(CATEGORIES));
    document.getElementById("catModalBackdrop").classList.remove("open");
  }
});

// --- Tombol tambah kategori baru ---
document.getElementById("addCategoryBtn").addEventListener("click", () => {
  categoryList.push({ id: "kategori-" + Date.now(), label: "Kategori Baru", icon: "🏷️" });
  renderCategoryManager();
});

// --- Tombol simpan kategori ---
document.getElementById("catSaveBtn").addEventListener("click", saveCategories);

// --- Tombol Pengaturan Database ---
document.getElementById("dbSettingsBtn").addEventListener("click", openDbSettings);
document.getElementById("dbCancelBtn").addEventListener("click", closeDbSettings);
document.getElementById("dbModalBackdrop").addEventListener("click", (e) => {
  if (e.target === document.getElementById("dbModalBackdrop")) closeDbSettings();
});

// --- Radio button mode database (tampilkan/sembunyikan field Supabase) ---
document.querySelectorAll('input[name="dbMode"]').forEach((radio) => {
  radio.addEventListener("change", () => toggleSupabaseFields(radio.value));
});

// --- Tombol tes koneksi Supabase ---
document.getElementById("dbTestBtn").addEventListener("click", testSupabaseConnection);

// --- Tombol simpan pengaturan database ---
document.getElementById("dbSaveBtn").addEventListener("click", saveDbSettings);

// --- Tombol Pengaturan Banner ---
document.getElementById("bannerSettingsBtn").addEventListener("click", openBannerSettings);
document.getElementById("bannerCancelBtn").addEventListener("click", closeBannerSettings);
document.getElementById("bannerModalBackdrop").addEventListener("click", (e) => {
  if (e.target === document.getElementById("bannerModalBackdrop")) closeBannerSettings();
});
document.getElementById("bannerSaveBtn").addEventListener("click", saveBannerSettings);

// --- Tombol Pengaturan Teks ---
document.getElementById("textSettingsBtn").addEventListener("click", openTextSettings);
document.getElementById("textCancelBtn").addEventListener("click", closeTextSettings);
document.getElementById("textModalBackdrop").addEventListener("click", (e) => {
  if (e.target === document.getElementById("textModalBackdrop")) closeTextSettings();
});
document.getElementById("textSaveBtn").addEventListener("click", saveTextSettings);

// --- Tombol Pengaduan & Saran ---
document.getElementById("pengaduanBtn").addEventListener("click", openPengaduan);
document.getElementById("pengaduanCloseBtn").addEventListener("click", closePengaduan);
document.getElementById("pengaduanModalBackdrop").addEventListener("click", (e) => {
  if (e.target === document.getElementById("pengaduanModalBackdrop")) closePengaduan();
});
document.getElementById("pengaduanRefreshBtn").addEventListener("click", () => {
  renderPengaduanList();
  showToast("Daftar pengaduan diperbarui.");
});

// --- Admin table search input ---
const adminSearchInput = document.getElementById("adminSearchInput");
if (adminSearchInput) {
  adminSearchInput.addEventListener("input", () => {
    adminSearchTerm = adminSearchInput.value;
    renderTable();
  });
}

// --- Backup / Restore button handlers ---
const backupBtn = document.getElementById("backupBtn");
if (backupBtn) backupBtn.addEventListener("click", backupData);
const restoreBtn = document.getElementById("restoreBtn");
const restoreInput = document.getElementById("restoreInput");
if (restoreBtn && restoreInput) {
  restoreBtn.addEventListener("click", () => restoreInput.click());
  restoreInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) restoreData(file);
  });
}

// --- Scroll to Top / Bottom buttons ---
const scrollTopBtn = document.getElementById("scrollTopBtn");
const scrollBottomBtn = document.getElementById("scrollBottomBtn");
if (scrollTopBtn) {
  scrollTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}
if (scrollBottomBtn) {
  scrollBottomBtn.addEventListener("click", () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
}
window.addEventListener("scroll", () => {
  const show = window.scrollY > 200;
  if (scrollTopBtn) scrollTopBtn.style.display = show ? "block" : "none";
  if (scrollBottomBtn) scrollBottomBtn.style.display = show ? "none" : "block";
});

// Initialize file upload handlers for direct upload
handleFileUpload("fFotoUsahaFile", "fFotoUsahaPreview", "fFotoUsaha");
handleFileUpload("fFotoProdukFile", "fFotoProdukPreview", "fFotoProduk");

  // Initial badge update (if badge element exists)
  updatePengaduanBadge();

// --- Tombol unduh data.js ---
document.getElementById("exportBtn").addEventListener("click", () => {
  const content = buildDataJsFile();
  const blob = new Blob([content], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data.js";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("data.js diunduh — unggah ke hosting untuk publikasikan.");
});

/**
 * Backup current data (UMKM, categories, banner, site text, pengaduan) to a JSON file.
 * Triggered by the Backup button in the admin toolbar.
 */
function backupData() {
  const data = {
    umkm: umkmList,
    categories: categoryList,
    banner: JSON.parse(localStorage.getItem(STORAGE_KEY_BANNER) || "{}"),
    text: JSON.parse(localStorage.getItem(STORAGE_KEY_TEXT) || "{}"),
    pengaduan: JSON.parse(localStorage.getItem(STORAGE_KEY_PENGADUAN) || "[]"),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "feifh_backup.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Backup selesai. File diunduh.");
}

/* -----------------------------------------------------------
   SAVE APP SETTINGS (site text & banner) to Supabase
   ----------------------------------------------------------- */
async function saveAppSettings() {
  if (dbMode !== "supabase" || !supabaseClient) return true;
  try {
    const text = JSON.parse(localStorage.getItem(STORAGE_KEY_TEXT) || "{}");
    const banner = JSON.parse(localStorage.getItem(STORAGE_KEY_BANNER) || "{}");
    await supabaseClient.from("app_settings").upsert({ key: "site_text", value: text });
    await supabaseClient.from("app_settings").upsert({ key: "banner", value: banner });
    return true;
  } catch (e) {
    console.error("Failed to save app settings to Supabase:", e);
    showToast("Gagal menyimpan pengaturan situs ke Supabase.");
    return false;
  }
}

/* -----------------------------------------------------------
   SYNC TO SUPABASE – manual push of current data
   ----------------------------------------------------------- */
async function syncToSupabase(btn) {
  if (!supabaseClient) {
    showToast("Supabase belum terhubung. Atur dulu di Pengaturan Database.");
    return;
  }
  const originalText = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = "⏳ Sync...";
  }
  showToast("Menyinkronkan data ke Supabase…");
  try {
    const umkmOk = await saveUmkmData(umkmList);
    const catOk = await saveCategoryData(categoryList);
    const settingsOk = await saveAppSettings();
    if (umkmOk && catOk && settingsOk) {
      showToast("Sinkronisasi ke Supabase berhasil.");
    } else {
      showToast("Sinkronisasi ke Supabase gagal — lihat console.");
    }
  } catch (e) {
    console.error("Sync to Supabase error:", e);
    showToast("Sinkronisasi ke Supabase error.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}

/**
 * Restore data from a JSON backup file selected via the Restore button.
 * @param {File} file - The JSON file containing the backup.
 */
function restoreData(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const obj = JSON.parse(e.target.result);
      if (obj.umkm) {
        umkmList = obj.umkm;
        await saveUmkmData(umkmList);
      }
      if (obj.categories) {
        categoryList = obj.categories;
        await saveCategoryData(categoryList);
      }
      if (obj.banner) {
        localStorage.setItem(STORAGE_KEY_BANNER, JSON.stringify(obj.banner));
        // Also sync to Supabase if in that mode
        if (dbMode === "supabase" && supabaseClient) {
          try {
            await supabaseClient.from("app_settings").upsert({ key: "banner", value: obj.banner });
          } catch (e) {
            console.error("Failed to sync banner to Supabase during restore:", e);
          }
        }
      }
      if (obj.text) {
        localStorage.setItem(STORAGE_KEY_TEXT, JSON.stringify(obj.text));
        if (dbMode === "supabase" && supabaseClient) {
          try {
            await supabaseClient.from("app_settings").upsert({ key: "site_text", value: obj.text });
          } catch (e) {
            console.error("Failed to sync site text to Supabase during restore:", e);
          }
        }
      }
      if (obj.pengaduan) {
        localStorage.setItem(STORAGE_KEY_PENGADUAN, JSON.stringify(obj.pengaduan));
      }
      renderTable();
      updateStats();
      showToast("Restore selesai.");
    } catch (err) {
      console.error(err);
      showToast("Gagal restore data. Pastikan file backup valid.");
    }
  };
  reader.readAsText(file);
}

/**
 * Update the badge that shows the number of unread pengaduan messages.
 * If the badge element does not exist, the function does nothing.
 */
function updatePengaduanBadge() {
  const list = JSON.parse(localStorage.getItem(STORAGE_KEY_PENGADUAN) || "[]");
  const unread = list.filter((item) => !item.dibaca).length;
  const badge = document.getElementById("pengaduanBadge");
  if (badge) {
    badge.textContent = unread > 0 ? `(${unread})` : "";
  }
}