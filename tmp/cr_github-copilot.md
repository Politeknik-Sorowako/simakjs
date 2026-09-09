Ringkasan singkat (apa yang saya lakukan)

- Saya meninjau perubahan di PR #164 (docs + backend/frontend) yang menambahkan kategori bimbingan, modul pengaturan sistem (system_settings), toggle fitur evaluasi/feedback, endpoint/layanan terkait, serta UI monitoring dan manajemen kategori di frontend.
- Saya menelusuri file-file kunci (migrasi SQL, model/schema, services, controllers, routes, db-init, frontend Sidebar, monitoring page, modal kategori) dan mencatat temuan, risiko, dan saran perbaikannya di bawah.

1. PR — ringkasan tinggi

- Judul: docs(bimbingan): plan penyederhanaan /bimbingan & modul evaluasi sistem
- Author: istc-294
- PR: #164 (open)
- Perubahan: 25 file diubah; +1,233 additions, -111 deletions (metadata PR yang Anda berikan)
- Tujuan:
  - Menyederhanakan tampilan /bimbingan dengan fokus pada riwayat per semester dan kategori.
  - Menambahkan modul evaluasi/feedback yang bisa di-toggle via system_settings.feature_feedback_enabled.
  - Menambah tabel kategori_bimbingan, system_settings; services/ controllers/ routes untuk Settings & Kategori; UI komponen manajemen kategori dan halaman monitoring baru.

2. Perubahan inti (apa yang diubah dan mengapa)

- Database / migrasi:
  - apps/backend/drizzle/0033_add_kategori_bimbingan_and_system_settings.sql — membuat tabel kategori_bimbingan dan system_settings, menambah kolom kategori_id ke bimbingan, seed default kategori & seed feature_feedback_enabled.
- Model/schema:
  - src/models/schema.ts — menambahkan pgTable kategoriBimbingan dan systemSettings serta relasi kategori pada bimbingan.
- DB init:
  - src/services/db-init.service.ts — DbInitService.ensureTablesExist(): membuat tabel jika belum ada dan melakukan seeding; dipanggil saat boot.
- Backend: controllers/services/routes
  - SettingsService / SettingsController + settings.routes: endpoint publik /settings/public dan admin endpoints untuk get/all/update.
  - KategoriBimbinganService / KategoriBimbinganController + kategoriBimbingan.routes: CRUD kategori bimbingan.
  - FeedbackController: mengecek SettingsService.isFeedbackEnabled() sebelum create feedback (403 bila dimatikan).
  - BimbinganService: perbaikan error-handling, penambahan getMonitoringBimbinganLengkap(filter) dan endpoint baru /bimbingan/monitoring-lengkap.
  - FeedbackService: query join users ditambah, error handling.
  - DbInitService dipanggil dari apps/backend/src/app.ts saat boot.
- Frontend:
  - Sidebar: memanggil settingsController.getPublicSettings() dan menampilkan menu Evaluasi Sistem hanya jika featureFeedbackEnabled true.
  - Komponen baru: KategoriBimbinganModal.tsx; controllers kategoriBimbinganController, settingsController.
  - Route baru MonitoringBimbingan.tsx + route terdaftar di App.tsx.
  - Bimbingan.tsx: menambahkan tombol Kelola Kategori bagi admin/prodi (memakai modal).
  - Penyesuaian bimbinganController untuk memanggil endpoint monitoring-lengkap.

3. Hal-hal penting yang perlu diperhatikan (potensi bug / perhatian keamanan / kode yang perlu diperbaiki)
   Prioritas tinggi (perlu ditangani sebelum merge)

- Pemanggilan DbInitService.ensureTablesExist() tanpa await pada boot app:
  - File: apps/backend/src/app.ts
  - Baris: DbInitService.ensureTablesExist();
  - Masalah: ini adalah panggilan async "fire-and-forget". Bila Anda mengandalkan side-effect (mis. pembuatan tabel/seed) sebelum server mulai menerima request, mungkin ada race condition — client dapat mengakses endpoint yang bergantung pada tabel/kolom baru sebelum selesai dibuat.
  - Saran: jalankan await DbInitService.ensureTablesExist() pada proses bootstrap yang menunggu (atau log/handle promise failure), atau jalankan init dalam lifecycle/worker terpisah namun pastikan server tidak menerima request yang mengasumsikan struktur DB sebelum selesai.
- Potensi missing imports / fungsi yang dipakai dari drizzle-orm:
  - Banyak perubahan service/controller memakai fungsi seperti and(), inArray(), asc(), desc(), dll. Pastikan file-file ini mengimpor helper yang dipakai di bagian atas file. Contoh: getMonitoringBimbinganLengkap menggunakan inArray/asc/and — verifikasi importnya ada. Jika ada kesalahan impor, build/backend akan gagal.
  - Saran: jalankan TypeScript build/backend tests (bunx tsc --noEmit) untuk memastikan tidak ada missing symbols.
- Error swallowing / log-only handling di service:
  - BimbinganService.getMonitoringBimbingan sekarang menangkap banyak error dan mengembalikan [] dalam beberapa kasus. Ini mencegah crash tetapi juga dapat menyembunyikan bug query; sebaiknya kembalikan/lempar error pada kondisi kritikal atau paling tidak tambahkan logging yang lebih informatif dan telemetry.
- Konsistensi nama kolom antara schema dan service:
  - Di FeedbackService: memilih field 'judul' (systemFeedback.judul) — pastikan kolom di schema memang bernama judul (atau judul vs nama). Periksa schema systemFeedback (ada di models/schema sebelumnya) agar mapping field sesuai.
  - Di migration Anda menambahkan columns nama/deskripsi pada kategori_bimbingan yang sesuai, tapi pastikan semua references pada kode menggunakan nama field yang sama (snake_case vs camelCase mapping jika memakai drizzle).
- Validasi & hak akses:
  - SettingsController.updateSetting membatasi hanya ke role 'admin' — baik. Pastikan route settings.routes menaruh .use(authMiddleware) di tempat yang benar (sudah ada).
  - KategoriBimbinganController.create/update/delete hanya untuk admin/prodi — implementasi ok.
- Frontend: penggunaan createResource untuk publicSettings
  - Sidebar menggunakan createResource(() => settingsController.getPublicSettings()); pastikan resource handling benar (publicSettings() mungkin undefined saat loading). Anda memanggil publicSettings()?.featureFeedbackEnabled — ok, tapi pertimbangkan fallback eksplisit untuk loading agar tidak menghasilkan undefined runtime UI glitches.
- Schema: di apps/backend/src/schemas/bimbingan.schema.ts Anda menghapus bagian response pada getBimbinganMonitoringSchema (response property dihapus). Ini bisa memengaruhi dokumentasi/validasi rute — pastikan perubahan ini memang diinginkan.
- SQL migration vs DbInitService dublication:
  - Anda menambahkan migrasi SQL (drizzle/0033...) dan juga DbInitService yang membuat tabel yang sama. Ini tidak salah (keduanya idempotent IF NOT EXISTS), tapi perhatikan alur deploy: bila Anda memakai migrasi terkontrol (drizzle), sebaiknya hanya migrasi yang membuat tabel, DB-init helper sebaiknya hanya melakukan checks ringan atau dihilangkan untuk production, untuk menghindari duplikasi tanggung jawab. Jika DbInitService hanya untuk development/e2e, tandai/komentar agar tidak dijalankan di production (atau atur via env).
- Frontend: CSV export sanitization
  - MonitoringBimbingan.handleExportCSV menyisipkan nilai langsung ke CSV dan membungkus dengan kutip. Jika ada tanda kutip ganda di nama, output CSV bisa rusak. Pertimbangkan escape (ganti " menjadi "" sesuai CSV RFC).
- Testing & docs
  - Tidak tampak penambahan test untuk service/route baru. Tambahkan unit/integration tests khususnya untuk SettingsService.isFeedbackEnabled, SettingsController, KategoriBimbingan CRUD, dan BimbinganService.getMonitoringBimbinganLengkap.

4. Merge readiness & risk assessment

- Status readiness: Medium
  - Perubahan besar (DB schema + backend services + frontend UI) yang masuknya relatif terpisah namun saling bergantung — perlu verifikasi DB schema/imports, build lint/tsc, dan smoke test.
- Risiko:
  - Medium — kemungkinan build/runtime error akibat missing imports atau mismatch nama kolom, dan potensi race condition karena DbInitService dipanggil tanpa sinkronisasi.
- Rekomendasi pra-merge:
  - Jalankan CI build & full TypeScript checks (backend & frontend).
  - Jalankan migrasi secara terkontrol di staging dan cek endpoint /settings/public, /kategori-bimbingan, /bimbingan/monitoring-lengkap.
  - Pastikan DbInitService tidak mengganggu migrasi existing (pertimbangkan memindahkan ke script migration-only atau mengeksekusi hanya ketika NODE_ENV !== 'production').

5. Perbaikan & peningkatan yang saya sarankan (actionable)

- [Review comment] Buat DbInitService.ensureTablesExist dipanggil secara sinkron di bootstrap atau ubah menjadi dipicu oleh proses migration yang eksplisit:
  - Mengganti:
    - DbInitService.ensureTablesExist();
  - Menjadi (contoh):
    - await DbInitService.ensureTablesExist(); // di dalam async bootstrap yang menunggu
  - Atau jalankan hanya di env development:
    - if (process.env.NODE_ENV !== 'production') await DbInitService.ensureTablesExist();
- [Review comment] Verifikasi impor drizzle-orm pada file-file yang dimodifikasi:
  - Pastikan fungsi helper yang dipakai (and, inArray, asc, desc, etc.) diimpor atau tersedia via callback destructuring seperti pattern project lain. Jalankan tsc untuk menemukan missing imports.
- [Review comment] Jangan swallow error penting tanpa observability. Untuk operasi DB kritikal, kembalikan error ke caller (atau set status 500) sehingga issue tidak silent-fail. Contoh: BimbinganService menangkap dan return [] — tambahkan log lengkap + optional sentry/telemetry, atau lempar lagi jika kondisi kritis.
- [Review comment] CSV export: escape doble quotes pada nilai untuk menghindari CSV corrupt. Contoh: value.replace(/"/g, '""').
- [Review comment] Tambahkan tests (minimal) untuk:
  - SettingsService.isFeedbackEnabled (true/false/null)
  - SettingsController.getPublicSettings
  - KategoriBimbingan CRUD happy path + auth guard
  - BimbinganService.getMonitoringBimbinganLengkap basic queries
- [Optional] Konsolidasi: pilih satu mekanisme (migrasi SQL via drizzle) untuk membuat/modify schema di production; biarkan DbInitService sebagai helper pengembangan atau ubah behavior-nya berdasarkan env.

6. Hal-hal spesifik/teknis yang saya highlight (potongan kode & lokasi)

- apps/backend/src/app.ts
  - Periksa pemanggilan async:
    - DbInitService.ensureTablesExist();
  - Saran: await atau condtional only-in-dev.

- apps/backend/drizzle/0033_add_kategori_bimbingan_and_system_settings.sql
  - Migration idempotent — OK. Pastikan sequence/tanggal compatible.

- apps/backend/src/services/db-init.service.ts
  - Duplikasi terhadap migrasi; perhatikan alur deploy.

- apps/backend/src/services/bimbingan.service.ts
  - Banyak try/catch baru — good for resilience but pastikan observability.

- apps/frontend/src/components/KategoriBimbinganModal.tsx
  - UI lengkap; pastikan API errors ditangani (sudah ada toast). Hati-hati konfirmasi delete.

- apps/frontend/src/routes/MonitoringBimbingan.tsx
  - Fitur export/cetak & filter — periksa escape CSV dan opsi page size untuk dosen list panjang.

7. Ringkasan rekomendasi singkat (action list)

- Jalankan full TypeScript build & unit tests (backend & frontend).
- Perbaiki pemanggilan DbInitService (await atau hanya di dev).
- Verifikasi imports drizzle-orm & nama kolom mapping schema vs kode.
- Tambahkan escaping CSV & unit tests minimal untuk settings/kategori/bimbingan.
- Putuskan pola migrasi (migrasi vs db-init helper) agar tidak duplikasi tanggung jawab.

### Want me to…

<!-- copilot:suggestions -->

1. Jalankan pemeriksaan otomatis (tsc build + lint) pada perubahan ini dan laporkan error/warning yang muncul.
2. Tampilkan diff terperinci dari file-file yang saya tandai (app.ts, db-init.service.ts, bimbingan.service.ts, settings.service.ts) agar saya bisa beri patch per-bariskode.
3. Buat PR patch kecil yang: (a) menambahkan await pada DbInitService atau membatasi eksekusi ke development, (b) menambahkan escaping CSV, dan (c) menambahkan logging/error rethrow pada BimbinganService select kritikal.

Pilih angka (1/2/3) atau beri instruksi lain—saya siap melakukan langkah berikut (saya dapat menjalankan pemeriksaan build otomatis terlebih dahulu jika Anda ingin).
