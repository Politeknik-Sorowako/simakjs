# SIMAK Vokasi (Sistem Informasi Akademik Vokasi)

## Maksud Pembuatan Aplikasi

SIMAK Vokasi adalah sebuah platform Sistem Informasi Akademik yang dirancang khusus untuk institusi pendidikan vokasi. Aplikasi ini memfasilitasi pengelolaan data akademik inti seperti manajemen pengguna (mahasiswa, dosen, admin), pendataan program studi, serta pencatatan biodata dasar mahasiswa yang disesuaikan dengan kebutuhan integrasi pelaporan (misalnya ke PDDIKTI).

## Arsitektur Sistem

Proyek ini menggunakan arsitektur **Monorepo** yang memisahkan aplikasi ke dalam ranah _frontend_ dan _backend_, namun dikelola dalam satu repositori yang sama untuk mempermudah koordinasi, _sharing_ kode, dan eksekusi skrip lintas batas (_cross-boundary_).

- **Backend (`apps/backend`)**: RESTful API server. Dibangun dengan Elysia.js di atas runtime Bun. Menggunakan Drizzle ORM untuk PostgreSQL. Autentikasi via JWT dalam HttpOnly Cookies.
- **Frontend (`apps/frontend`)**: Single Page Application (SPA). Dibangun dengan Solid.js + Vite, Tailwind CSS untuk styling, dan Nginx untuk serving di production.
- **Database**: PostgreSQL 15 melalui Docker.

## Brand Color System

Desain UI menggunakan 3 skema warna dominan dari politekniksorowako.ac.id:

| Color | Hex | Penggunaan |
|-------|-----|------------|
| Navy Blue | `#042d59` | Primary — navbar, sidebar, heading, buttons |
| Golden Yellow | `#fcb900` | Accent — active states, highlights, IPK display |
| Cool Gray | `#6c757d` | Neutral — borders, secondary text, backgrounds |

Variasi turunan (50-950) didefinisikan di `tailwind.config.js` sebagai `brand-*`, `accent-*`, dan `brand-gray-*`.

## Struktur Folder

```text
simakjs/
├── package.json               # Konfigurasi workspace monorepo (Bun Workspaces)
├── docker-compose.yml         # Konfigurasi container untuk DB, Backend, dan Frontend
├── apps/
│   ├── backend/               # REST API Backend
│   │   ├── src/
│   │   │   ├── index.ts       # Entry point & route definitions
│   │   │   ├── app.ts         # Elysia app instance & middleware
│   │   │   ├── controllers/   # Request handlers (auth, mahasiswa, dosen, krs, etc.)
│   │   │   ├── services/      # Business logic layer
│   │   │   ├── middlewares/   # Auth middleware, rate limiter
│   │   │   ├── utils/         # Helpers (pagination, types)
│   │   │   └── db/
│   │   │       ├── index.ts   # Database connection
│   │   │       └── schema.ts  # Drizzle ORM table schemas
│   │   ├── drizzle/           # Generated migrations
│   │   ├── drizzle.config.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   └── frontend/              # Solid.js SPA Frontend
│       ├── src/
│       │   ├── App.tsx        # Root component with routes
│       │   ├── index.tsx      # Entry point
│       │   ├── index.css      # Global styles, Tailwind directives, CSS variables
│       │   ├── components/
│       │   │   ├── ui/        # Reusable UI components
│       │   │   │   ├── Button.tsx       # 7 variants, 3 sizes, loading state
│       │   │   │   ├── Input.tsx        # Text/select, dark mode, error states
│       │   │   │   ├── Modal.tsx        # Backdrop blur, scale animation
│       │   │   │   ├── Table.tsx        # Brand-50 header, dark mode
│       │   │   │   ├── SearchableSelect.tsx  # Filterable dropdown, keyboard nav
│       │   │   │   ├── Card.tsx         # 4 variants (default/bordered/elevated/ghost)
│       │   │   │   ├── Badge.tsx        # 6 variants (success/warning/danger/info/accent)
│       │   │   │   ├── Spinner.tsx      # 4 sizes with optional label
│       │   │   │   └── ImportCsvModal.tsx
│       │   │   ├── MainLayout.tsx       # App shell with sidebar + navbar
│       │   │   ├── Navbar.tsx           # Backdrop-blur, theme toggle, global filters
│       │   │   ├── Sidebar.tsx          # Navy gradient, collapsible sections
│       │   │   └── ProtectedRoute.tsx   # Role-based access control
│       │   ├── contexts/      # Solid.js contexts
│       │   │   ├── AuthContext.tsx
│       │   │   ├── ToastContext.tsx
│       │   │   └── WorkspaceContext.tsx
│       │   ├── controllers/   # API client functions (18 controllers)
│       │   └── routes/        # Page components (27 route pages)
│       ├── index.html
│       ├── nginx.conf
│       ├── tailwind.config.js # Custom theme (brand/accent/brand-gray, shadows, animations)
│       ├── vite.config.ts
│       ├── Dockerfile
│       └── package.json
```

## Teknologi & Library Stack

**Ekosistem Utama:**
- **Bun**: JavaScript runtime, package manager, test runner, dan bundler.
- **Docker**: Kontainerisasi aplikasi (Backend, Frontend, Database).

**Backend (`apps/backend`):**
- **Elysia.js**: Framework web berkinerja tinggi berbasis Bun.
- **Drizzle ORM**: TypeScript ORM untuk PostgreSQL.
- **PostgreSQL 15**: Relational Database.
- **@elysiajs/swagger**: Dokumentasi API (Swagger UI).
- **@elysiajs/jwt & @elysiajs/cookie**: Autentikasi JWT via HttpOnly Cookie.
- **@elysiajs/cors**: Middleware CORS.

**Frontend (`apps/frontend`):**
- **Solid.js**: Framework UI deklaratif reaktif tanpa Virtual DOM.
- **Vite**: Build tool dan dev server.
- **Tailwind CSS**: Utility-first CSS framework dengan custom theme brand.
- **Zod**: Client-side schema validation.
- **Solid Router**: Routing untuk Solid.js.
- **Biome**: Linter dan formatter (menggantikan ESLint + Prettier).
- **Nginx**: Web server untuk production serving.

## Skema Database

Database menggunakan PostgreSQL dengan tabel-tabel utama:

1. **`users`** — Kredensial sistem (email, password hashed, role: admin/dosen/mahasiswa)
2. **`program_studi`** — Data referensi prodi (kode, nama, jenjang, idPddikti)
3. **`dosen`** — Biodata Dosen (nip, nama, email, programStudiId, nidn, nik)
4. **`mahasiswa`** — Biodata Mahasiswa (nim, nama, email, status, namaIbuKandung, nik)
5. **`periode_akademik`** — Semester aktif
6. **`mata_kuliah`** — Master mata kuliah
7. **`kelas_kuliah`** — Kelas per semester dengan dosen pengajar
8. **`krs`** — Kartu Rencana Studi mahasiswa
9. **`bap`** — Berita Acara Perkuliahan
10. **`presensi`** — Kehadiran mahasiswa per sesi kuliah
11. **`bimbingan`** — Diskusi bimbingan akademik Dosen PA & Mahasiswa
12. **`pelanggaran`** — Catatan kedisiplinan
13. **`tagihan`** — Keuangan/SPP mahasiswa
14. **`khs`** — Kartu Hasil Studi
15. **`yudisium`** — Evaluasi kelulusan
16. **`komponen_nilai`** — Komponen penilaian per kelas
17. **`nilai`** — Input nilai mahasiswa

## Status Implementasi

- **[✅] Fase 1 (Persiapan Semester):** Manajemen master data (Prodi, Mahasiswa, Dosen, Kelas) dan Tagihan Keuangan.
- **[✅] Fase 2 (KRS & Bimbingan):** Pengisian KRS, approval dosen PA, dan diskusi bimbingan terintegrasi.
- **[✅] Fase 3 (Perkuliahan):** Input BAP, pencatatan Presensi Mahasiswa, dan akumulasi jam ketidakhadiran.
- **[✅] Fase 4 (KHS & Kelayakan Ujian):** Cetak Kartu Ujian, validasi syarat kehadiran >= 80%, auto-generate KHS.
- **[✅] Fase 5 (Yudisium & PDDIKTI):** Penguncian nilai, evaluasi Yudisium, sinkronisasi ke Neo Feeder PDDIKTI.
- **[✅] Fase 6 (UI/UX Redesign):** Implementasi brand color system politekniksorowako.ac.id, redesign seluruh komponen UI dan halaman route.

## Daftar API Endpoints

Backend berjalan pada `http://localhost:3000`. Swagger docs: `http://localhost:3000/swagger`.

### Autentikasi & Pengguna
- `/auth/*` — Register, Login, Forgot/Reset Password (JWT HttpOnly Cookie)
- `/users/*` — CRUD pengguna, profil, update theme

### Master Data
- `/prodi/*` — CRUD Program Studi
- `/dosen/*` — CRUD Dosen
- `/mahasiswa/*` — CRUD Mahasiswa
- `/periode-akademik/*` — CRUD Periode Akademik
- `/mata-kuliah/*` — CRUD Mata Kuliah
- `/kelas-kuliah/*` — Kelas kuliah & plotting dosen

### Akademik
- `/krs/*` — Pengambilan mata kuliah & approval Dosen PA
- `/bap/*` & `/presensi/*` — Berita Acara Perkuliahan & absensi
- `/bimbingan/*` — Chat interaktif Dosen PA & Mahasiswa
- `/pelanggaran/*` — Catatan kedisiplinan
- `/kurikulum/*` — Manajemen kurikulum
- `/rps/*` — Rencana Pembelajaran Semester

### Evaluasi & Keuangan
- `/tagihan/*` — SPP/UKT Mahasiswa
- `/khs/*` — Kelayakan ujian & rekap KHS
- `/yudisium/*` — Komponen nilai, input nilai, locking kelas
- `/pddikti/*` — Sinkronisasi Neo Feeder PDDIKTI

## Cara Setup & Menjalankan

### Docker (Production)
```bash
git clone https://github.com/Politeknik-Sorowako/simakjs.git
cd simakjs
docker compose up -d
```
- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3000/swagger`

### Migrasi Database
```bash
cd apps/backend
bun install
bun run db:generate
bun run db:push
```

### Development Mode
```bash
# Terminal 1: Database
docker compose up -d db

# Terminal 2: Backend
cd apps/backend && bun run dev

# Terminal 3: Frontend
cd apps/frontend && bun run dev
```

### Testing
```bash
cd apps/backend && bun test
```

## Deployment

### Arsitektur Deployment

Proyek ini memiliki **2 metode deployment** yang saling melengkapi:

| Metode | Trigger | Use Case |
|--------|---------|----------|
| **CI/CD (GitHub Actions)** | Push ke `main` / `develop` | Deployment rutin & otomatis |
| **Manual (SSH)** | Eksekusi manual via SSH | Hotfix, debugging, emergency |

### Infrastructure & Scripts

```text
simakjs/
├── deploy.sh                          # CI/CD — deployment otomatis
├── deploy-manual.sh                   # Manual — deployment via SSH
├── rollback.sh                        # Rollback ke backup sebelumnya
├── health-check.sh                    # Diagnostic & health check
├── dashboard.sh                       # Monitoring dashboard real-time
├── scripts/
│   ├── pre-deploy-test.sh             # Pre-deployment testing
│   ├── post-deploy-test.sh            # Post-deployment smoke test
│   └── telegram-notify.sh             # Notifikasi via Telegram
├── .deployment/
│   ├── deploy.config.sh               # Konfigurasi deployment
│   ├── auto-scaling.config.sh         # Template auto-scaling
│   └── health-check.config.sh         # Konfigurasi health check
└── apps/backend/backups/              # Backup database (5 backup terakhir)
```

### CI/CD — Deployment Otomatis (Recommended)

**Trigger:** Push ke branch `main` atau `develop`

**Workflow:** `.github/workflows/deploy.yml`

```yaml
on:
  push:
    branches: [main, develop]
```

**Alur deployment:**
1. GitHub Actions checkout kode terbaru
2. SSH ke VPS
3. `deploy.sh` menjalankan:
   - ✅ Git pull kode terbaru
   - ✅ Pre-deployment checks (disk, memory, Docker)
   - ✅ Pre-deployment tests (jika diaktifkan)
   - ✅ Backup database (gzip, 5 backup retention)
   - ✅ Force cleanup containers (multiple strategies)
   - ✅ Docker build & up
   - ✅ Health check (retry 5x)
   - ✅ Post-deployment tests (smoke test)
   - ✅ Telegram notification
   - 🔄 Auto-rollback jika health check gagal

**Setup GitHub Secrets:**
```
VPS_HOST=ip-vps-anda
VPS_USERNAME=root
VPS_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
GH_PAT=github_pat_xxx          # Personal Access Token
TELEGRAM_BOT_TOKEN=xxx         # Opsional
TELEGRAM_CHAT_ID=xxx           # Opsional
TELEGRAM_ENABLED=true          # Opsional
```

### Manual Deployment via SSH

Gunakan jika perlu deploy branch tertentu atau melakukan hotfix.

```bash
# SSH ke VPS
ssh user@vps-host

# Masuk ke project
cd /var/www/simakjs

# Deploy branch main
./deploy-manual.sh

# Deploy branch develop
./deploy-manual.sh develop

# Deploy cepat (tanpa test)
./deploy-manual.sh --skip-tests

# Deploy tanpa backup
./deploy-manual.sh --skip-backup
```

**Opsi lengkap:**
```bash
./deploy-manual.sh [branch] [options]

Options:
  --skip-tests     Skip pre & post deployment tests
  --skip-backup    Skip database backup
  --skip-pull      Skip git pull
  --no-force       Don't force remove containers
  --rollback       Rollback to previous backup
  --health         Run health check only
  --dashboard      Show monitoring dashboard
  --status         Show deployment status
  --help           Show help
```

### Rollback

```bash
# Rollback ke backup terakhir
./rollback.sh

# Lihat daftar backup tersedia
./rollback.sh list

# Rollback ke backup spesifik
./rollback.sh backup-20240709-120000
```

**Alur rollback:**
1. Stop backend container
2. Restore database dari backup `.sql.gz`
3. Restart backend
4. Health check verification
5. Telegram notification

### Monitoring & Health Check

```bash
# Dashboard interaktif (refresh setiap 5 detik)
./dashboard.sh

# Health check one-time
./health-check.sh

# Output JSON (untuk monitoring tools)
./health-check.sh json

# Cek status cepat
./deploy-manual.sh --status
```

### Telegram Notifications

**Setup:**
1. Buat bot Telegram via [@BotFather](https://t.me/botfather)
2. Dapatkan `BOT_TOKEN` dan `CHAT_ID`
3. Set environment variables:

```bash
export TELEGRAM_BOT_TOKEN="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
export TELEGRAM_CHAT_ID="-1001234567890"
export TELEGRAM_ENABLED="true"
```

**Notifikasi yang dikirim:**
- ✅ Deployment berhasil (branch, commit, duration)
- ❌ Deployment gagal (branch, error, next steps)
- 🔄 Rollback diinisiasi (backup file, reason)
- ⚠️ Health alert (service, status)

### Backup Strategy

- **Lokasi:** `apps/backend/backups/`
- **Format:** `backup-YYYYMMDD-HHmmss.sql.gz`
- **Retention:** 5 backup terakhir
- **Trigger:** Sebelum setiap deployment
- **Restore:** Via `rollback.sh`

### Auto-Scaling (Experimental)

Konfigurasi template tersedia di `.deployment/auto-scaling.config.sh`:

```bash
AUTO_SCALING_ENABLED=false
MIN_REPLICAS=1
MAX_REPLICAS=3
CPU_THRESHOLD=70
MEMORY_THRESHOLD=80
```

**Catatan:** Auto-scaling membutuhkan Docker Swarm atau Kubernetes untuk production use. Dengan standard `docker-compose`, scaling dilakukan secara manual.

### Troubleshooting

**Container conflict:**
```bash
# Force remove container
docker rm -f simak_backend

# Prune stopped containers
docker container prune -f
```

**Database connection failed:**
```bash
# Check database health
docker compose logs db

# Check database connection
docker exec simak_db pg_isready -U simak_user -d simak_vokasi
```

**Migration failed:**
```bash
# Check migration log
docker compose logs backend | grep migration

# Run migration manually
docker exec simak_backend bun run db:migrate
```

**Rollback:**
```bash
# Rollback to latest backup
./rollback.sh
```

### Docker (Production)
```bash
git clone https://github.com/Politeknik-Sorowako/simakjs.git
cd simakjs
docker compose up -d
```
- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3000/swagger`

### Migrasi Database
```bash
cd apps/backend
bun install
bun run db:generate
bun run db:push
```

### Development Mode
```bash
# Terminal 1: Database
docker compose up -d db

# Terminal 2: Backend
cd apps/backend && bun run dev

# Terminal 3: Frontend
cd apps/frontend && bun run dev
```

### Testing
```bash
cd apps/backend && bun test
```
