# Implementation Plan: Penyesuaian PWA untuk Instalasi Aplikasi SIMAK Vokasi

Memastikan aplikasi SIMAK Vokasi dapat diinstal sebagai Progressive Web App (PWA) di perangkat pengguna (Desktop Chromium, Android, dan iOS Safari) pada lingkungan development maupun production, sehingga pengguna dapat membuka aplikasi langsung dari homescreen/layar utama alih-alih melalui browser.

---

## 1. Analisis Masalah & Kebutuhan

### Akar Masalah Saat Ini:
1. **Race Condition `beforeinstallprompt`**: Listener dipasang di `onMount()` komponen SolidJS, sementara browser menembakkan event tersebut lebih awal sebelum bundle JS selesai dimuat. Akibatnya prompt tidak pernah muncul.
2. **Konfigurasi Nginx Production**: Header `Content-Type` pada `nginx.conf` menggunakan `add_header Content-Type application/manifest+json;` yang mengakibatkan duplikasi header MIME type pada `manifest.webmanifest`.
3. **Ketiadaan Dukungan Khusus iOS Safari**: Safari di iOS tidak mendukung event `beforeinstallprompt`, sehingga pengguna iPhone/iPad memerlukan panduan visual khusus (*Share* $\rightarrow$ *Add to Home Screen*).
4. **PWA Nonaktif di Mode Development**: `vite-plugin-pwa` tidak mengaktifkan service worker di dev mode secara default tanpa `devOptions.enabled: true`.
5. **Ketiadaan Opsi Pasang Manual**: Tidak ada tombol "Pasang Aplikasi" di antarmuka utama (Sidebar/Profil) jika pengguna ingin menginstal setelah menutup prompt awal.

---

## 2. Target Files to Modify / Create

| File Path | Aksi | Deskripsi Perubahan |
| :--- | :--- | :--- |
| [apps/frontend/index.html](file:///home/nasrulhamid/app-projects/simakjs/apps/frontend/index.html) | MODIFY | Tangkap event `beforeinstallprompt` seawal mungkin via script inline di `<head>`, simpan ke `window.deferredPwaPrompt`, dan bersihkan tag manifest redundan. |
| [apps/frontend/src/pwa.d.ts](file:///home/nasrulhamid/app-projects/simakjs/apps/frontend/src/pwa.d.ts) | MODIFY | Deklarasi tipe TypeScript untuk `BeforeInstallPromptEvent`, `window.deferredPwaPrompt`, dan `navigator.standalone`. |
| [apps/frontend/vite.config.ts](file:///home/nasrulhamid/app-projects/simakjs/apps/frontend/vite.config.ts) | MODIFY | Aktifkan `devOptions: { enabled: true }` dan lengkapi manifest metadata (`id`, `theme_color`, `categories`, `shortcuts`). |
| [apps/frontend/nginx.conf](file:///home/nasrulhamid/app-projects/simakjs/apps/frontend/nginx.conf) | MODIFY | Perbaiki penanganan MIME type `.webmanifest` menggunakan `default_type application/manifest+json;` dan optimasi header `Cache-Control`. |
| [apps/frontend/src/components/pwa/PwaInstallPrompt.tsx](file:///home/nasrulhamid/app-projects/simakjs/apps/frontend/src/components/pwa/PwaInstallPrompt.tsx) | MODIFY | Refactor komponen: konsumsi event global, deteksi mode *standalone*, sediakan panduan iOS Safari, dan terapkan desain Apple-inspired (@DESIGN.md). |
| [apps/frontend/src/components/Sidebar.tsx](file:///home/nasrulhamid/app-projects/simakjs/apps/frontend/src/components/Sidebar.tsx) | MODIFY | Tambahkan opsi/tombol "Pasang Aplikasi" di bagian bawah navigasi sidebar (hanya muncul jika belum dalam mode standalone). |
| [apps/frontend/tests/pwa.spec.ts](file:///home/nasrulhamid/app-projects/simakjs/apps/frontend/tests/pwa.spec.ts) | MODIFY | Tambahkan pengujian E2E untuk validasi manifest headers, PWA metadata, dan ketersediaan listener instalasi. |

---

## 3. Tahapan Eksekusi (Step-by-Step Implementation)

### Tahap 1: Early Event Capture & Manifest Clean-up
- **Langkah 1.1**: Tambahkan inline script di `<head>` [apps/frontend/index.html](file:///home/nasrulhamid/app-projects/simakjs/apps/frontend/index.html) untuk mencegat `beforeinstallprompt`, memanggil `e.preventDefault()`, menyimpan ke `window.deferredPwaPrompt`, dan mentrigger `window.dispatchEvent(new Event('pwa-prompt-ready'))`.
- **Langkah 1.2**: Hapus deklarasi manual `<link rel="manifest">` dari `index.html` agar tidak terjadi duplikasi dengan injeksi otomatis dari `vite-plugin-pwa`.
- **Langkah 1.3**: Perbarui [apps/frontend/src/pwa.d.ts](file:///home/nasrulhamid/app-projects/simakjs/apps/frontend/src/pwa.d.ts) dengan tipe `Window.deferredPwaPrompt` dan `Navigator.standalone`.

### Tahap 2: Konfigurasi Build & Server (Vite & Nginx)
- **Langkah 2.1**: Pada [apps/frontend/vite.config.ts](file:///home/nasrulhamid/app-projects/simakjs/apps/frontend/vite.config.ts), tambahkan `devOptions: { enabled: true, type: 'classic' }` agar pengujian Service Worker dapat dilakukan di lingkungan lokal/development.
- **Langkah 2.2**: Pada [apps/frontend/nginx.conf](file:///home/nasrulhamid/app-projects/simakjs/apps/frontend/nginx.conf), ubah konfigurasi `location ~* \.webmanifest$` untuk menggunakan `default_type application/manifest+json;` dan pastikan `location = /sw.js` memiliki header `no-cache` yang tepat.

### Tahap 3: Penyempurnaan Komponen PWA Install Prompt & Standalone Mode
- **Langkah 3.1**: Refactor [apps/frontend/src/components/pwa/PwaInstallPrompt.tsx](file:///home/nasrulhamid/app-projects/simakjs/apps/frontend/src/components/pwa/PwaInstallPrompt.tsx):
  - Tambahkan fungsi helper deteksi mode standalone (`window.matchMedia('(display-mode: standalone)').matches` atau `(navigator as SafeAny).standalone === true`). Jika bernilai `true`, jangan tampilkan prompt apapun.
  - Tangani platform iOS: Jika user agent iOS (iPhone/iPad/iPod) dan bukan standalone, tampilkan modal/banner instruksi instalasi iOS (panduan tekan tombol Share $\rightarrow$ Tambah ke Layar Utama).
  - Tangani platform Android/Chromium: Gunakan `window.deferredPwaPrompt` dan dengarkan event `pwa-prompt-ready` untuk memicu instalasi saat tombol "Pasang" diklik.
  - Sediakan mekanisme penyimpanan status "dismiss" di `localStorage` dengan *cooldown* (misal 7 hari) agar tidak mengganggu pengguna.
  - Sesuaikan tampilan dengan gaya Apple-inspired (@DESIGN.md): rounded pill, typography ladder, backdrop-blur, subtle hairline border.

### Tahap 4: Penambahan Tombol Instalasi Manual di Navigasi
- **Langkah 4.1**: Pada [apps/frontend/src/components/Sidebar.tsx](file:///home/nasrulhamid/app-projects/simakjs/apps/frontend/src/components/Sidebar.tsx), sediakan tombol "Pasang Aplikasi" di bagian footer navigasi yang memicu fungsi instalasi/panduan PWA jika aplikasi dibuka di browser biasa.

### Tahap 5: Pengujian & Validasi
- **Langkah 5.1**: Perbarui pengujian pada [apps/frontend/tests/pwa.spec.ts](file:///home/nasrulhamid/app-projects/simakjs/apps/frontend/tests/pwa.spec.ts) untuk memverifikasi manifest, meta tag, dan handling event PWA.
- **Langkah 5.2**: Jalankan linting Biome (`bun run lint`) dan pemeriksaan tipe ketat TypeScript (`bunx tsc --noEmit`).
- **Langkah 5.3**: Jalankan build production (`bun run --cwd apps/frontend build`) dan preview lokal (`bun run --cwd apps/frontend serve`) untuk memverifikasi Service Worker aktif dan prompt instalasi berfungsi dengan baik.

---

## 4. Verification Plan

### Automated Verification
```bash
# 1. Linting seluruh monorepo
bun run lint

# 2. Strict Type Check frontend
cd apps/frontend && bunx tsc --noEmit

# 3. Production Build Validation
bun run --cwd apps/frontend build
```

### Manual Verification
1. **Desktop Chrome / Edge**:
   - Buka aplikasi di `localhost:3001` (dev atau serve).
   - Pastikan ikon pasang muncul di address bar browser dan banner "Pasang SIMAK Vokasi" muncul di pojok kiri bawah.
   - Klik "Pasang" dan verifikasi aplikasi terbuka di jendela aplikasi *standalone*.
2. **Mobile Android (Chrome)**:
   - Buka aplikasi via HTTPS/localhost.
   - Verifikasi dialog native instalasi PWA muncul saat tombol "Pasang" diklik.
3. **Mobile iOS (Safari)**:
   - Buka aplikasi di Safari.
   - Verifikasi banner panduan instalasi iOS muncul (menjelaskan langkah Share $\rightarrow$ Tambah ke Layar Utama).
   - Setelah ditambahkan ke layar utama dan dibuka dari ikon homescreen, verifikasi banner tidak muncul kembali (karena status *standalone* aktif).
