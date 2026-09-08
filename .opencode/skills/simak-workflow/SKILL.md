---
name: simak-workflow
description: Standar siklus kerja Git, CI/CD staging-first, pre-commit checks, keamanan migrasi database Drizzle, serta protokol koordinasi agen AI di SIMAK Vokasi.
---

# SIMAK Workflow Skill — OpenCode

Skill ini adalah protokol operasional wajib bagi AI Agent (OpenCode CLI & Antigravity) untuk mengelola branching, pembuatan Pull Request (PR), migrasi database yang aman, dan verifikasi pre-commit pada SIMAK Vokasi.

---

## 1. Rules & Hard Guardrails

Semua aktivitas git, modifikasi skema DB, dan deployment WAJIB mematuhi aturan berikut:

1. **Staging-First Rule (DILARANG Push Langsung ke Development & Main)**:
   - DILARANG KERAS melakukan push langsung (`git push origin development` atau `git push origin main`).
   - Setiap fitur baru, perbaikan bug, atau refaktorisasi WAJIB dibuat di branch terpisah (e.g. `feat/...`, `fix/...`) dan diajukan melalui Pull Request (PR) dengan **target branch `development`** (staging).
   - Merge ke `development` secara otomatis mentrigger GitHub Actions staging deploy (`deploy-staging.yml`).
2. **Promosi Production Terisolasi (`development -> main`)**:
   - DILARANG membuat PR fitur/hotfix langsung ke branch `main`.
   - Branch `main` HANYA menerima satu jenis PR, yaitu: PR promosi dari `development` ke `main` setelah verifikasi di staging tuntas.
   - Merge ke `main` mentrigger deployment produksi (`deploy-production.yml`).
3. **Branch Protection & Larangan Hapus Branch Permanen**:
   - DILARANG KERAS menggunakan flag `--delete-branch` saat me-merge PR yang memiliki branch asal atau target `development` atau `main` (misal saat merge PR `development -> main`). Branch `development` dan `main` adalah permanent source of truth!
   - Gunakan perintah merge aman: `gh pr merge <PR_NUMBER> --merge` (TANPA `--delete-branch`). Flag `--delete-branch` HANYA boleh dipakai untuk branch fitur/hotfix jangka pendek.
4. **Keamanan Migrasi Database**:
   - DILARANG mengubah file migrasi SQL yang sudah pernah di-generate atau sudah dijalankan.
   - DILARANG menjalankan `drizzle-kit push` pada environment production/staging.
   - Selalu generate migrasi baru dengan `bun run db:generate` dan jalankan migrasi dengan `bun run db:safe-migrate`.
   - Seluruh file SQL migrasi WAJIB bersifat **IDEMPOTEN** (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, dan blok pengecekan aman untuk constraint).
   - WAJIB lakukan full database backup (`pg_dump`) sebelum migrasi diterapkan di staging atau production.
5. **Git Hygiene & Token Isolation**:
   - Gunakan format Conventional Commits: `type(scope): description` (contoh: `feat(presensi): sync compensation records`).
   - Jangan pernah menyertakan `.env` atau kredensial rahasia dalam commit.
   - Bersihkan token environment sebelum interaksi remote git: `env -u GITHUB_TOKEN git ...`.
6. **AI Agent Role Boundaries**:
   - **Antigravity**: Bertindak sebagai Planner & Orchestrator, membuat rencana kerja, mengeksekusi testing/linter, dan mengontrol workflow.
   - **OpenCode CLI (DeepSeek V4 Flash)**: Bertindak sebagai Executor Engine, memproses file spesifik berdasarkan plan, dan hanya menerima trace error jika pengujian gagal (maksimal 3x retry loop).

---

## 2. Code Patterns & Command Examples: Bad vs Good

### A. Alur Kerja Git & Pull Request

#### ❌ BAD (Push langsung atau PR langsung ke branch production)
```bash
# BAD: Push langsung ke development atau main akan merusak CI/CD dan melanggar proteksi
git checkout main
git commit -m "fix bug"
git push origin main # DITOLAK!

# BAD: Menghapus branch development saat merge PR promosi
gh pr merge 42 --merge --delete-branch # MERUSAK REPO JIKA HEAD ADALAH DEVELOPMENT!
```

#### ✅ GOOD (Staging-first flow & merge aman)
```bash
# 1. Buat branch fitur dari development terbaru
git checkout development
git pull origin development
git checkout -b feat/sync-kompensasi

# 2. Lakukan perubahan & commit sesuai conventional commits
git add .
git commit -m "feat(presensi): implement bulk sync compensation button"

# 3. Push ke branch fitur (bersihkan GITHUB_TOKEN lingkungan jika ada)
env -u GITHUB_TOKEN git push -u origin feat/sync-kompensasi

# 4. Buat PR dengan TARGET branch `development` (bukan main!)
gh pr create --base development --head feat/sync-kompensasi \
  --title "feat(presensi): implement bulk sync compensation button" \
  --body "Implementasi tombol sinkronisasi presensi dan kompensasi."

# 5. Setelah staging diverifikasi, buka PR promosi development -> main
gh pr create --base main --head development \
  --title "chore: promote development to production" \
  --body "Rilis fitur sinkronisasi kompensasi ke production."

# 6. Merge PR promosi TANPA --delete-branch
gh pr merge <PR_NUMBER> --merge
```

---

### B. Migrasi Database Idempoten (Drizzle ORM)

#### ❌ BAD (Script migrasi tidak idempoten — crash saat re-run)
```sql
-- BAD: Akan crash jika kolom sudah ada atau index duplikat
ALTER TABLE "presensi" ADD COLUMN "total_kompensasi" integer NOT NULL DEFAULT 0;
CREATE INDEX "presensi_tanggal_idx" ON "presensi" ("tanggal");
```

#### ✅ GOOD (Idempoten & tahan kegagalan pada proses deploy)
```sql
-- GOOD: Selalu gunakan IF NOT EXISTS untuk kompatibilitas deployment berulang
ALTER TABLE "presensi" ADD COLUMN IF NOT EXISTS "total_kompensasi" integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "presensi_tanggal_idx" ON "presensi" ("tanggal");

-- Penambahan constraint secara aman via PL/pgSQL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'presensi_rombel_id_fkey'
  ) THEN
    ALTER TABLE "presensi" 
      ADD CONSTRAINT "presensi_rombel_id_fkey" 
      FOREIGN KEY ("rombel_id") REFERENCES "rombel"("id") ON DELETE SET NULL;
  END IF;
END $$;
```

---

## 3. Verification Steps

Setiap agent WAJIB menjalankan seluruh rangkaian pre-commit check berikut sebelum commit, push, atau mengajukan Pull Request:

```bash
# 1. Jalankan Biome Linter & Formatter check
bun run lint

# 2. CI Type Check Backend (Strict Type System)
cd apps/backend && bunx tsc --noEmit -p tsconfig.ci.json

# 3. Type Check Frontend (SolidJS Strict Check)
cd apps/frontend && bunx tsc --noEmit

# 4. Biome CI Integrity Check
bunx biome ci .
```

Jika salah satu dari 4 perintah di atas gagal (exit code non-zero), perbaikan WAJIB dilakukan sebelum langkah git berikutnya dapat dilanjutkan.
