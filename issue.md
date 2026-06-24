# Refactor Arsitektur Backend (ElysiaJS + Drizzle ORM)

## Deskripsi Tugas
Melakukan refactoring pada struktur folder dan kode di dalam `backend/src` agar sesuai dengan arsitektur yang lebih modular, bersih, dan mudah di-maintain. Fungsionalitas aplikasi saat ini (Auth, Prodi, dan Mahasiswa) harus dipastikan tetap berjalan dengan normal tanpa ada perubahan pada *behavior* API.

## Struktur Direktori Tujuan
Struktur direktori `backend/src` akan diubah menjadi seperti berikut:
- **`routes`**: berisi definisi routing ElysiaJS.
- **`controllers`**: berisi logic yang menghubungkan request/response dengan business logic.
- **`models`**: berisi definisi schema Drizzle ORM.
- **`services`**: berisi business logic inti (database query, hashing, dll).
- **`schemas`**: berisi schema validasi request/response menggunakan TypeBox (`t` dari Elysia).
- **`middlewares`**: berisi custom middleware ElysiaJS (contoh: Auth middleware).
- **`utils`**: berisi fungsi-fungsi utility pendukung (contoh: koneksi DB).
- **`plugins`**: berisi konfigurasi plugin ElysiaJS (contoh: Swagger, CORS).
- **`app.ts`**: berisi konfigurasi utama aplikasi ElysiaJS (menggabungkan semua route dan middleware).
- **`index.ts`**: entry point untuk menjalankan server.
- **`.env`**: berisi environment variables.

---

## Tahapan Implementasi

Berikut adalah langkah-langkah implementasi yang harus diikuti secara berurutan:

### Tahap 1: Persiapan Struktur Folder
1. Buat folder-folder berikut di dalam `backend/src`:
   - `routes`
   - `controllers`
   - `models`
   - `services`
   - `schemas`
   - `middlewares`
   - `utils`
   - `plugins`

### Tahap 2: Pemindahan Models & Setup Database (`utils` & `models`)
1. Pindahkan file schema Drizzle ORM dari `src/db/schema.ts` ke `src/models/schema.ts` (atau pecah menjadi `users.model.ts`, `prodi.model.ts`, dll jika memungkinkan).
2. Pindahkan/buat koneksi database dari `src/db/index.ts` ke `src/utils/db.ts`.
3. Pastikan export/import path disesuaikan pada file yang membutuhkan koneksi DB.

### Tahap 3: Pembuatan Schemas Validasi (`schemas`)
1. Ekstrak semua skema TypeBox (`t.Object`, `t.String`, dll) yang ada di blok `body` dan `response` pada file `index.ts` saat ini.
2. Buat file `src/schemas/auth.schema.ts`, `src/schemas/prodi.schema.ts`, dan `src/schemas/mahasiswa.schema.ts`.
3. Export skema-skema tersebut untuk digunakan di *routes* nantinya.

### Tahap 4: Pembuatan Services (Business Logic) (`services`)
1. Buat file `src/services/auth.service.ts`:
   - Pindahkan logika `register` (hashing password dengan `Bun.password.hash`, insert ke DB).
   - Pindahkan logika `login` (cek user di DB, verify password).
2. Buat file `src/services/prodi.service.ts`:
   - Pindahkan logika `getAllProdi` dan `createProdi`.
3. Buat file `src/services/mahasiswa.service.ts`:
   - Pindahkan logika `getAllMahasiswa` dan `createMahasiswa`.

*Catatan: Service tidak boleh bersentuhan langsung dengan Context Elysia (seperti `set.status`). Service hanya menerima parameter biasa dan mengembalikan data atau melempar Error.*

### Tahap 5: Pembuatan Controllers (`controllers`)
1. Buat controller yang memanggil Service di atas:
   - `src/controllers/auth.controller.ts`
   - `src/controllers/prodi.controller.ts`
   - `src/controllers/mahasiswa.controller.ts`
2. Di dalam controller, tangani pemanggilan fungsi service, tangkap *return data* atau *error*, lalu atur HTTP status (melalui `set.status`) dan kembalikan response yang sesuai.

### Tahap 6: Pembuatan Middlewares & Plugins (`middlewares` & `plugins`)
1. **Middlewares**: Buat file `src/middlewares/auth.middleware.ts` untuk memindahkan logika pemanggilan `.derive({ getCurrentUser })` dan ekstraksi JWT token dari headers.
2. **Plugins** (Opsional/Bisa langsung di app.ts): Buat file `src/plugins/swagger.plugin.ts` dan konfigurasi *cors* jika ingin dirapikan.

### Tahap 7: Pembuatan Routes (`routes`)
1. Buat file routing:
   - `src/routes/auth.routes.ts`
   - `src/routes/prodi.routes.ts`
   - `src/routes/mahasiswa.routes.ts`
2. Pada file route, buat instance `new Elysia({ prefix: '...' })`, pasangkan validasi (dari `schemas`), dan hubungkan logic-nya ke `controllers`.

### Tahap 8: Konfigurasi App (`app.ts`)
1. Buat file `src/app.ts`.
2. Lakukan inisialisasi aplikasi utama Elysia.
3. Daftarkan (use) global plugins: `swagger`, `cors`, `jwt`.
4. Daftarkan global middleware (contoh: auth middleware).
5. Gabungkan semua routes menggunakan `app.use(authRoutes).use(prodiRoutes).use(mahasiswaRoutes)`.
6. Export instance `app`.

### Tahap 9: Penyesuaian Entry Point (`index.ts`)
1. Ubah `src/index.ts` agar hanya berfungsi sebagai *entry point*.
2. Import `app` dari `app.ts`.
3. Panggil `app.listen(process.env.PORT || 3000)`.

### Tahap 10: Pengujian
1. Jalankan server backend (sebaiknya menggunakan `bun run dev`).
2. Pastikan tidak ada *typescript/import errors*.
3. Lakukan pengetesan pada semua endpoint (Register, Login, Get Prodi, Create Prodi, Get Mahasiswa, Create Mahasiswa) melalui Swagger UI atau Postman/cURL untuk memastikan semua masih berfungsi persis seperti sebelumnya.

---

## Acceptance Criteria
- [ ] Folder structure `backend/src` sudah sesuai ketentuan.
- [ ] Business logic terpisah di `services`.
- [ ] Definisi endpoint (URL, Validasi Schema TypeBox) terpisah di `routes` dan `schemas`.
- [ ] Akses / handling Context Elysia terpisah di `controllers`.
- [ ] Aplikasi berjalan tanpa error (0 import error, 0 runtime error).
- [ ] Semua endpoint dapat di-hit dan mengembalikan response dan status code yang sesuai (sama persis dengan logic di file index.ts sebelumnya).
