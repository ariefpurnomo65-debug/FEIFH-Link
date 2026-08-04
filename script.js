/* ============================================================
   FEIFH Link — interaktivitas situs publik
   Data (CATEGORIES, UMKM_DATA, BANNER, SITE_TEXT) dimuat dari
   data.js, yang harus di-load SEBELUM file ini di index.html.

   Jika Admin pernah menambah/mengubah/menghapus data lewat
   admin.html, perubahan itu tersimpan di localStorage browser
   ini dan dipakai menggantikan data bawaan dari data.js.
   ============================================================ */

const STORAGE_KEY_UMKM = "feifh_umkm_data";
const STORAGE_KEY_CATEGORIES = "feifh_categories";
const STORAGE_KEY_BANNER = "feifh_banner";
const STORAGE_KEY_TEXT = "feifh_site_text";
const STORAGE_KEY_PENGADUAN = "feifh_pengaduan";

function loadActiveData() {
  let umkm = typeof UMKM_DATA !== "undefined" ? UMKM_DATA : [];
  let categories = typeof CATEGORIES !== "undefined" ? CATEGORIES : [];
  let banner = typeof BANNER !== "undefined" ? BANNER : { gambar: "", aktif: false };
  let text = typeof SITE_TEXT !== "undefined" ? SITE_TEXT : {};
  try {
    const savedUmkm = localStorage.getItem(STORAGE_KEY_UMKM);
    const savedCats = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    const savedBanner = localStorage.getItem(STORAGE_KEY_BANNER);
    const savedText = localStorage.getItem(STORAGE_KEY_TEXT);
    if (savedUmkm) umkm = JSON.parse(savedUmkm);
    if (savedCats) categories = JSON.parse(savedCats);
    if (savedBanner) banner = JSON.parse(savedBanner);
    if (savedText) text = JSON.parse(savedText);
  } catch (e) {
    console.warn("Gagal membaca data tersimpan, memakai data bawaan.", e);
  }
  return { umkm, categories, banner, text };
}

const ACTIVE = loadActiveData();
const UMKM_DATA_ACTIVE = ACTIVE.umkm;
const CATEGORIES_ACTIVE = ACTIVE.categories;
const BANNER_ACTIVE = ACTIVE.banner;
const SITE_TEXT_ACTIVE = ACTIVE.text;

/* ---------------- state ---------------- */

let activeCategory = "all";
let searchTerm = "";

/* ---------------- DOM refs ---------------- */

const chipRow = document.getElementById("chipRow");
const grid = document.getElementById("grid");
const resultCount = document.getElementById("resultCount");
const searchInput = document.getElementById("searchInput");
const searchForm = document.getElementById("searchForm");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalContent = document.getElementById("modalContent");
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
const heroSection = document.querySelector(".hero");


/* ============================================================
   RENDER TEKS — Isi semua elemen teks dari data dinamis
   ------------------------------------------------------------
   Setiap elemen HTML yang punya ID cocok dengan key di SITE_TEXT
   akan diisi teks dari data. Ini memungkinkan admin mengubah
   teks website tanpa edit file HTML.
   ============================================================ */

function renderText() {
  const t = SITE_TEXT_ACTIVE;
  // Helper: set textContent jika elemen ada
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined) el.textContent = value;
  }
  // Helper: set placeholder jika elemen ada
  function setPlaceholder(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined) el.placeholder = value;
  }

  setText("heroEyebrow", t.heroEyebrow);
  setText("heroTitle", t.heroTitle);
  setText("heroDesc", t.heroDesc);
  setPlaceholder("searchInput", t.searchPlaceholder);
  setText("stat1", t.stat1);
  setText("stat2", t.stat2);
  setText("stat3", t.stat3);
  setText("kategoriHeading", t.kategoriHeading);
  setText("katalogHeading", t.katalogHeading);
  setText("aboutEyebrow", t.aboutEyebrow);
  setText("aboutTitle", t.aboutTitle);
  setText("aboutDesc", t.aboutDesc);
  setText("aboutPoint1Title", t.aboutPoint1Title);
  setText("aboutPoint1Desc", t.aboutPoint1Desc);
  setText("aboutPoint2Title", t.aboutPoint2Title);
  setText("aboutPoint2Desc", t.aboutPoint2Desc);
  setText("aboutPoint3Title", t.aboutPoint3Title);
  setText("aboutPoint3Desc", t.aboutPoint3Desc);
  setText("adminNote", t.adminNote);
  setText("footerText", t.footerText);
}


/* ============================================================
   BANNER — Tampilkan gambar banner di hero section
   ============================================================ */

function renderBanner() {
  if (!heroSection) return;
  if (BANNER_ACTIVE.aktif && BANNER_ACTIVE.gambar) {
    heroSection.style.backgroundImage = `url(${BANNER_ACTIVE.gambar})`;
    heroSection.style.backgroundSize = "cover";
    heroSection.style.backgroundPosition = "center";
    heroSection.style.backgroundRepeat = "no-repeat";
    const heroArt = document.querySelector(".hero-art");
    if (heroArt) heroArt.style.display = "none";
  } else {
    heroSection.style.backgroundImage = `
      radial-gradient(ellipse at 15% -10%, rgba(242,183,5,0.18), transparent 55%),
      var(--cream)
    `;
    const heroArt = document.querySelector(".hero-art");
    if (heroArt) heroArt.style.display = "block";
  }
}


/* ============================================================
   CATEGORY CHIPS — Render tombol filter kategori
   ============================================================ */

function renderChips() {
  const allChip = `
    <button class="chip ${activeCategory === "all" ? "active" : ""}" data-cat="all">
      <span class="chip-ic">✨</span> Semua
    </button>`;

  const cats = CATEGORIES_ACTIVE.map(
    (c) => `
    <button class="chip ${activeCategory === c.id ? "active" : ""}" data-cat="${c.id}">
      <span class="chip-ic">${c.icon}</span> ${c.label}
    </button>`
  ).join("");

  chipRow.innerHTML = allChip + cats;

  chipRow.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      renderChips();
      renderGrid();
    });
  });
}


/* ============================================================
   RENDER UMKM GRID — Tampilkan kartu UMKM
   ------------------------------------------------------------
   Safety: gunakan || "" untuk field foto/GPS agar data lama
   yang tidak punya field baru tidak menyebabkan error.
   ============================================================ */

function getFiltered() {
  return UMKM_DATA_ACTIVE.filter((u) => {
    const matchCat = activeCategory === "all" || u.kategori === activeCategory;
    const q = searchTerm.trim().toLowerCase();
    const matchSearch =
      !q ||
      (u.nama || "").toLowerCase().includes(q) ||
      (u.alamat || "").toLowerCase().includes(q) ||
      (u.kategori || "").toLowerCase().includes(q);
    return matchCat && matchSearch;
  });
}

function categoryLabel(id) {
  const c = CATEGORIES_ACTIVE.find((c) => c.id === id);
  return c ? c.label : id;
}

function renderGrid() {
  const results = getFiltered();
  resultCount.textContent = `${results.length} UMKM ditemukan`;

  if (results.length === 0) {
    grid.innerHTML = `
      <div class="no-results" style="grid-column: 1 / -1;">
        <div class="big">🔎</div>
        <h3>Belum ada hasil</h3>
        <p>Coba kata kunci lain atau pilih kategori berbeda.</p>
      </div>`;
    return;
  }

  grid.innerHTML = results
    .map(
      (u) => {
        // Safety: gunakan || "" untuk field yang mungkin undefined di data lama
        const fotoUsaha = u.fotoUsaha || "";
        const icon = u.icon || "🏬";
        // Use lazy loading for images: set data-src and class "lazy"
        const mediaContent = fotoUsaha
          ? `<img data-src="${fotoUsaha}" alt="${u.nama}" class="card-img lazy" onerror="this.onerror=null; this.style.display='none'; this.parentElement.insertAdjacentHTML('beforeend', '<span>${icon}</span>');" />`
          : `<span>${icon}</span>`;

        return `
    <button class="card" data-id="${u.id}" aria-label="Lihat detail ${u.nama}">
      <div class="card-media" style="background:${mediaBg(u.kategori, fotoUsaha)}">
        <span class="card-badge">${categoryLabel(u.kategori)}</span>
        <span class="card-status ${u.buka ? "" : "closed"}">${u.buka ? "Buka" : "Tutup"}</span>
        ${mediaContent}
      </div>
      <div class="card-body">
        <h3>${u.nama}</h3>
        <p class="card-desc">${u.deskripsi}</p>
        <div class="card-meta">📍 ${u.alamat}</div>
      </div>
    </button>`;
      }
    )
    .join("");

  // After rendering grid, initialize lazy loading for images
  lazyLoadImages();

  grid.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => openModal(Number(card.dataset.id)));
  });
}

/* -----------------------------------------------------------
   Lazy loading for images (data-src -> src when in viewport)
   ----------------------------------------------------------- */
function lazyLoadImages() {
  const lazyImages = document.querySelectorAll('img.lazy');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          obs.unobserve(img);
        }
      });
    });
    lazyImages.forEach((img) => observer.observe(img));
  } else {
    // Fallback: load all immediately
    lazyImages.forEach((img) => {
      img.src = img.dataset.src;
      img.classList.remove('lazy');
    });
  }
}

function mediaBg(kategori, fotoUsaha) {
  if (fotoUsaha) return "transparent";
  const map = {
    makanan: "linear-gradient(135deg,#FCEFC7,#F6DE95)",
    minuman: "linear-gradient(135deg,#DCEFE0,#B9E0C4)",
    warung: "linear-gradient(135deg,#EFE6D8,#E1D3BB)",
    jasa: "linear-gradient(135deg,#DDEBDE,#C3DCC6)",
  };
  return map[kategori] || "var(--leaf-tint)";
}


/* ============================================================
   MODAL — Tampilkan detail UMKM
   ------------------------------------------------------------
   Safety: gunakan || "" untuk field foto/GPS/latitude/longitude
   agar data lama yang tidak punya field baru tidak error.
   ============================================================ */

function openModal(id) {
  const u = UMKM_DATA_ACTIVE.find((x) => x.id === id);
  if (!u) return;

  // Safety: fallback untuk field yang mungkin undefined
  const fotoUsaha = u.fotoUsaha || "";
  const fotoProduk = u.fotoProduk || "";
  const latitude = u.latitude || "";
  const longitude = u.longitude || "";
  const mapsQuery = u.mapsQuery || u.nama || "";
  const icon = u.icon || "🏬";

  const waLink = `https://wa.me/${u.whatsapp}?text=${encodeURIComponent(
    `Halo ${u.nama}, saya melihat usaha Anda di FEIFH Link.`
  )}`;

  // Google Maps: pakai GPS jika ada, fallback ke mapsQuery
  let mapsLink;
  if (latitude && longitude) {
    mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  } else {
    mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;
  }

  const mediaContent = fotoUsaha
    ? `<img src="${fotoUsaha}" alt="${u.nama}" class="modal-img" onerror="this.onerror=null; this.style.display='none'; this.parentElement.insertAdjacentHTML('beforeend', '<span style=\\'font-size:3.4rem;\\'>${icon}</span>');" />`
    : `<span style="font-size:3.4rem;">${icon}</span>`;

  const fotoProdukHtml = fotoProduk
    ? `<div class="modal-produk"><h4>📸 Foto Produk</h4><img src="${fotoProduk}" alt="Produk ${u.nama}" class="modal-img-produk" onerror="this.onerror=null; const p=this.closest('.modal-produk'); if(p) p.style.display='none';" /></div>`
    : "";

  modalContent.innerHTML = `
    <div class="modal-media" style="background:${mediaBg(u.kategori, fotoUsaha)}">
      <button class="modal-close" id="modalCloseBtn" aria-label="Tutup">✕</button>
      ${mediaContent}
    </div>
    <div class="modal-body">
      <span class="eyebrow">${categoryLabel(u.kategori)} · ${u.buka ? "Buka sekarang" : "Sedang tutup"}</span>
      <h2>${u.nama}</h2>
      <p>${u.deskripsi}</p>
      ${fotoProdukHtml}
      <ul class="modal-info-list">
        <li><span class="ic">📍</span><span><b>Alamat</b><span class="sub">${u.alamat}</span></span></li>
        <li><span class="ic">🕒</span><span><b>Jam operasional</b><span class="sub">${u.jam}</span></span></li>
        <li><span class="ic">💬</span><span><b>Kontak</b><span class="sub">+${u.whatsapp}</span></span></li>
      </ul>
      <div class="modal-actions">
        <a class="btn btn-primary" href="${waLink}" target="_blank" rel="noopener">💬 Hubungi via WhatsApp</a>
        <a class="btn btn-outline" href="${mapsLink}" target="_blank" rel="noopener">🗺️ Lihat di Google Maps</a>
        <button class="btn btn-outline" id="shareBtn" type="button">🔗 Bagikan</button>
      </div>
    </div>
  `;

  modalBackdrop.classList.add("open");
  document.body.style.overflow = "hidden";

  document.getElementById("modalCloseBtn").addEventListener("click", closeModal);

  const shareBtn = document.getElementById("shareBtn");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const shareUrl = window.location.origin + window.location.pathname + `?umkm=${u.id}#katalog`;
      const shareData = {
        title: `${u.nama} — FEIFH Link`,
        text: `Lihat profil ${u.nama} (${categoryLabel(u.kategori)}) di FEIFH Link Katalog UMKM Kampung Suaran.`,
        url: shareUrl,
      };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (err) {
          // Shared cancelled or failed
        }
      } else {
        try {
          await navigator.clipboard.writeText(shareUrl);
          alert("Link UMKM berhasil disalin ke papan klip!");
        } catch (err) {
          alert(`Link UMKM: ${shareUrl}`);
        }
      }
    });
  }
}

function closeModal() {
  modalBackdrop.classList.remove("open");
  document.body.style.overflow = "";
}

modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

/* ---------------- search ---------------- */

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  searchTerm = searchInput.value;
  renderGrid();
  document.getElementById("katalog").scrollIntoView({ behavior: "smooth" });
});

searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value;
  renderGrid();
});

/* ---------------- mobile nav ---------------- */

navToggle.addEventListener("click", () => {
  navLinks.classList.toggle("open");
});

navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => navLinks.classList.remove("open"))
);

/* ---------------- pengaduan form ---------------- */

const pengaduanForm = document.getElementById("pengaduanForm");
if (pengaduanForm) {
  pengaduanForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const nama = document.getElementById("pNama").value.trim();
    const kontak = document.getElementById("pKontak").value.trim();
    const jenis = document.getElementById("pJenis").value;
    const pesan = document.getElementById("pPesan").value.trim();

    if (!nama || !kontak || !pesan) {
      alert("Mohon lengkapi semua field.");
      return;
    }

    const submission = {
      id: Date.now(),
      nama,
      kontak,
      jenis,
      pesan,
      tanggal: new Date().toISOString(),
      dibaca: false,
    };

    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY_PENGADUAN) || "[]");
    existing.push(submission);
    localStorage.setItem(STORAGE_KEY_PENGADUAN, JSON.stringify(existing));

    pengaduanForm.reset();
    alert("Terima kasih! Pesan Anda telah dikirim. Admin akan segera merespon.");
  });
}

/* ---------------- init ---------------- */

renderText();
renderBanner();
renderChips();
renderGrid();

/* ---------------- PWA Service Worker ---------------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

/* ---------------- Auto open modal dari URL parameter ---------------- */
const urlParams = new URLSearchParams(window.location.search);
const umkmParam = urlParams.get("umkm");
if (umkmParam) {
  openModal(Number(umkmParam));
}