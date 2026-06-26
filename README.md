# SIMAK Vokasi (Sistem Informasi Akademik Vokasi)

## 📌 Maksud Pembuatan Aplikasi

SIMAK Vokasi adalah sebuah platform Sistem Informasi Akademik yang dirancang khusus untuk institusi pendidikan vokasi. Aplikasi ini memfasilitasi pengelolaan data akademik inti seperti manajemen pengguna (mahasiswa, dosen, admin), pendataan program studi, serta pencatatan biodata dasar mahasiswa yang disesuaikan dengan kebutuhan integrasi pelaporan (misalnya ke PDDIKTI).

## 🏢 Arsitektur Sistem

Proyek ini menggunakan arsitektur **Monorepo** yang memisahkan aplikasi ke dalam ranah _frontend_ dan _backend_, namun dikelola dalam satu repositori yang sama untuk mempermudah koordinasi, _sharing_ kode, dan eksekusi skrip lintas batas (_cross-boundary_).

- **Backend (`apps/backend`)**: Berperan sebagai RESTful API server. Dibangun dengan framework berkinerja tinggi (Elysia.js) di atas _runtime_ Bun. Menerima, memvalidasi permintaan, dan berinteraksi dengan database PostgreSQL menggunakan Drizzle ORM. Menggunakan **HttpOnly Cookies** untuk keamanan sesi autentikasi.
- **Frontend (`apps/frontend`)**: Berperan sebagai antarmuka pengguna (Client-side) berbasis Single Page Application (SPA). Dibangun menggunakan Solid.js yang dirender menggunakan Vite, dan disajikan melalui _web server_ Nginx untuk environment _production_.
- **Database**: PostgreSQL berjalan melalui kontainer Docker.

## 📂 Struktur Folder dan File

Struktur utama pada _monorepo_ ini terbagi sebagai berikut:

```text
simakjs/
├── package.json               # Konfigurasi workspace monorepo (Bun Workspaces)
├── docker-compose.yml         # Konfigurasi container untuk DB, Backend, dan Frontend
├── issue.md                   # Rencana pengembangan dan dokumentasi isu
├── apps/                      # Direktori utama untuk aplikasi-aplikasi dalam monorepo
│   ├── backend/               # Aplikasi REST API Backend
│   │   ├── src/
│   │   │   ├── index.ts       # Entry point utama API server & definisi route/handler
│   │   │   ├── index.test.ts  # File unit test backend
│   │   │   └── db/
│   │   │       ├── index.ts   # Konfigurasi koneksi database
│   │   │       └── schema.ts  # Definisi skema tabel (Drizzle ORM)
│   │   ├── drizzle/           # Folder hasil generate migrasi database
│   │   ├── drizzle.config.ts  # Konfigurasi Drizzle-Kit
│   │   ├── Dockerfile         # Dockerfile untuk deployment backend
│   │   └── package.json       # Dependensi spesifik backend
│   └── frontend/              # Aplikasi UI Frontend
│       ├── src/
│       │   ├── App.tsx        # Komponen utama Solid.js
│       │   ├── index.tsx      # Entry point aplikasi Solid.js
│       │   └── index.css      # Styling menggunakan Tailwind CSS
│       ├── index.html         # Template dasar HTML Vite
│       ├── nginx.conf         # Konfigurasi Nginx untuk SPA Routing
│       ├── tailwind.config.js # Konfigurasi utilitas Tailwind
│       ├── vite.config.ts     # Konfigurasi bundler Vite
│       ├── Dockerfile         # Dockerfile multistage (Build & Nginx Server)
│       └── package.json       # Dependensi spesifik frontend
```

## 🛠️ Teknologi & Library Stack

**Ekosistem Utama:**

- **Bun**: JavaScript _runtime_, _package manager_, _test runner_, dan _bundler_ yang sangat cepat (menggantikan Node.js dan npm).
- **Docker**: Kontainerisasi aplikasi (Backend, Frontend, dan Database).

**Backend (`apps/backend`):**

- **Elysia.js**: Framework web berkinerja tinggi berbasis Bun.
- **Drizzle ORM**: TypeScript ORM _headless_ modern untuk PostgreSQL.
- **PostgreSQL (`pg`)**: Relational Database Management System.
- **@elysiajs/swagger**: Plugin pembuat dokumentasi API (Swagger UI).
- **@elysiajs/jwt & @elysiajs/cookie**: Autentikasi aman berbasis JWT yang disimpan di dalam _HttpOnly Cookie_.
- **@elysiajs/cors**: Middleware untuk konfigurasi CORS dengan dukungan _credentials_.

**Frontend (`apps/frontend`):**

- **Solid.js**: Framework UI deklaratif yang reaktif tanpa Virtual DOM.
- **Vite**: _Build tool_ dan _dev server_ frontend yang sangat cepat.
- **Tailwind CSS**: Framework CSS berbasis utilitas.
- **Zod**: Validasi skema (seperti form input) di sisi _client_.
- **Solid Router**: Library _routing_ standar untuk Solid.js.
- **Nginx**: Web server untuk _serving_ file statis hasil _build_ dengan SPA _fallback_ (`try_files`).

## 🗄️ Skema Database

Database didesain menggunakan PostgreSQL dengan tabel-tabel berikut:

1. **`users`**: Menyimpan kredensial sistem.
   - `id` (Serial/PK)
   - `email` (Varchar, Unique, Not Null)
   - `password` (Text, Hashed)
   - `role` (Enum: 'admin', 'dosen', 'mahasiswa')
   - `createdAt` (Timestamp)

2. **`program_studi`**: Data referensi prodi.
   - `id` (Serial/PK)
   - `kode` (Varchar, Unique)
   - `nama` (Varchar)
   - `jenjang` (Varchar, misal: D3, D4)
   - `idPddikti` (Varchar, Nullable)

3. **`dosen`**: Biodata Dosen.
   - `id` (Serial/PK)
   - `nip` (Varchar, Unique), `nama`, `email` (Unique)
   - `programStudiId` (Integer, FK ke `program_studi`)
   - Atribut opsional: `idPddikti`, `nidn`, `nik`, `jenisKelamin`, `tanggalLahir`

4. **`mahasiswa`**: Biodata Mahasiswa.
   - `id` (Serial/PK)
   - `nim` (Varchar, Unique), `nama`, `email` (Unique)
   - `programStudiId` (Integer, FK ke `program_studi`)
   - Atribut wajib: `status` (aktif/cuti/lulus/drop_out), `namaIbuKandung`, `nik`, `jenisKelamin`, `tanggalLahir`
   - Atribut opsional: `idPddikti`

## 🌐 Daftar API yang Tersedia (Endpoints)

Backend berjalan pada URL _default_: `http://localhost:3000`. Dokumentasi interaktif Swagger dapat diakses melalui: `http://localhost:3000/swagger`.

### 1. Autentikasi (`/auth`)

- **`POST /auth/register`**: Mendaftarkan pengguna baru (Admin, Dosen, Mahasiswa). Input `email`, `password`, dan `role`. Mengembalikan status registrasi.
- **`POST /auth/login`**: Login menggunakan `email` dan `password`. Menyetel **HttpOnly Cookie** yang berisi JWT secara otomatis untuk sesi autentikasi yang aman dari XSS.

### 2. Program Studi (`/prodi`)

- **`GET /prodi`**: Mengambil daftar semua program studi. Terbuka untuk umum.
- **`POST /prodi`**: Menambahkan data program studi baru. **Diproteksi:** Memerlukan sesi admin yang valid dari cookie.

### 3. Mahasiswa (`/mahasiswa`)

- **`GET /mahasiswa`**: Mengambil daftar data mahasiswa beserta informasinya.
- **`POST /mahasiswa`**: Menambahkan data mahasiswa baru. **Diproteksi:** Memerlukan sesi admin atau dosen dari cookie.

## 🚀 Cara Setup dan Menjalankan Aplikasi (Lokal & Docker)

Proyek ini sangat disarankan untuk dijalankan menggunakan Docker Compose yang sudah mengatur jaringan dan dependensi layanan. Diperlukan `bun` dan `docker` terinstal di sistem Anda.

1. **Clone repository & masuk ke direktori proyek:**

   ```bash
   git clone https://github.com/Politeknik-Sorowako/simakjs.git
   cd simakjs
   ```

2. **Jalankan Semua Layanan via Docker Compose:**
   Satu perintah ini akan mem-_build_ image backend dan frontend, kemudian menjalankan database (Port 5433), backend (Port 3000), dan frontend Nginx (Port 8080).

   ```bash
   docker compose up -d
   ```

   _Frontend dapat diakses di: `http://localhost:8080`_
   _Backend dapat diakses di: `http://localhost:3000/swagger`_

3. **Migrasi Database (Setelah Docker berjalan):**
   Masuk ke dalam direktori backend, _install dependencies_, lalu jalankan migrasi agar tabel-tabel dibuat di database.
   ```bash
   cd apps/backend
   bun install
   bun run db:generate
   bun run db:push
   ```

## ▶️ Cara Pengembangan Tanpa Docker (Mode Development)

Jika Anda ingin mengembangkan kode dengan fitur _hot-reload_:

1. **Jalankan Database Saja via Docker:**
   Pastikan PostgreSQL berjalan, Anda dapat mengubah komentar/isolasi DB di `docker-compose.yml` atau menggunakan _instance_ lokal.
   _(Sistem default membaca `localhost:5433` berdasarkan konfigurasi docker, silakan atur variabel `DATABASE_URL` pada `.env` di backend jika berbeda)._

2. **Menjalankan Backend (API):**

   ```bash
   cd apps/backend
   bun install
   bun run dev
   ```

   Backend akan berjalan di: `http://localhost:3000`.

3. **Menjalankan Frontend (UI):**

   ```bash
   cd apps/frontend
   bun install
   bun run dev
   ```

   Frontend akan berjalan di port lokal Vite (biasanya `http://localhost:5173`).

4. **Menjalankan Testing:**
   Pengujian menggunakan Bun _built-in test runner_.
   ```bash
   cd apps/backend
   bun test
   ```

## 🌍 Cara Deploy untuk Production

Karena menggunakan arsitektur monorepo, _deployment_ dapat dilakukan menggunakan Docker ke layanan seperti VPS, AWS ECS, Google Cloud Run, dsb. `docker-compose.yml` dapat diadaptasi langsung untuk server production Anda.
Frontend sudah menggunakan arsitektur multistage (Vite _build_ dan Nginx _serving_ dengan penanganan `try_files` SPA Routing) secara _out-of-the-box_ melalui `apps/frontend/Dockerfile`.
