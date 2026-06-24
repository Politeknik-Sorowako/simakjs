# SIMAK Vokasi (Sistem Informasi Akademik Vokasi)

## 📌 Maksud Pembuatan Aplikasi
SIMAK Vokasi adalah sebuah platform Sistem Informasi Akademik yang dirancang khusus untuk institusi pendidikan vokasi. Aplikasi ini memfasilitasi pengelolaan data akademik inti seperti manajemen pengguna (mahasiswa, dosen, admin), pendataan program studi, serta pencatatan biodata dasar mahasiswa yang disesuaikan dengan kebutuhan integrasi pelaporan (misalnya ke PDDIKTI).

## 🏢 Arsitektur Sistem
Proyek ini menggunakan arsitektur **Monorepo** yang memisahkan aplikasi ke dalam ranah *frontend* dan *backend*, namun dikelola dalam satu repositori yang sama untuk mempermudah koordinasi, *sharing* kode, dan eksekusi skrip lintas batas (*cross-boundary*).

- **Backend (`apps/backend`)**: Berperan sebagai RESTful API server. Dibangun dengan framework berkinerja tinggi (Elysia.js) di atas *runtime* Bun. Menerima, memvalidasi permintaan, dan berinteraksi dengan database PostgreSQL menggunakan Drizzle ORM.
- **Frontend (`apps/frontend`)**: Berperan sebagai antarmuka pengguna (Client-side). Dibangun menggunakan Solid.js yang dirender menggunakan Vite.
- **Database**: PostgreSQL berjalan melalui kontainer Docker.

## 📂 Struktur Folder dan File
Struktur utama pada *monorepo* ini terbagi sebagai berikut:
```text
simakjs/
├── package.json               # Konfigurasi workspace monorepo (Bun Workspaces)
├── docker-compose.yml         # Konfigurasi container database PostgreSQL
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
│       ├── tailwind.config.js # Konfigurasi utilitas Tailwind
│       ├── vite.config.ts     # Konfigurasi bundler Vite
│       ├── Dockerfile         # Dockerfile untuk deployment frontend
│       └── package.json       # Dependensi spesifik frontend
```

## 🛠️ Teknologi & Library Stack
**Ekosistem Utama:**
- **Bun**: JavaScript *runtime*, *package manager*, *test runner*, dan *bundler* yang sangat cepat (menggantikan Node.js dan npm).

**Backend (`apps/backend`):**
- **Elysia.js**: Framework web berkinerja tinggi berbasis Bun.
- **Drizzle ORM**: TypeScript ORM *headless* modern untuk PostgreSQL.
- **PostgreSQL (`pg`)**: Relational Database Management System.
- **@elysiajs/swagger**: Plugin pembuat dokumentasi API (Swagger UI).
- **@elysiajs/jwt & @elysiajs/cors**: Middleware untuk autentikasi berbasis token JWT dan konfigurasi CORS.

**Frontend (`apps/frontend`):**
- **Solid.js**: Framework UI deklaratif yang reaktif tanpa Virtual DOM.
- **Vite**: *Build tool* dan *dev server* frontend yang sangat cepat.
- **Tailwind CSS**: Framework CSS berbasis utilitas.

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
Backend berjalan pada URL *default*: `http://localhost:3000`. Dokumentasi interaktif Swagger dapat diakses melalui: `http://localhost:3000/swagger`.

### 1. Autentikasi (`/auth`)
- **`POST /auth/register`**: Mendaftarkan pengguna baru (Admin, Dosen, Mahasiswa). Input `email`, `password`, dan `role`. Mengembalikan status registrasi.
- **`POST /auth/login`**: Login menggunakan `email` dan `password`. Mengembalikan pesan berhasil dan **token JWT**. Token ini harus disisipkan pada _header_ `Authorization: Bearer <token>` untuk *endpoint* yang diproteksi.

### 2. Program Studi (`/prodi`)
- **`GET /prodi`**: Mengambil daftar semua program studi. Terbuka untuk umum.
- **`POST /prodi`**: Menambahkan data program studi baru. **Diproteksi:** Hanya bisa diakses oleh *user* dengan role `admin`.

### 3. Mahasiswa (`/mahasiswa`)
- **`GET /mahasiswa`**: Mengambil daftar data mahasiswa beserta informasinya.
- **`POST /mahasiswa`**: Menambahkan data mahasiswa baru. **Diproteksi:** Hanya bisa diakses oleh *user* dengan role `admin` atau `dosen`.

## 🚀 Cara Setup Project (Lokal)
Ikuti langkah-langkah di bawah ini untuk menjalankan *project* ini di mesin lokal (diperlukan `bun` dan `docker` terinstal):

1. **Clone repository & masuk ke direktori proyek:**
   ```bash
   git clone <repo-url>
   cd simakjs
   ```

2. **Install Dependensi:**
   ```bash
   bun install
   ```

3. **Setup Database (Docker):**
   Jalankan PostgreSQL container via Docker Compose.
   ```bash
   docker-compose up -d
   ```

4. **Konfigurasi Environment Variable Backend:**
   ```bash
   cd apps/backend
   cp .env.example .env
   # Sesuaikan kredensial DB pada DATABASE_URL jika berbeda dari docker-compose
   ```

5. **Migrasi Database:**
   ```bash
   # Di dalam folder apps/backend
   bun run db:generate
   bun run db:push
   ```

## ▶️ Cara Menjalankan Aplikasi

Aplikasi memiliki mode _development_ untuk kemudahan pengembangan (mendukung *hot-reload*):

**Menjalankan Backend (API):**
```bash
# Dari root directory
bun run --cwd apps/backend dev
```
Backend akan berjalan di: `http://localhost:3000`.

**Menjalankan Frontend (UI):**
```bash
# Buka terminal baru, jalankan dari root directory
bun run --cwd apps/frontend dev
```
Frontend akan berjalan di port lokal Vite (biasanya `http://localhost:5173`).

**Menjalankan Testing:**
Pengujian menggunakan Bun *built-in test runner*.
```bash
# Menjalankan spesifikasi pengujian (Backend)
bun run --cwd apps/backend test
```

## 🌍 Cara Deploy untuk Production
Karena menggunakan arsitektur monorepo, *deployment* dapat dilakukan menggunakan Docker *multistage* ke layanan manapun (VPS, AWS ECS, Google Cloud Run, Vercel, Railway, dsb). Masing-masing aplikasi telah dibekali dengan file `Dockerfile`.

**1. Build & Run Backend (Docker):**
```bash
cd apps/backend
docker build -t simak-backend .
docker run -p 3000:3000 --env-file .env simak-backend
```
*(Pastikan kontainer memiliki akses jaringan ke server database production).*

**2. Build & Deploy Frontend:**
Untuk *production*, aplikasi SolidJS biasanya di-*build* menjadi *static files* (HTML/CSS/JS).
```bash
cd apps/frontend
bun install
bun run build
```
File hasil kompilasi akan berada di folder `apps/frontend/dist`. Folder `dist` ini dapat disajikan menggunakan *web server* seperti Nginx (seperti diatur pada `Dockerfile` frontend), dikirim ke *bucket* statis (seperti Amazon S3), atau diunggah ke Vercel/Netlify.
