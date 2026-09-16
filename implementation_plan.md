# Implementation Plan: Hak Akses Gabungan untuk User Multi-Role (Union Role)

Dokumen perencanaan struktural. **Belum berisi implementasi kode penuh.** Tujuannya memetakan dependensi, file target, urutan eksekusi, dan pengujian.

---

## 1. Latar Belakang & Akar Masalah

Seorang user dapat memegang beberapa role sekaligus (mis. `dosen` + `prodi`, atau `admin` + `dosen`). Saat ini otorisasi di banyak tempat masih memeriksa **role tunggal** (`users.role` / `currentUser.role`), bukan gabungan (`roles[]`). Akibatnya:

- User `dosen` + `prodi` dengan primary role `dosen` **ditolak** saat mengakses endpoint yang mensyaratkan `prodi`.
- Menu Sidebar dan `ProtectedRoute` hanya menampilkan/mengizinkan menu primary role.
- Guard scope dosen (`guardMkScope`, `guardKelasScope`, `guardRombelScope`) tetap membatasi user yang seharusnya punya akses penuh via role `prodi`/`admin`.

**Prinsip target:** `hasRole(user, allowed)` = `true` bila **salah satu** role di `user.roles[]` cocok. `users.role` hanya legacy/primary untuk display & fallback, bukan sumber otorisasi.

---

## 2. Kondisi Eksisting (Sudah Multi-Role-Ready)

| Komponen | Lokasi | Status |
| :--- | :--- | :--- |
| Tabel `user_roles (userId, role)` | `apps/backend/src/models/schema.ts` | Ada |
| `UserPayload { role, roles[] }` | `apps/backend/src/utils/types.ts` | Ada |
| `hasRole()`, `validateRoleCombination()`, `SINGLE_ROLE_ONLY`, `MULTI_ROLE_ALLOWED` | `apps/backend/src/utils/role.ts` | Ada |
| Derive `roles` dari JWT | `apps/backend/src/middlewares/auth.middleware.ts` | Ada |
| `getRolesForUser()`, login kembalikan `role + roles` | `apps/backend/src/services/auth.service.ts` | Ada |
| `updateUserRoles` + validasi kombinasi + sinkron `users.role = roles[0]` | `apps/backend/src/controllers/user.controller.ts` | Ada |
| `hasRole()` union di frontend | `apps/frontend/src/contexts/AuthContext.tsx` | Ada |
| Modal "Atur Peran" (checkbox multi-role) | `apps/frontend/src/routes/Pengguna.tsx` | Ada |

**Tidak diperlukan migrasi DB baru.** `user_roles` sudah tersedia.

---

## 3. Daftar Celah (Gap) yang Harus Ditutup

| # | File | Masalah |
| :--- | :--- | :--- |
| B1 | `apps/backend/src/utils/types.ts` (`allowed()`) | `roles.includes(user.role)` — hanya cek primary. Dipakai ~30 controller. |
| B2 | `apps/backend/src/controllers/user.controller.ts` | Cek langsung `currentUser.role !== 'admin'/'super_admin'` di banyak method. |
| B3 | `apps/backend/src/utils/dosen-scope.ts` (`isPrivilegedScope`) | User `dosen+prodi` dianggap non-privileged sehingga di-scope sebagai dosen. |
| B4 | `apps/backend/src/controllers/kategori-bimbingan.controller.ts` | `isAuthorized(currentUser.role)` single string. |
| B5 | `apps/backend/src/services/rbac.service.ts` (`hasRolePermission(role)`) | Hanya menerima satu role; belum ada agregasi union. |
| B6 | `apps/backend/src/app.ts`, `plugins/audit.plugin.ts`, `routes/admisi-admin.routes.ts`, `routes/e2e.routes.ts` | Membaca `payload.role` / `user.role` langsung. |
| F1 | `apps/frontend/src/components/ProtectedRoute.tsx` | `auth.user()?.role` + `includes(userRole)` single-role. |
| F2 | `apps/frontend/src/components/Sidebar.tsx` | `role() === 'admin'` dsb. Menu = primary saja, bukan union. |
| F3 | `apps/frontend/src/routes/Pengguna.tsx` | Checkbox modal belum cegah kombinasi invalid / uncheck terakhir; label belum 1:1 backend. |

---

## 4. Dependensi & Urutan Implementasi

```
B1 (allowed union)
  → B2 (user.controller) + B4 (kategori-bimbingan)
    → B3 (dosen-scope privileged) + verifikasi prodi-scope
      → B5 (rbac union)
        → B6 (audit/route payload role)
          → F1 (ProtectedRoute) + F2 (Sidebar) + F3 (Pengguna modal)
            → JWT refresh & sinkronisasi + pengujian
```

Catatan: `users.role` tetap diisi `roles[0]` sebagai legacy. Tidak ada perubahan skema DB.

---

## 5. Rencana Perubahan per Fase

### Fase 0 — Baseline (read-only)
- Catat status awal: `bun run lint`, `tsc` backend (`tsconfig.ci.json`), `tsc` frontend.

### Fase 1 — Backend: otorisasi inti
1. `utils/types.ts` — ubah `allowed()` agar mendelegasikan ke logika `hasRole()` (union `roles[]` dengan fallback `[role]`). Pertahankan signature agar pemanggil tidak berubah.
2. `controllers/user.controller.ts` — ganti semua cek `currentUser.role !== '...'` menjadi `hasRole(currentUser, [...])` pada: `toggleActive`, `updateRole` (legacy), `importCsv`, `resetPassword`, `forcePasswordChange`, `updateProdiScope`, `generateAccounts`, `generateAccountsAsync`. Lengkapi `updateRole.validRoles` yang belum memuat `kaprodi`, `plp`, `instruktur`.
3. `controllers/kategori-bimbingan.controller.ts` — ubah `isAuthorized(role: string)` menjadi menerima `UserPayload` dan memakai `hasRole`.
4. `controllers/auth.controller.ts`, `app.ts` (WS handler), `routes/admisi-admin.routes.ts`, `routes/e2e.routes.ts`, `plugins/audit.plugin.ts` — ganti pembacaan `role` langsung dengan helper union; audit tetap menyimpan primary role + `roles[]` untuk observabilitas.

### Fase 2 — Backend: scope dosen vs prodi/admin
5. `utils/dosen-scope.ts` — perbaiki `isPrivilegedScope()`: kembalikan `true` jika user memiliki role privileged apa pun (`super_admin`, `admin`, `kaprodi`, `prodi`, `keuangan`). Dengan demikian user `dosen+prodi` lolos guard (full access), sedangkan `dosen`/`instruktur`/`plp` murni tetap di-scope.
6. `utils/role.ts` — verifikasi `canAccessAllProdi()` tetap `isGlobalScope || hasRole(['super_admin','admin'])`. **Jangan longgarkan tanpa persetujuan** (risiko pelebaran akses).
7. `services/prodi-scope.service.ts`, `services/pelanggaran.service.ts` — verifikasi pola dual-check (`user_roles` + fallback `users.role`) tetap konsisten.

### Fase 3 — Backend: RBAC granular union
8. `services/rbac.service.ts` — tambah helper union, mis. `hasRolePermissionForUser(roles: string[], module, action)` dan `getUserEffectivePermissions(roles[])`. Konfirmasi mapping `prodi → Kaprodi` di `ROLE_TO_GROUP` (pertahankan default).

### Fase 4 — Frontend: union akses
9. `components/ProtectedRoute.tsx` — ganti `user.role` menjadi `auth.hasRole(allowedRoles)`; pertahankan bypass `super_admin`; lengkapi tipe role yang hilang (`kaprodi`, `plp`).
10. `components/Sidebar.tsx` — ganti semua `role() === 'x'` menjadi `auth.hasRole(['x'])`; contoh `isAdminMgmt = () => auth.hasRole(['admin','super_admin'])`. Menu otomatis menjadi union.
11. `contexts/AuthContext.tsx` — tidak ada perubahan logika wajib; opsional normalisasi `roles` saat `login()` (dedupe + fallback `[role]`).
12. `routes/Pengguna.tsx` — hardening modal "Atur Peran" tanpa mengubah desain:
    - Cegah kombinasi invalid (`SINGLE_ROLE_ONLY` tidak boleh digabung).
    - Cegah menghapus role terakhir (`selectedRoles.length === 0`).
    - Sembunyikan/disable `super_admin` kecuali aktor `super_admin`.
    - Samakan label dengan `ROLE_LABELS` backend atau pakai `roleTypes()` dari API.
    - Jika admin mengubah peran dirinya sendiri, paksa refresh sesi (`logout` / refetch `/auth/me`).

### Fase 5 — JWT & sinkronisasi sesi
13. Pastikan login/register/`validateUser` selalu mengisi `roles[]` via `getRolesForUser()`.
14. `sso.service.ts`, `admisi.service.ts` — pastikan respons auth menyertakan `roles` secara konsisten.
15. Setelah `updateUserRoles` pada diri sendiri, frontend wajib memperbarui `localStorage` / re-login agar JWT lama tidak dipakai.

---

## 6. File Target

**Backend:** `utils/types.ts`, `utils/role.ts`, `utils/dosen-scope.ts`, `controllers/user.controller.ts`, `controllers/kategori-bimbingan.controller.ts`, `controllers/auth.controller.ts`, `services/rbac.service.ts`, `services/auth.service.ts`, `middlewares/auth.middleware.ts` (verifikasi), `plugins/audit.plugin.ts`, `app.ts`, `routes/admisi-admin.routes.ts`, `routes/e2e.routes.ts`.

**Frontend:** `components/ProtectedRoute.tsx`, `components/Sidebar.tsx`, `contexts/AuthContext.tsx`, `routes/Pengguna.tsx`, `controllers/userController.ts` (verifikasi typing).

---

## 7. Rencana Pengujian

### Unit / Integration (targeted, hindari `bun test` blanket di root)
- `apps/backend/src/tests/rbac-multirole.test.ts` (baru):
  - `allowed()` union & fallback `[role]`.
  - `hasRole()` multi-role.
  - `validateRoleCombination`: tolak `mahasiswa+dosen`, izinkan `dosen+prodi`, tolak `super_admin` via API.
- `apps/backend/src/__tests__/user-roles.test.ts` (perluas/buat):
  - `updateUserRoles` sukses `['dosen','prodi']`.
  - Gagal `['mahasiswa','dosen']`.
  - Non-super_admin gagal memberikan `super_admin`.
  - `users.role` tersinkron `roles[0]`.
- `dosen-scope.test.ts` (baru):
  - `dosen` murni dibatasi.
  - `dosen+prodi` lolos `guardMkScope`/`guardKelasScope`.

### Manual (Frontend)
- Login sebagai `dosen + prodi` → Sidebar menampilkan menu Dosen **dan** Admin Prodi.
- Buka route keduanya → `ProtectedRoute` tidak memantulkan ke Dashboard.
- Modal "Atur Peran": kombinasi invalid ter-disable, simpan sukses menampilkan badge role gabungan.

### Perintah verifikasi
```bash
bun run lint
cd apps/backend && bunx tsc --noEmit -p tsconfig.ci.json
cd apps/frontend && bunx tsc --noEmit
bun test apps/backend/src/tests/rbac-multirole.test.ts
```

---

## 8. Risiko & Keputusan yang Butuh Konfirmasi

1. Mapping `prodi → Kaprodi` di `RbacService.ROLE_TO_GROUP` — pertahankan atau pisah? (default: pertahankan).
2. `canAccessAllProdi` hanya `super_admin`/`admin`; user `prodi` murni tetap di-scope `userProdiScopes`. Jangan longgarkan tanpa persetujuan.
3. Legacy `updateRole` (single) vs `updateUserRoles` (multi) — pertahankan keduanya; arahkan UI hanya ke multi.
4. Tidak ada migrasi DB. Backup tetap wajib sebelum deploy staging/produksi. PR staging-first ke `development`, promosi via `development → main`.

---

## 9. Kriteria Selesai (Definition of Done)

- User `dosen + prodi` lolos `allowed(user, ['prodi'])` **dan** `allowed(user, ['dosen'])`.
- Sidebar + `ProtectedRoute` menampilkan/mengizinkan **union** menu.
- `guardMkScope`/`guardKelasScope`/`guardRombelScope` lolos untuk pemegang `prodi`/`admin` walau juga `dosen`.
- Kombinasi role invalid ditolak backend **dan** dicegah di UI modal.
- `bun run lint`, kedua `tsc`, dan test scoped hijau.
