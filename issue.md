# Perencanaan Implementasi Fitur Dokumentasi API (Swagger)

Dokumen ini berisi spesifikasi teknis dan perencanaan untuk melengkapi fitur dokumentasi API menggunakan Swagger pada project SIMAK Vokasi. Tugas ini dapat diimplementasikan oleh junior programmer atau model AI pelaksana.

---

## 📌 Tujuan
Project ini telah memiliki setup `@elysiajs/swagger`, namun dokumentasinya belum lengkap. Tujuan tugas ini adalah untuk melengkapi dokumentasi setiap *endpoint* pada file `apps/backend/src/index.ts` agar menyertakan:
1. Penjelasan (*summary* dan *description*) untuk tiap endpoint.
2. Kategori (*tags*) yang sesuai (contoh: "Autentikasi", "Program Studi", "Mahasiswa").
3. Skema Input (*body*) beserta contoh data (mock/contoh data valid).
4. Skema Output (*response*) untuk seluruh skenario (sukses 200/201, maupun gagal 400/401/403/422).

---

## 🛠️ Langkah-Langkah Implementasi

ElysiaJS memungkinkan dokumentasi Swagger secara langsung di objek konfigurasi endpoint (sebagai argumen ketiga di method `.get()` atau `.post()`).

Kamu harus memodifikasi file `apps/backend/src/index.ts` pada bagian tiap endpoint. Gunakan struktur blok `detail` dan `response` dari `t` (Elysia type builder) seperti panduan di bawah ini.

### 1. Endpoint Autentikasi (`/auth/register`)
- **Tag**: `Autentikasi`
- **Summary**: `Registrasi Pengguna Baru`
- **Detail Contoh Input & Output**:
  Tambahkan opsi skema pada `.post('/register', handler, { ...opsi })`:
  ```typescript
  {
    detail: {
      tags: ['Autentikasi'],
      summary: 'Registrasi Pengguna Baru',
      description: 'Mendaftarkan akun baru ke sistem dengan role admin, dosen, atau mahasiswa.'
    },
    body: t.Object({
      email: t.String({ format: 'email', default: 'admin@test.com' }),
      password: t.String({ minLength: 6, default: 'password123' }),
      role: t.Optional(t.Union([t.Literal('admin'), t.Literal('dosen'), t.Literal('mahasiswa')], { default: 'mahasiswa' }))
    }),
    response: {
      201: t.Object({
        message: t.String({ default: 'Registrasi berhasil' }),
        user: t.Object({
          id: t.Integer({ default: 1 }),
          email: t.String({ default: 'admin@test.com' }),
          role: t.String({ default: 'admin' })
        })
      }),
      400: t.Object({
        error: t.String({ default: 'Email sudah terdaftar' })
      })
    }
  }
  ```

### 2. Endpoint Autentikasi (`/auth/login`)
- **Tag**: `Autentikasi`
- **Summary**: `Login Pengguna`
- **Detail Contoh Input & Output**:
  ```typescript
  {
    detail: {
      tags: ['Autentikasi'],
      summary: 'Login Pengguna',
      description: 'Login menggunakan email dan password untuk mendapatkan token JWT.'
    },
    body: t.Object({
      email: t.String({ format: 'email', default: 'admin@test.com' }),
      password: t.String({ default: 'password123' })
    }),
    response: {
      200: t.Object({
        message: t.String({ default: 'Login berhasil' }),
        token: t.String({ default: 'eyJhbGciOiJIUzI1NiIsInR... (JWT string)' }),
        user: t.Object({
          id: t.Integer({ default: 1 }),
          email: t.String({ default: 'admin@test.com' }),
          role: t.String({ default: 'admin' })
        })
      }),
      401: t.Object({
        error: t.String({ default: 'Email atau password salah' })
      })
    }
  }
  ```

### 3. Endpoint Program Studi (`GET /prodi`)
- **Tag**: `Program Studi`
- **Summary**: `Mendapatkan Daftar Program Studi`
- **Detail Contoh Input & Output**:
  Ubah `.get('/', handler)` menjadi memiliki opsi skema:
  ```typescript
  {
    detail: {
      tags: ['Program Studi'],
      summary: 'Daftar Program Studi',
      description: 'Mengambil semua data program studi yang terdaftar.'
    },
    response: {
      200: t.Array(
        t.Object({
          id: t.Integer({ default: 1 }),
          kode: t.String({ default: 'TI' }),
          nama: t.String({ default: 'Teknik Informatika' }),
          jenjang: t.String({ default: 'D4' }),
          idPddikti: t.Union([t.String(), t.Null()], { default: null })
        })
      )
    }
  }
  ```

### 4. Endpoint Program Studi (`POST /prodi`)
- **Tag**: `Program Studi`
- **Summary**: `Tambah Program Studi Baru`
- **Detail Contoh Input & Output**:
  ```typescript
  {
    detail: {
      tags: ['Program Studi'],
      summary: 'Tambah Program Studi Baru',
      description: 'Menambahkan prodi baru (Hanya dapat diakses oleh Admin yang menyertakan token JWT).'
    },
    body: t.Object({
      kode: t.String({ default: 'TI' }),
      nama: t.String({ default: 'Teknik Informatika' }),
      jenjang: t.String({ default: 'D4' })
    }),
    response: {
      201: t.Object({
        id: t.Integer({ default: 1 }),
        kode: t.String({ default: 'TI' }),
        nama: t.String({ default: 'Teknik Informatika' }),
        jenjang: t.String({ default: 'D4' }),
        idPddikti: t.Union([t.String(), t.Null()], { default: null })
      }),
      403: t.Object({
        error: t.String({ default: 'Akses ditolak. Hanya Admin.' })
      })
    }
  }
  ```

### 5. Endpoint Mahasiswa (`GET /mahasiswa`)
- **Tag**: `Mahasiswa`
- **Summary**: `Mendapatkan Daftar Mahasiswa`
- **Detail Contoh Input & Output**:
  ```typescript
  {
    detail: {
      tags: ['Mahasiswa'],
      summary: 'Daftar Mahasiswa',
      description: 'Mengambil semua data mahasiswa yang terdaftar.'
    },
    response: {
      200: t.Array(
        t.Object({
          id: t.Integer({ default: 1 }),
          nim: t.String({ default: '12345678' }),
          nama: t.String({ default: 'Budi Santoso' }),
          email: t.String({ default: 'budi@test.com' }),
          programStudiId: t.Integer({ default: 1 }),
          status: t.String({ default: 'aktif' }),
          namaIbuKandung: t.String({ default: 'Ibu Budi' }),
          nik: t.String({ default: '1234567890123456' }),
          jenisKelamin: t.String({ default: 'L' }),
          tanggalLahir: t.String({ default: '2000-01-01' }),
          idPddikti: t.Union([t.String(), t.Null()], { default: null })
        })
      )
    }
  }
  ```

### 6. Endpoint Mahasiswa (`POST /mahasiswa`)
- **Tag**: `Mahasiswa`
- **Summary**: `Tambah Mahasiswa Baru`
- **Detail Contoh Input & Output**:
  ```typescript
  {
    detail: {
      tags: ['Mahasiswa'],
      summary: 'Tambah Mahasiswa Baru',
      description: 'Menambahkan mahasiswa baru lengkap dengan data wajib PDDIKTI (Hanya dapat diakses Admin / Dosen dengan token JWT).'
    },
    body: t.Object({
      nim: t.String({ default: '12345678' }),
      nama: t.String({ default: 'Budi Santoso' }),
      email: t.String({ format: 'email', default: 'budi@test.com' }),
      programStudiId: t.Integer({ default: 1 }),
      status: t.Optional(t.String({ default: 'aktif' })),
      idPddikti: t.Optional(t.String()),
      namaIbuKandung: t.String({ default: 'Ibu Budi' }),
      nik: t.String({ minLength: 16, maxLength: 16, default: '1234567890123456' }),
      jenisKelamin: t.Union([t.Literal('L'), t.Literal('P')], { default: 'L' }),
      tanggalLahir: t.String({ default: '2000-01-01' })
    }),
    response: {
      201: t.Object({
        id: t.Integer({ default: 1 }),
        nim: t.String({ default: '12345678' }),
        nama: t.String({ default: 'Budi Santoso' }),
        email: t.String({ default: 'budi@test.com' }),
        programStudiId: t.Integer({ default: 1 }),
        status: t.String({ default: 'aktif' }),
        namaIbuKandung: t.String({ default: 'Ibu Budi' }),
        nik: t.String({ default: '1234567890123456' }),
        jenisKelamin: t.String({ default: 'L' }),
        tanggalLahir: t.String({ default: '2000-01-01T00:00:00.000Z' }),
        idPddikti: t.Union([t.String(), t.Null()], { default: null })
      }),
      403: t.Object({
        error: t.String({ default: 'Akses ditolak.' })
      }),
      422: t.Object({
        message: t.String({ default: 'Validation error message...' })
      })
    }
  }
  ```

---

## 🧪 Cara Pengujian & Verifikasi Output
1. Jalankan server secara lokal:
   ```bash
   bun run --cwd apps/backend dev
   ```
2. Buka browser dan arahkan ke: `http://localhost:3000/swagger`.
3. Pastikan antarmuka Swagger sudah mengelompokkan API berdasarkan Tag yang dibuat (Autentikasi, Program Studi, Mahasiswa).
4. Klik tiap endpoint untuk memastikan contoh *request body* dan *response* di berbagai status (200, 201, 400, 401, 403) tampil secara spesifik dan mudah dipahami sesuai skema di atas.
