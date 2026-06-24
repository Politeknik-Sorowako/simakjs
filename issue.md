# Perancangan Database & API Backend untuk Integrasi Feeder PDDIKTI

Dokumen ini berisi instruksi dan spesifikasi teknis untuk mengadaptasi skema database (Drizzle ORM) dan endpoint API (ElysiaJS) agar sesuai dengan standar data **Neo Feeder PDDIKTI**. Tugas ini harus diimplementasikan oleh junior developer atau model AI pelaksana.

---

## 📌 Tujuan Utama
1. Menambahkan kolom referensi ID PDDIKTI (`id_pddikti`) pada tabel program studi, dosen, dan mahasiswa untuk memetakan record lokal dengan server Neo Feeder.
2. Melengkapi kolom biodata wajib mahasiswa dan dosen sesuai dengan kamus data Neo Feeder (terutama `nama_ibu_kandung`, `nik`, `jenis_kelamin`, `tanggal_lahir`, dan `nidn` untuk dosen).
3. Menyesuaikan skema validasi request di endpoint ElysiaJS agar mendukung input kolom baru tersebut.

---

## 🛠️ Langkah-Langkah Implementasi

### 1. Update Skema Drizzle ORM
Buka file schema di: `apps/backend/src/db/schema.ts`

Lakukan perubahan skema berikut:

#### A. Tabel `program_studi`
* Tambahkan kolom `idPddikti`:
  ```typescript
  idPddikti: varchar('id_pddikti', { length: 50 }), // Nullable UUID/string dari PDDIKTI
  ```

#### B. Tabel `dosen`
* Tambahkan kolom `idPddikti`:
  ```typescript
  idPddikti: varchar('id_pddikti', { length: 50 }), // Nullable
  ```
* Ubah/tambahkan kolom identitas agar sesuai standar PDDIKTI:
  * Tambahkan `nidn: varchar('nidn', { length: 50 }).unique()` (NIDN adalah identifier utama dosen di PDDIKTI).
  * Tambahkan `nik: varchar('nik', { length: 16 })` (16 digit nomor kependudukan).
  * Tambahkan `jenisKelamin: varchar('jenis_kelamin', { length: 1 })` (Menyimpan 'L' atau 'P').
  * Tambahkan `tanggalLahir: date('tanggal_lahir')` (Tipe tanggal lahir).

#### C. Tabel `mahasiswa`
* Tambahkan kolom `idPddikti`:
  ```typescript
  idPddikti: varchar('id_pddikti', { length: 50 }), // Nullable
  ```
* Lengkapi kolom biodata wajib PDDIKTI:
  * Tambahkan `namaIbuKandung: varchar('nama_ibu_kandung', { length: 255 }).notNull()` (Wajib di PDDIKTI untuk validasi).
  * Tambahkan `nik: varchar('nik', { length: 16 }).notNull().unique()` (Wajib untuk pelaporan).
  * Tambahkan `jenisKelamin: varchar('jenis_kelamin', { length: 1 }).notNull()` (Nilai: 'L' / 'P').
  * Tambahkan `tanggalLahir: date('tanggal_lahir').notNull()` (Tipe tanggal lahir).

---

### 2. Jalankan Migrasi Database
Setelah mengubah file skema, buat dan jalankan migrasi database menggunakan Bun:

```bash
# Berada di workspace root atau apps/backend
bun run --cwd apps/backend db:generate
bun run --cwd apps/backend db:push
```
*Pastikan Docker Container database PostgreSQL dalam kondisi berjalan (`docker compose up -d`)*.

---

### 3. Update Input Validasi API di ElysiaJS
Buka file entry point di: `apps/backend/src/index.ts`

Sesuaikan skema validasi input (Elysia `t.Object`) pada endpoint-endpoint berikut:

#### A. Endpoint POST `/mahasiswa`
Sesuaikan schema body validasi agar menyertakan kolom baru yang wajib dikirim oleh frontend:
* `namaIbuKandung`: `t.String()`
* `nik`: `t.String({ minLength: 16, maxLength: 16 })`
* `jenisKelamin`: `t.Union([t.Literal('L'), t.Literal('P')])`
* `tanggalLahir`: `t.String()` (format ISO Date / string YYYY-MM-DD)
* `idPddikti`: `t.Optional(t.String())`

Contoh perubahan pada skema validator Elysia:
```typescript
{
  body: t.Object({
    nim: t.String(),
    nama: t.String(),
    email: t.String({ format: 'email' }),
    programStudiId: t.Integer(),
    status: t.Optional(t.String()),
    namaIbuKandung: t.String(),
    nik: t.String({ minLength: 16, maxLength: 16 }),
    jenisKelamin: t.Union([t.Literal('L'), t.Literal('P')]),
    tanggalLahir: t.String(),
    idPddikti: t.Optional(t.String()),
  })
}
```

Pastikan data yang dikirim oleh body dimasukkan ke dalam query insert Drizzle:
```typescript
const [newMhs] = await db.insert(mahasiswa).values({
  nim: body.nim,
  nama: body.nama,
  email: body.email,
  programStudiId: body.programStudiId,
  status: body.status || 'aktif',
  namaIbuKandung: body.namaIbuKandung,
  nik: body.nik,
  jenisKelamin: body.jenisKelamin,
  tanggalLahir: new Date(body.tanggalLahir), // sesuaikan parsing jika menggunakan tipe date()
  idPddikti: body.idPddikti
}).returning();
```

---

## 🧪 Cara Verifikasi & Testing
1. **Lakukan Type-Check**: Pastikan tidak ada compiler error pada typescript dengan menjalankan:
   ```bash
   bun x tsc --noEmit --project apps/backend/tsconfig.json
   ```
2. **Uji Endpoint**: Jalankan server dev (`bun run --cwd apps/backend dev`) lalu buka dokumentasi Swagger di `http://localhost:3000/swagger`. Coba lakukan POST `/mahasiswa` dengan payload lengkap untuk memastikan data berhasil masuk ke database PostgreSQL lokal.

---

# Perencanaan Unit Testing API Backend SIMAK Vokasi

Dokumen ini berisi spesifikasi skenario pengujian unit (unit testing) untuk seluruh endpoint API yang tersedia pada backend SIMAK Vokasi. Tugas ini harus diimplementasikan oleh junior developer atau model AI pelaksana menggunakan runner bawaan Bun (`bun:test`).

---

## 📌 Ketentuan Umum Pengujian
1. **Konsistensi Data**: Untuk setiap berkas pengujian (atau skenario), lakukan pembersihan data (truncate/delete) terlebih dahulu pada tabel terkait (`users`, `mahasiswa`, `dosen`, `program_studi`) sebelum test dijalankan (`beforeEach` atau `beforeAll`) agar pengujian bersifat independen dan konsisten.
2. **Lingkungan Pengujian**: Jalankan pengujian pada basis data testing atau pastikan data local aman untuk dihapus selama testing.
3. **HTTP Client**: Uji endpoint ElysiaJS secara langsung menggunakan `app.handle(new Request(...))` untuk simulasi request HTTP yang cepat tanpa perlu menjalankan server secara penuh.

---

## 🛠️ Daftar Skenario Pengujian Per API

### 1. Autentikasi (`/auth`)

#### A. Registrasi (`POST /auth/register`)
* **Skenario Sukses**:
  * Registrasi user baru dengan email valid, password minimal 6 karakter, dan peran `mahasiswa`/`dosen`/`admin`.
  * Verifikasi response memiliki status `201`, pesan sukses, dan data user tanpa password.
* **Skenario Gagal**:
  * Registrasi dengan email yang sudah terdaftar sebelumnya (duplicate email).
  * Registrasi dengan format email tidak valid (misal: `nama-salah.com`).
  * Registrasi dengan password kurang dari 6 karakter.

#### B. Login (`POST /auth/login`)
* **Skenario Sukses**:
  * Login dengan email dan password yang valid.
  * Verifikasi response memiliki status `200`, mengembalikan token JWT, serta data user.
* **Skenario Gagal**:
  * Login dengan email yang belum terdaftar.
  * Login dengan email valid tetapi password salah.

---

### 2. Program Studi (`/prodi`)

#### A. Mengambil Data (`GET /prodi`)
* **Skenario Sukses**:
  * Mendapatkan list program studi. Verifikasi response mengembalikan array (kosong atau berisi data).

#### B. Tambah Data (`POST /prodi`)
* **Skenario Sukses**:
  * Admin berhasil menambahkan data Program Studi baru (menyertakan token JWT Admin pada header `Authorization`).
* **Skenario Gagal (Otorisasi)**:
  * Dosen mencoba menambahkan Program Studi baru (menghasilkan status `403 Forbidden`).
  * Mahasiswa mencoba menambahkan Program Studi baru (menghasilkan status `403 Forbidden`).
  * Request tanpa token JWT mencoba menambahkan data (menghasilkan status `403` atau `401`).

---

### 3. Mahasiswa (`/mahasiswa`)

#### A. Mengambil Data (`GET /mahasiswa`)
* **Skenario Sukses**:
  * Mendapatkan list mahasiswa. Verifikasi response mengembalikan array.

#### B. Tambah Data (`POST /mahasiswa`)
* **Skenario Sukses**:
  * Admin berhasil menambahkan mahasiswa baru lengkap dengan kolom wajib PDDIKTI (header JWT Admin).
  * Dosen berhasil menambahkan mahasiswa baru (header JWT Dosen).
* **Skenario Gagal**:
  * Mahasiswa mencoba menambahkan mahasiswa baru (menghasilkan status `403 Forbidden`).
  * Request tanpa token JWT mencoba menambahkan mahasiswa (menghasilkan status `403` atau `401`).
  * Request dengan field wajib PDDIKTI yang tidak lengkap (misal: `namaIbuKandung`, `nik` tidak 16 digit, atau `jenisKelamin` selain L/P).

---

## 🚀 Panduan Eksekusi bagi Pelaksana
1. Buat berkas test baru, misalnya di `apps/backend/src/index.test.ts`.
2. Gunakan import `describe`, `it`, `expect`, `beforeEach` dari `bun:test`.
3. Manfaatkan database helper untuk mengosongkan tabel sebelum pengujian dijalankan.
4. Jalankan perintah berikut untuk menguji:
   ```bash
   bun test
   ```
