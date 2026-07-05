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

## Deploy Production

Menggunakan Docker Compose yang sudah dikonfigurasi. Frontend sudah menggunakan arsitektur multistage (Vite build + Nginx serving dengan SPA fallback). `docker-compose.yml` dapat diadaptasi untuk VPS, AWS ECS, Google Cloud Run, dsb.
