Berikut hasil Code Review PR #164 — docs(bimbingan): plan penyederhanaan /bimbingan & modul evaluasi sistem
✅ CI/CD Status
Check
bun run lint
tsc --noEmit (backend)
tsc --noEmit (frontend)
📋 Ringkasan Perubahan
PR ini mengimplementasikan 2 fitur utama:

1. Kategori Bimbingan — CRUD kategori (PA/Akademik, TA/Skripsi, Asistensi) + kolom kategori_id di tabel bimbingan
2. Modular Feature Toggle — system_settings table + endpoint /settings/public untuk mengaktifkan/menonaktifkan modul feedback
3. Monitoring Bimbingan — halaman baru /monitoring-bimbingan dengan filter periode, dosen PA, search, export CSV, dan print
   🔴 Critical Issues
4. DbInitService bypasses Drizzle migration system
   File: apps/backend/src/services/db-init.service.ts
   File: apps/backend/src/app.ts:83
   Raw SQL CREATE TABLE IF NOT EXISTS dieksekusi langsung saat boot, bypassing Drizzle ORM migration pipeline. Ini bertentangan dengan AGENTS.md:
   "Never alter existing migration files or execute drizzle-kit push in production. Generate and apply migrations via bun run db:generate and bun run db:safe-migrate."
   Migration file 0033*\*.sql sudah ada dan idempotent — jadi DbInitService redundan dan berbahaya karena bisa menyebabkan schema drift antara Drizzle snapshot dan database aktual.
   Rekomendasi: Hapus DbInitService.ensureTablesExist() dari app.ts. Gunakan migration 0033*\*.sql saja. Jika auto-init diperlukan untuk development, gunakan drizzle-kit push di dev mode saja.
5. system_feedback table juga di-create via raw SQL
   File: apps/backend/src/services/db-init.service.ts:41-53
   Tabel system_feedback seharusnya sudah ada dari migrasi sebelumnya (karena feedbackRoutes sudah ada). Jika belum ada, ini harusnya jadi migration terpisah, bukan raw SQL di boot.
6. getPublicSettings tidak punya type annotation yang benar
   File: apps/backend/src/controllers/settings.controller.ts:7
   static async getPublicSettings({ set }: { set: any }): Promise<any>
   Parameter { set: any } tidak menggunakan AuthContext. Meskipun ini endpoint publik tanpa auth, lebih baik define interface eksplisit:
   interface PublicContext { set: { status: number } }
   🟡 Medium Issues
7. settings.routes.ts — route /public sebelum auth, tapi route setelahnya butuh auth
   File: apps/backend/src/routes/settings.routes.ts:6-8
   .get('/public', SettingsController.getPublicSettings) // no auth
   .use(authMiddleware)
   .get('/', SettingsController.getAll) // auth required
   Pola ini benar secara Elysia, tapi tidak ada schema validation untuk PUT /settings. Body validation ada, tapi tidak ada response schema.
8. getMonitoringBimbinganLengkap — N+1 query pattern
   File: apps/backend/src/services/bimbingan.service.ts:343-420
   Method ini mengambil semua bimbingan dan sesiBimbingan sekaligus (bagus), tapi untuk dataset besar (ratusan mahasiswa), db.select().from(bimbingan) tanpa limit bisa berat. Pertimbangkan pagination atau lazy-load sesiList.
9. MonitoringBimbingan.tsx — cast as pada dosenList
   File: apps/frontend/src/routes/MonitoringBimbingan.tsx:128
   <For each={(dosenList()?.data as { id: number; nama: string }[]) || []}>
   Cast as ini workaround untuk type mismatch. Sebaiknya definisikan interface DosenListResponse yang benar di dosenController.
10. Emoji di tombol UI
    File: apps/frontend/src/routes/Bimbingan.tsx:334, MonitoringBimbingan.tsx:87-90
    Emoji 🏷️, 📥, 🖨️ hardcoded di JSX. Tidak masalah fungsional, tapi tidak konsisten dengan pola UI lain di codebase yang menggunakan SVG icons.
    🟢 Minor / Suggestions
11. Migration 0033\_\*.sql — sudah idempotent ✅
    Menggunakan CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, dan DO $$ BEGIN ... END $$ untuk constraint. Sesuai standar AGENTS.md.
12. Response validation schema dihapus dari getBimbinganMonitoringSchema
    File: apps/backend/src/schemas/bimbingan.schema.ts:198-220
    Penghapusan response schema yang ketat adalah fix yang benar — ini mencegah 500 error saat response tidak match schema. Tapi sebaiknya tetap ada response schema yang lebih longgar untuk dokumentasi OpenAPI.
13. KategoriBimbinganModal.tsx — error casting
    File: apps/frontend/src/components/KategoriBimbinganModal.tsx:61
    toast.showToast((err as Error).message || 'Gagal menyimpan kategori', 'error');
    Sebaiknya gunakan pattern yang sudah ada di codebase:
    toast.showToast(err instanceof Error ? err.message : 'Gagal menyimpan kategori', 'error');
    Ada 4 instance serupa di file ini.
14. FeedbackService.getAll() — duplicate user join logic
    File: apps/backend/src/services/feedback.service.ts:18-40
    Perubahan dari db.query.systemFeedback.findMany({ with: { user: true } }) ke manual leftJoin adalah improvement untuk error handling, tapi getByUserId masih pakai db.query pattern. Konsistensi lebih baik.
15. Tidak ada route guard untuk /evaluasi-sistem di frontend
    Sidebar menyembunyikan link berdasarkan publicSettings()?.featureFeedbackEnabled, tapi route /evaluasi-sistem di App.tsx tidak dicek. User bisa langsung akses URL. Sebaiknya FeedbackController.create sudah ada guard (✅), tapi frontend route juga perlu conditional rendering atau redirect.
    📊 Summary
    Kategori
    🔴 Critical
    🟡 Medium
    🟢 Minor/Suggestion
    Verdict: ⚠️ Request Changes — DbInitService yang bypass migration system adalah issue kritis yang harus diselesaikan sebelum merge. Sisanya adalah improvement yang bisa ditindaklanjuti.
