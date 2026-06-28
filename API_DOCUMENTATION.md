# Dokumentasi API SIMAK Vokasi

Dokumentasi REST API lengkap dengan deskripsi, format input (request), dan output (response) untuk setiap endpoint di Sistem Informasi Akademik Vokasi.

## 📁 Kelompok: Autentikasi

### 🔹 Registrasi Pengguna Baru
*Mendaftarkan akun baru ke sistem dengan role admin, dosen, atau mahasiswa.*

- **URL**: `POST /auth/register`
- **Request Body (JSON)**:
  ```json
  {
    "email": "admin@test.com",
    "password": "password123",
    "role": "mahasiswa"
  }
  ```
- **Responses**:
  - **Status `201`**: 
    ```json
    {
      "message": "Registrasi berhasil",
      "user": {
        "id": 1,
        "email": "admin@test.com",
        "role": "admin"
      }
    }
    ```
  - **Status `400`**: 
    ```json
    {
      "error": "Email sudah terdaftar"
    }
    ```

---

### 🔹 Login Pengguna
*Login menggunakan email dan password untuk mendapatkan token JWT.*

- **URL**: `POST /auth/login`
- **Request Body (JSON)**:
  ```json
  {
    "email": "admin@test.com",
    "password": "password123"
  }
  ```
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "message": "Login berhasil",
      "token": "eyJhbGciOiJIUzI1NiIsInR... (JWT string)",
      "user": {
        "id": 1,
        "email": "admin@test.com",
        "role": "admin"
      }
    }
    ```
  - **Status `401`**: 
    ```json
    {
      "error": "Email atau password salah"
    }
    ```

---

## 📁 Kelompok: Program Studi

### 🔹 Daftar Program Studi
*Mengambil semua data program studi yang terdaftar dengan pagination dan filter pencarian.*

- **URL**: `GET /prodi/`
- **Query Parameters**:
  - `page` (string): Opsional (Default: `1`)
  - `limit` (string): Opsional (Default: `10`)
  - `search` (string): Opsional (Default: ``)
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "data": [
        {
          "id": 1,
          "kode": "TI",
          "nama": "Teknik Informatika",
          "jenjang": "D4",
          "idPddikti": null,
          "isSynced": false,
          "lastSyncAt": null,
          "createdAt": null,
          "updatedAt": null
        }
      ],
      "meta": {
        "total": 1,
        "page": 1,
        "limit": 10,
        "totalPages": 1
      }
    }
    ```

---

### 🔹 Tambah Program Studi Baru
*Menambahkan prodi baru (Hanya dapat diakses oleh Admin yang menyertakan token JWT).*

- **URL**: `POST /prodi/`
- **Request Body (JSON)**:
  ```json
  {
    "kode": "TI",
    "nama": "Teknik Informatika",
    "jenjang": "D4",
    "idPddikti": "string"
  }
  ```
- **Responses**:
  - **Status `201`**: 
    ```json
    {
      "id": 1,
      "kode": "TI",
      "nama": "Teknik Informatika",
      "jenjang": "D4",
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "createdAt": null,
      "updatedAt": null
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak. Hanya Admin."
    }
    ```

---

### 🔹 Detail Program Studi
*Mengambil satu data program studi berdasarkan ID.*

- **URL**: `GET /prodi/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "id": 1,
      "kode": "TI",
      "nama": "Teknik Informatika",
      "jenjang": "D4",
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "createdAt": null,
      "updatedAt": null
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

### 🔹 Perbarui Program Studi
*Memperbarui data program studi berdasarkan ID (Hanya dapat diakses oleh Admin).*

- **URL**: `PUT /prodi/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body (JSON)**:
  ```json
  {
    "kode": "string",
    "nama": "string",
    "jenjang": "string",
    "idPddikti": "string"
  }
  ```
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "id": 1,
      "kode": "TI",
      "nama": "Teknik Informatika",
      "jenjang": "D4",
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "createdAt": null,
      "updatedAt": null
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak. Hanya Admin."
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

### 🔹 Hapus Program Studi
*Menghapus program studi berdasarkan ID (Hanya dapat diakses oleh Admin).*

- **URL**: `DELETE /prodi/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "message": "Program Studi berhasil dihapus"
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak. Hanya Admin."
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

## 📁 Kelompok: Mahasiswa

### 🔹 Daftar Mahasiswa
*Mengambil semua data mahasiswa yang terdaftar dengan pagination, filter pencarian, dan relasi program studi.*

- **URL**: `GET /mahasiswa/`
- **Query Parameters**:
  - `page` (string): Opsional (Default: `1`)
  - `limit` (string): Opsional (Default: `10`)
  - `search` (string): Opsional (Default: ``)
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "data": [
        {
          "id": 1,
          "nim": "12345678",
          "nama": "Budi Santoso",
          "email": "budi@test.com",
          "programStudiId": 1,
          "status": "aktif",
          "namaIbuKandung": "Ibu Budi",
          "nik": "1234567890123456",
          "jenisKelamin": "L",
          "tanggalLahir": null,
          "idPddikti": null,
          "isSynced": false,
          "lastSyncAt": null,
          "createdAt": null,
          "updatedAt": null,
          "programStudi": {
            "id": 0,
            "kode": "string",
            "nama": "string",
            "jenjang": "string"
          }
        }
      ],
      "meta": {
        "total": 1,
        "page": 1,
        "limit": 10,
        "totalPages": 1
      }
    }
    ```

---

### 🔹 Tambah Mahasiswa Baru
*Menambahkan mahasiswa baru lengkap dengan data wajib PDDIKTI (Hanya dapat diakses Admin / Dosen dengan token JWT).*

- **URL**: `POST /mahasiswa/`
- **Request Body (JSON)**:
  ```json
  {
    "nim": "12345678",
    "nama": "Budi Santoso",
    "email": "budi@test.com",
    "programStudiId": 1,
    "status": "aktif",
    "idPddikti": "string",
    "namaIbuKandung": "Ibu Budi",
    "nik": "1234567890123456",
    "jenisKelamin": "L",
    "tanggalLahir": "2000-01-01"
  }
  ```
- **Responses**:
  - **Status `201`**: 
    ```json
    {
      "id": 1,
      "nim": "12345678",
      "nama": "Budi Santoso",
      "email": "budi@test.com",
      "programStudiId": 1,
      "status": "aktif",
      "namaIbuKandung": "Ibu Budi",
      "nik": "1234567890123456",
      "jenisKelamin": "L",
      "tanggalLahir": null,
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "createdAt": null,
      "updatedAt": null
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak."
    }
    ```
  - **Status `422`**: 
    ```json
    {
      "message": "Validation error message..."
    }
    ```

---

### 🔹 Detail Mahasiswa
*Mengambil satu data mahasiswa berdasarkan ID beserta relasi program studi.*

- **URL**: `GET /mahasiswa/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "id": 1,
      "nim": "12345678",
      "nama": "Budi Santoso",
      "email": "budi@test.com",
      "programStudiId": 1,
      "status": "aktif",
      "namaIbuKandung": "Ibu Budi",
      "nik": "1234567890123456",
      "jenisKelamin": "L",
      "tanggalLahir": null,
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "createdAt": null,
      "updatedAt": null,
      "programStudi": {
        "id": 0,
        "kode": "string",
        "nama": "string",
        "jenjang": "string"
      }
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

### 🔹 Perbarui Mahasiswa
*Memperbarui data mahasiswa berdasarkan ID (Hanya dapat diakses oleh Admin/Dosen).*

- **URL**: `PUT /mahasiswa/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body (JSON)**:
  ```json
  {
    "nim": "string",
    "nama": "string",
    "email": "user@example.com",
    "programStudiId": 0,
    "status": "string",
    "idPddikti": "string",
    "namaIbuKandung": "string",
    "nik": "string",
    "jenisKelamin": "string",
    "tanggalLahir": "string"
  }
  ```
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "id": 1,
      "nim": "12345678",
      "nama": "Budi Santoso",
      "email": "budi@test.com",
      "programStudiId": 1,
      "status": "aktif",
      "namaIbuKandung": "Ibu Budi",
      "nik": "1234567890123456",
      "jenisKelamin": "L",
      "tanggalLahir": null,
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "createdAt": null,
      "updatedAt": null
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak."
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

### 🔹 Hapus Mahasiswa
*Menghapus data mahasiswa berdasarkan ID (Hanya dapat diakses oleh Admin/Dosen).*

- **URL**: `DELETE /mahasiswa/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "message": "Mahasiswa berhasil dihapus"
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak."
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

## 📁 Kelompok: Dosen

### 🔹 Daftar Dosen
*Mengambil semua data dosen yang terdaftar dengan pagination, filter pencarian, dan relasi program studi.*

- **URL**: `GET /dosen/`
- **Query Parameters**:
  - `page` (string): Opsional (Default: `1`)
  - `limit` (string): Opsional (Default: `10`)
  - `search` (string): Opsional (Default: ``)
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "data": [
        {
          "id": 1,
          "nip": "198701012015011001",
          "nama": "Dr. John Doe",
          "email": "johndoe@test.com",
          "programStudiId": 1,
          "idPddikti": null,
          "isSynced": false,
          "lastSyncAt": null,
          "nidn": "0001018701",
          "nik": "1234567890123456",
          "jenisKelamin": "L",
          "tanggalLahir": null,
          "createdAt": null,
          "updatedAt": null,
          "programStudi": {
            "id": 0,
            "kode": "string",
            "nama": "string",
            "jenjang": "string"
          }
        }
      ],
      "meta": {
        "total": 1,
        "page": 1,
        "limit": 10,
        "totalPages": 1
      }
    }
    ```

---

### 🔹 Tambah Dosen Baru
*Menambahkan dosen baru lengkap dengan NIDN, NIK, dan data lainnya (Hanya dapat diakses Admin).*

- **URL**: `POST /dosen/`
- **Request Body (JSON)**:
  ```json
  {
    "nip": "198701012015011001",
    "nama": "Dr. John Doe",
    "email": "johndoe@test.com",
    "programStudiId": 1,
    "idPddikti": "string",
    "nidn": "0001018701",
    "nik": "1234567890123456",
    "jenisKelamin": "L",
    "tanggalLahir": "1987-01-01"
  }
  ```
- **Responses**:
  - **Status `201`**: 
    ```json
    {
      "id": 1,
      "nip": "198701012015011001",
      "nama": "Dr. John Doe",
      "email": "johndoe@test.com",
      "programStudiId": 1,
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "nidn": "0001018701",
      "nik": "1234567890123456",
      "jenisKelamin": "L",
      "tanggalLahir": null,
      "createdAt": null,
      "updatedAt": null
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak. Hanya Admin."
    }
    ```

---

### 🔹 Detail Dosen
*Mengambil satu data dosen berdasarkan ID beserta relasi program studi.*

- **URL**: `GET /dosen/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "id": 1,
      "nip": "198701012015011001",
      "nama": "Dr. John Doe",
      "email": "johndoe@test.com",
      "programStudiId": 1,
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "nidn": "0001018701",
      "nik": "1234567890123456",
      "jenisKelamin": "L",
      "tanggalLahir": null,
      "createdAt": null,
      "updatedAt": null,
      "programStudi": {
        "id": 0,
        "kode": "string",
        "nama": "string",
        "jenjang": "string"
      }
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

### 🔹 Perbarui Dosen
*Memperbarui data dosen berdasarkan ID (Hanya dapat diakses oleh Admin).*

- **URL**: `PUT /dosen/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body (JSON)**:
  ```json
  {
    "nip": "string",
    "nama": "string",
    "email": "user@example.com",
    "programStudiId": 0,
    "idPddikti": "string",
    "nidn": "string",
    "nik": "string",
    "jenisKelamin": "string",
    "tanggalLahir": "string"
  }
  ```
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "id": 1,
      "nip": "198701012015011001",
      "nama": "Dr. John Doe",
      "email": "johndoe@test.com",
      "programStudiId": 1,
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "nidn": "0001018701",
      "nik": "1234567890123456",
      "jenisKelamin": "L",
      "tanggalLahir": null,
      "createdAt": null,
      "updatedAt": null
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak. Hanya Admin."
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

### 🔹 Hapus Dosen
*Menghapus data dosen berdasarkan ID (Hanya dapat diakses oleh Admin).*

- **URL**: `DELETE /dosen/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "message": "Dosen berhasil dihapus"
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak. Hanya Admin."
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

## 📁 Kelompok: Periode Akademik

### 🔹 Daftar Periode Akademik
*Mengambil semua data periode akademik yang terdaftar dengan pagination dan filter pencarian.*

- **URL**: `GET /periode-akademik/`
- **Query Parameters**:
  - `page` (string): Opsional (Default: `1`)
  - `limit` (string): Opsional (Default: `10`)
  - `search` (string): Opsional (Default: ``)
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "data": [
        {
          "id": "20231",
          "nama": "2023/2024 Ganjil",
          "aktif": false,
          "idPddikti": null,
          "isSynced": false,
          "lastSyncAt": null,
          "createdAt": null,
          "updatedAt": null
        }
      ],
      "meta": {
        "total": 1,
        "page": 1,
        "limit": 10,
        "totalPages": 1
      }
    }
    ```

---

### 🔹 Tambah Periode Akademik Baru
*Menambahkan periode akademik baru (Hanya dapat diakses Admin).*

- **URL**: `POST /periode-akademik/`
- **Request Body (JSON)**:
  ```json
  {
    "id": "20231",
    "nama": "2023/2024 Ganjil",
    "aktif": false,
    "idPddikti": "string"
  }
  ```
- **Responses**:
  - **Status `201`**: 
    ```json
    {
      "id": "20231",
      "nama": "2023/2024 Ganjil",
      "aktif": false,
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "createdAt": null,
      "updatedAt": null
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak. Hanya Admin."
    }
    ```

---

### 🔹 Detail Periode Akademik
*Mengambil satu data periode akademik berdasarkan ID.*

- **URL**: `GET /periode-akademik/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "id": "20231",
      "nama": "2023/2024 Ganjil",
      "aktif": false,
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "createdAt": null,
      "updatedAt": null
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

### 🔹 Perbarui Periode Akademik
*Memperbarui data periode akademik berdasarkan ID (Hanya dapat diakses oleh Admin).*

- **URL**: `PUT /periode-akademik/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body (JSON)**:
  ```json
  {
    "nama": "2023/2024 Ganjil",
    "aktif": false,
    "idPddikti": "string"
  }
  ```
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "id": "20231",
      "nama": "2023/2024 Ganjil",
      "aktif": false,
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "createdAt": null,
      "updatedAt": null
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak. Hanya Admin."
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

### 🔹 Hapus Periode Akademik
*Menghapus data periode akademik berdasarkan ID (Hanya dapat diakses oleh Admin).*

- **URL**: `DELETE /periode-akademik/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "message": "Periode Akademik berhasil dihapus"
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak. Hanya Admin."
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

## 📁 Kelompok: Mata Kuliah

### 🔹 Daftar Mata Kuliah
*Mengambil semua data mata kuliah yang terdaftar dengan pagination, filter pencarian, dan relasi program studi.*

- **URL**: `GET /mata-kuliah/`
- **Query Parameters**:
  - `page` (string): Opsional (Default: `1`)
  - `limit` (string): Opsional (Default: `10`)
  - `search` (string): Opsional (Default: ``)
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "data": [
        {
          "id": 1,
          "kode": "MK001",
          "nama": "Pemrograman Web",
          "sksTotal": 3,
          "sksTatapMuka": 2,
          "sksPraktek": 1,
          "programStudiId": 1,
          "idPddikti": null,
          "isSynced": false,
          "lastSyncAt": null,
          "createdAt": null,
          "updatedAt": null,
          "programStudi": {
            "id": 0,
            "kode": "string",
            "nama": "string",
            "jenjang": "string"
          }
        }
      ],
      "meta": {
        "total": 1,
        "page": 1,
        "limit": 10,
        "totalPages": 1
      }
    }
    ```

---

### 🔹 Tambah Mata Kuliah Baru
*Menambahkan mata kuliah baru (Hanya dapat diakses Admin).*

- **URL**: `POST /mata-kuliah/`
- **Request Body (JSON)**:
  ```json
  {
    "kode": "MK001",
    "nama": "Pemrograman Web",
    "sksTotal": 3,
    "sksTatapMuka": 2,
    "sksPraktek": 1,
    "programStudiId": 1,
    "idPddikti": "string"
  }
  ```
- **Responses**:
  - **Status `201`**: 
    ```json
    {
      "id": 1,
      "kode": "MK001",
      "nama": "Pemrograman Web",
      "sksTotal": 3,
      "sksTatapMuka": 2,
      "sksPraktek": 1,
      "programStudiId": 1,
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "createdAt": null,
      "updatedAt": null
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak. Hanya Admin."
    }
    ```

---

### 🔹 Detail Mata Kuliah
*Mengambil satu data mata kuliah berdasarkan ID beserta relasi program studi.*

- **URL**: `GET /mata-kuliah/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "id": 1,
      "kode": "MK001",
      "nama": "Pemrograman Web",
      "sksTotal": 3,
      "sksTatapMuka": 2,
      "sksPraktek": 1,
      "programStudiId": 1,
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "createdAt": null,
      "updatedAt": null,
      "programStudi": {
        "id": 0,
        "kode": "string",
        "nama": "string",
        "jenjang": "string"
      }
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

### 🔹 Perbarui Mata Kuliah
*Memperbarui data mata kuliah berdasarkan ID (Hanya dapat diakses oleh Admin).*

- **URL**: `PUT /mata-kuliah/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body (JSON)**:
  ```json
  {
    "kode": "string",
    "nama": "string",
    "sksTotal": 0,
    "sksTatapMuka": 0,
    "sksPraktek": 0,
    "programStudiId": 0,
    "idPddikti": "string"
  }
  ```
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "id": 1,
      "kode": "MK001",
      "nama": "Pemrograman Web",
      "sksTotal": 3,
      "sksTatapMuka": 2,
      "sksPraktek": 1,
      "programStudiId": 1,
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "createdAt": null,
      "updatedAt": null
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak. Hanya Admin."
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

### 🔹 Hapus Mata Kuliah
*Menghapus data mata kuliah berdasarkan ID (Hanya dapat diakses oleh Admin).*

- **URL**: `DELETE /mata-kuliah/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "message": "Mata Kuliah berhasil dihapus"
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak. Hanya Admin."
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

## 📁 Kelompok: Kelas Kuliah

### 🔹 Daftar Kelas Kuliah
*Mengambil semua data kelas kuliah dengan pagination, filter pencarian, dan relasi mata kuliah & periode akademik.*

- **URL**: `GET /kelas-kuliah/`
- **Query Parameters**:
  - `page` (string): Opsional (Default: `1`)
  - `limit` (string): Opsional (Default: `10`)
  - `search` (string): Opsional (Default: ``)
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "data": [
        {
          "id": 1,
          "mataKuliahId": 1,
          "periodeId": "20231",
          "namaKelas": "4A",
          "idPddikti": null,
          "isSynced": false,
          "lastSyncAt": null,
          "createdAt": null,
          "updatedAt": null,
          "mataKuliah": {
            "id": 0,
            "kode": "string",
            "nama": "string",
            "sksTotal": 0
          },
          "periodeAkademik": {
            "id": "string",
            "nama": "string",
            "aktif": false
          },
          "dosenPengajarKelas": [
            {
              "id": 0,
              "dosenId": 0,
              "kelasKuliahId": 0,
              "sksBebanMengajar": 0,
              "dosen": {
                "id": 0,
                "nip": "string",
                "nama": "string",
                "email": "string"
              }
            }
          ]
        }
      ],
      "meta": {
        "total": 1,
        "page": 1,
        "limit": 10,
        "totalPages": 1
      }
    }
    ```

---

### 🔹 Tambah Kelas Kuliah Baru
*Menambahkan kelas kuliah baru (Hanya dapat diakses Admin).*

- **URL**: `POST /kelas-kuliah/`
- **Request Body (JSON)**:
  ```json
  {
    "mataKuliahId": 1,
    "periodeId": "20231",
    "namaKelas": "4A",
    "idPddikti": "string"
  }
  ```
- **Responses**:
  - **Status `201`**: 
    ```json
    {
      "id": 1,
      "mataKuliahId": 1,
      "periodeId": "20231",
      "namaKelas": "4A",
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "createdAt": null,
      "updatedAt": null
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak. Hanya Admin."
    }
    ```

---

### 🔹 Detail Kelas Kuliah
*Mengambil satu data kelas kuliah berdasarkan ID beserta relasi mata kuliah & periode akademik.*

- **URL**: `GET /kelas-kuliah/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "id": 1,
      "mataKuliahId": 1,
      "periodeId": "20231",
      "namaKelas": "4A",
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "createdAt": null,
      "updatedAt": null,
      "mataKuliah": {
        "id": 0,
        "kode": "string",
        "nama": "string",
        "sksTotal": 0
      },
      "periodeAkademik": {
        "id": "string",
        "nama": "string",
        "aktif": false
      },
      "dosenPengajarKelas": [
        {
          "id": 0,
          "dosenId": 0,
          "kelasKuliahId": 0,
          "sksBebanMengajar": 0,
          "dosen": {
            "id": 0,
            "nip": "string",
            "nama": "string",
            "email": "string"
          }
        }
      ]
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

### 🔹 Perbarui Kelas Kuliah
*Memperbarui data kelas kuliah berdasarkan ID (Hanya dapat diakses oleh Admin).*

- **URL**: `PUT /kelas-kuliah/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body (JSON)**:
  ```json
  {
    "mataKuliahId": 0,
    "periodeId": "string",
    "namaKelas": "string",
    "idPddikti": "string"
  }
  ```
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "id": 1,
      "mataKuliahId": 1,
      "periodeId": "20231",
      "namaKelas": "4A",
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "createdAt": null,
      "updatedAt": null
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak. Hanya Admin."
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

### 🔹 Hapus Kelas Kuliah
*Menghapus data kelas kuliah berdasarkan ID (Hanya dapat diakses oleh Admin).*

- **URL**: `DELETE /kelas-kuliah/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "message": "Kelas Kuliah berhasil dihapus"
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak. Hanya Admin."
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

## 📁 Kelompok: KRS

### 🔹 Daftar KRS
*Mengambil semua data KRS dengan pagination, filter pencarian (nama/nim mahasiswa), dan relasi mahasiswa & kelas kuliah.*

- **URL**: `GET /krs/`
- **Query Parameters**:
  - `page` (string): Opsional (Default: `1`)
  - `limit` (string): Opsional (Default: `10`)
  - `search` (string): Opsional (Default: ``)
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "data": [
        {
          "id": 1,
          "mahasiswaId": 1,
          "kelasKuliahId": 1,
          "nilaiAngka": null,
          "nilaiHuruf": null,
          "nilaiIndeks": null,
          "idPddikti": null,
          "isSynced": false,
          "lastSyncAt": null,
          "createdAt": null,
          "updatedAt": null,
          "mahasiswa": {
            "id": 0,
            "nim": "string",
            "nama": "string",
            "email": "string"
          },
          "kelasKuliah": {
            "id": 0,
            "namaKelas": "string",
            "periodeId": "string"
          }
        }
      ],
      "meta": {
        "total": 1,
        "page": 1,
        "limit": 10,
        "totalPages": 1
      }
    }
    ```

---

### 🔹 Tambah KRS Baru
*Menambahkan KRS baru (Hanya dapat diakses Admin/Dosen/Mahasiswa dengan verifikasi token JWT).*

- **URL**: `POST /krs/`
- **Request Body (JSON)**:
  ```json
  {
    "mahasiswaId": 1,
    "kelasKuliahId": 1,
    "nilaiAngka": 0,
    "nilaiHuruf": "string",
    "nilaiIndeks": 0,
    "idPddikti": "string"
  }
  ```
- **Responses**:
  - **Status `201`**: 
    ```json
    {
      "id": 1,
      "mahasiswaId": 1,
      "kelasKuliahId": 1,
      "nilaiAngka": null,
      "nilaiHuruf": null,
      "nilaiIndeks": null,
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "createdAt": null,
      "updatedAt": null
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak."
    }
    ```

---

### 🔹 Persetujuan KRS oleh Dosen PA
*Menyetujui semua item KRS mahasiswa di periode akademik tertentu (Hanya dapat diakses Admin/Dosen).*

- **URL**: `POST /krs/approve`
- **Request Body (JSON)**:
  ```json
  {
    "mahasiswaId": 1,
    "periodeId": "20231"
  }
  ```
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "message": "KRS berhasil disetujui",
      "count": 1
    }
    ```
  - **Status `400`**: 
    ```json
    {
      "error": "string"
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak."
    }
    ```

---

### 🔹 Detail KRS
*Mengambil satu data KRS berdasarkan ID beserta relasi mahasiswa & kelas kuliah.*

- **URL**: `GET /krs/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "id": 1,
      "mahasiswaId": 1,
      "kelasKuliahId": 1,
      "nilaiAngka": null,
      "nilaiHuruf": null,
      "nilaiIndeks": null,
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "createdAt": null,
      "updatedAt": null,
      "mahasiswa": {
        "id": 0,
        "nim": "string",
        "nama": "string",
        "email": "string"
      },
      "kelasKuliah": {
        "id": 0,
        "namaKelas": "string",
        "periodeId": "string"
      }
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

### 🔹 Perbarui KRS
*Memperbarui data KRS berdasarkan ID (Dapat diakses oleh Admin/Dosen untuk mengubah nilai, atau Mahasiswa jika KRS belum dikunci).*

- **URL**: `PUT /krs/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body (JSON)**:
  ```json
  {
    "mahasiswaId": 0,
    "kelasKuliahId": 0,
    "nilaiAngka": 0,
    "nilaiHuruf": "string",
    "nilaiIndeks": 0,
    "idPddikti": "string"
  }
  ```
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "id": 1,
      "mahasiswaId": 1,
      "kelasKuliahId": 1,
      "nilaiAngka": null,
      "nilaiHuruf": null,
      "nilaiIndeks": null,
      "idPddikti": null,
      "isSynced": false,
      "lastSyncAt": null,
      "createdAt": null,
      "updatedAt": null
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak."
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

### 🔹 Hapus KRS
*Menghapus data KRS berdasarkan ID.*

- **URL**: `DELETE /krs/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "message": "KRS berhasil dihapus"
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak."
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Data tidak ditemukan"
    }
    ```

---

## 📁 Kelompok: Tagihan

### 🔹 Daftar Tagihan SPP
*Mengambil semua data tagihan SPP dengan pagination, filter pencarian NIM/nama mahasiswa, dan status.*

- **URL**: `GET /tagihan/`
- **Query Parameters**:
  - `page` (string): Opsional (Default: `1`)
  - `limit` (string): Opsional (Default: `10`)
  - `status` (string): Opsional (Default: ``)
  - `search` (string): Opsional (Default: ``)
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "data": [
        {
          "id": 1,
          "mahasiswaId": 1,
          "periodeId": "20231",
          "nominal": 5000000,
          "status": "belum_bayar",
          "tanggalBayar": null,
          "createdAt": null,
          "updatedAt": null,
          "mahasiswa": {
            "id": 0,
            "nim": "string",
            "nama": "string",
            "email": "string",
            "status": "string"
          }
        }
      ],
      "meta": {
        "total": 1,
        "page": 1,
        "limit": 10,
        "totalPages": 1
      }
    }
    ```

---

### 🔹 Generate Tagihan Massal
*Membuat tagihan SPP otomatis untuk seluruh mahasiswa aktif pada periode akademik tertentu.*

- **URL**: `POST /tagihan/generate`
- **Request Body (JSON)**:
  ```json
  {
    "periodeId": "20231"
  }
  ```
- **Responses**:
  - **Status `201`**: 
    ```json
    {
      "message": "Tagihan berhasil dibuat secara massal",
      "count": 10
    }
    ```
  - **Status `400`**: 
    ```json
    {
      "error": "string"
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak."
    }
    ```

---

### 🔹 Bayar/Validasi Pembayaran Tagihan
*Melakukan pencatatan pembayaran tagihan SPP dan secara otomatis mengaktifkan status mahasiswa.*

- **URL**: `POST /tagihan/{id}/bayar`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "message": "Pembayaran berhasil dan mahasiswa diaktifkan",
      "tagihan": {
        "id": 0,
        "status": "string",
        "tanggalBayar": null
      }
    }
    ```
  - **Status `400`**: 
    ```json
    {
      "error": "string"
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak."
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Tagihan tidak ditemukan"
    }
    ```

---

## 📁 Kelompok: Dosen Pengajar Kelas

### 🔹 Daftar Plotting Dosen Pengajar
*Mengambil data plotting dosen ke kelas kuliah.*

- **URL**: `GET /dosen-pengajar/`
- **Query Parameters**:
  - `page` (string): Opsional (Default: `1`)
  - `limit` (string): Opsional (Default: `10`)
  - `kelasKuliahId` (string): Opsional (Default: ``)
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "data": [
        {
          "id": 0,
          "dosenId": 0,
          "kelasKuliahId": 0,
          "sksBebanMengajar": 0,
          "idPddikti": "string",
          "createdAt": null,
          "updatedAt": null,
          "dosen": {
            "id": 0,
            "nip": "string",
            "nama": "string",
            "email": "string"
          },
          "kelasKuliah": {
            "id": 0,
            "namaKelas": "string",
            "periodeId": "string"
          }
        }
      ],
      "meta": {
        "total": 0,
        "page": 0,
        "limit": 0,
        "totalPages": 0
      }
    }
    ```

---

### 🔹 Plot Dosen ke Kelas
*Menambahkan mapping dosen pengajar ke suatu kelas.*

- **URL**: `POST /dosen-pengajar/`
- **Request Body (JSON)**:
  ```json
  {
    "dosenId": 1,
    "kelasKuliahId": 1,
    "sksBebanMengajar": 3,
    "idPddikti": "string"
  }
  ```
- **Responses**:
  - **Status `201`**: 
    ```json
    {
      "id": 0,
      "dosenId": 0,
      "kelasKuliahId": 0,
      "sksBebanMengajar": 0,
      "idPddikti": "string",
      "createdAt": null,
      "updatedAt": null
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "string"
    }
    ```

---

### 🔹 Hapus Plotting Dosen
*Menghapus mapping dosen pengajar dari suatu kelas.*

- **URL**: `DELETE /dosen-pengajar/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "message": "string"
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "string"
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "string"
    }
    ```

---

## 📁 Kelompok: CPMK

### 🔹 Daftar CPMK Mata Kuliah
*Mengambil daftar CPMK berdasarkan ID Mata Kuliah.*

- **URL**: `GET /cpmk/mata-kuliah/{mataKuliahId}`
- **Path Parameters**:
  - `mataKuliahId` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    [
      {
        "id": 1,
        "mataKuliahId": 1,
        "kode": "CPMK-1",
        "deskripsi": "Mampu menerapkan konsep dasar pemrograman"
      }
    ]
    ```

---

### 🔹 Tambah CPMK Baru
*Menambahkan CPMK baru untuk Mata Kuliah tertentu.*

- **URL**: `POST /cpmk/`
- **Request Body (JSON)**:
  ```json
  {
    "mataKuliahId": 1,
    "kode": "CPMK-1",
    "deskripsi": "Mampu menerapkan konsep dasar pemrograman"
  }
  ```
- **Responses**:
  - **Status `201`**: 
    ```json
    {
      "id": 1,
      "mataKuliahId": 1,
      "kode": "CPMK-1",
      "deskripsi": "Mampu menerapkan konsep dasar pemrograman"
    }
    ```

---

### 🔹 Hapus CPMK
*Menghapus CPMK berdasarkan ID.*

- **URL**: `DELETE /cpmk/{id}`
- **Path Parameters**:
  - `id` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "message": "CPMK berhasil dihapus"
    }
    ```

---

## 📁 Kelompok: BAP

### 🔹 Daftar BAP per Kelas
*Mengambil daftar BAP untuk suatu kelas kuliah.*

- **URL**: `GET /bap/kelas/{kelasKuliahId}`
- **Path Parameters**:
  - `kelasKuliahId` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    [
      {
        "id": 1,
        "kelasKuliahId": 1,
        "tanggal": "2026-06-27",
        "pertemuanKe": 1,
        "materi": "Pengenalan dan Dasar Pemrograman",
        "durasiMenit": 100,
        "cpmkId": 1,
        "dosenId": 1
      }
    ]
    ```

---

### 🔹 Tambah BAP Baru
*Menambahkan BAP (Berita Acara Perkuliahan) baru beserta referensi CPMK.*

- **URL**: `POST /bap/`
- **Request Body (JSON)**:
  ```json
  {
    "kelasKuliahId": 1,
    "tanggal": "2026-06-27",
    "pertemuanKe": 1,
    "materi": "Pengenalan dan Dasar Pemrograman",
    "durasiMenit": 100,
    "cpmkId": 1,
    "dosenId": 1
  }
  ```
- **Responses**:
  - **Status `201`**: 
    ```json
    {
      "id": 1,
      "kelasKuliahId": 1,
      "tanggal": "2026-06-27",
      "pertemuanKe": 1,
      "materi": "Pengenalan dan Dasar Pemrograman",
      "durasiMenit": 100,
      "cpmkId": 1,
      "dosenId": 1
    }
    ```

---

## 📁 Kelompok: Presensi

### 🔹 Simpan Presensi Harian
*Menyimpan data presensi mahasiswa untuk satu pertemuan/BAP secara massal.*

- **URL**: `POST /presensi/bulk`
- **Request Body (JSON)**:
  ```json
  {
    "bapId": 0,
    "presensiList": [
      {
        "mahasiswaId": 0,
        "status": "hadir",
        "durasiMangkir": 0
      }
    ]
  }
  ```
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "message": "Presensi berhasil disimpan"
    }
    ```

---

### 🔹 Daftar Presensi per BAP
*Mengambil daftar kehadiran mahasiswa berdasarkan ID BAP.*

- **URL**: `GET /presensi/bap/{bapId}`
- **Path Parameters**:
  - `bapId` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    [
      {
        "id": 1,
        "mahasiswaId": 1,
        "mahasiswaNim": "202301001",
        "mahasiswaNama": "Andi Pratama",
        "status": "hadir",
        "durasiMangkir": 0
      }
    ]
    ```

---

## 📁 Kelompok: Kompensasi

### 🔹 Laporan Rekapitulasi Kompensasi
*Mengambil laporan/rekapitulasi seluruh data kompensasi mahasiswa yang memuat jumlah menit alpa/mangkir dan status penyelesaian.*

- **URL**: `GET /presensi/kompensasi/laporan`
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    [
      {
        "id": 1,
        "nim": "202301001",
        "nama": "Andi Pratama",
        "prodiNama": "Teknik Elektro",
        "totalKompensasi": 120,
        "totalDibayar": 60,
        "sisaKompensasi": 60
      }
    ]
    ```

---

### 🔹 Detail Kompensasi Mahasiswa
*Mengambil detail riwayat kompensasi (absen mangkir) dan pembayaran kompensasi mahasiswa.*

- **URL**: `GET /presensi/kompensasi/mahasiswa/{mahasiswaId}`
- **Path Parameters**:
  - `mahasiswaId` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "mahasiswa": {
        "id": 1,
        "nim": "202301001",
        "nama": "Andi Pratama",
        "email": "andi@example.com",
        "programStudiId": 1
      },
      "historyKompensasi": [
        {
          "id": 1,
          "bapId": 1,
          "status": "alpa",
          "durasiMangkir": 120,
          "createdAt": null,
          "bapPertemuan": 1,
          "bapMateri": "Dasar Pemrograman",
          "bapTanggal": "2026-06-27",
          "poinKompensasi": 120
        }
      ],
      "payments": [
        {
          "id": 1,
          "mahasiswaId": 1,
          "jumlahMenit": 60,
          "tanggal": "2026-06-27",
          "keterangan": "Membersihkan Laboratorium",
          "petugasId": 1,
          "createdAt": null
        }
      ],
      "summary": {
        "totalKompensasi": 120,
        "totalDibayar": 60,
        "sisaKompensasi": 60
      }
    }
    ```

---

### 🔹 Input Pembayaran Kompensasi
*Mencatatkan pengurangan jam kompensasi mahasiswa.*

- **URL**: `POST /presensi/kompensasi/bayar`
- **Request Body (JSON)**:
  ```json
  {
    "mahasiswaId": 0,
    "jumlahMenit": 60,
    "tanggal": "2026-06-27",
    "keterangan": "Membersihkan Laboratorium Komputer"
  }
  ```
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "message": "Pembayaran kompensasi berhasil dicatat"
    }
    ```

---

## 📁 Kelompok: Bimbingan

### 🔹 Monitoring Progres Bimbingan Akademik
*Admin atau Kaprodi memantau seluruh status bimbingan mahasiswa pada periode aktif.*

- **URL**: `GET /bimbingan/monitoring`
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    [
      {
        "mahasiswaId": 1,
        "nim": "202301001",
        "namaMahasiswa": "Andi Pratama",
        "dosenPa": "Dr. Budi Utomo",
        "isApproved": true,
        "lastChatAt": "2026-06-27T13:00:00.000Z"
      }
    ]
    ```

---

### 🔹 Ambil Data Bimbingan & Chat Thread
*Mengambil data bimbingan aktif beserta riwayat thread chat antara Dosen PA dan Mahasiswa.*

- **URL**: `GET /bimbingan/mahasiswa/{mhsId}`
- **Path Parameters**:
  - `mhsId` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "id": 1,
      "mahasiswaId": 1,
      "dosenId": 1,
      "periodeId": "20261",
      "ringkasan": "Siswa aktif berkonsultasi mengenai pemilihan mata kuliah pilihan.",
      "isApproved": true,
      "thread": [
        {
          "id": 1,
          "senderRole": "mahasiswa",
          "pesan": "Halo, saya ingin berkonsultasi mengenai rencana studi saya.",
          "createdAt": null
        }
      ]
    }
    ```

---

### 🔹 Update Ringkasan & Persetujuan Bimbingan
*Dosen PA memperbarui ringkasan bimbingan serta memberikan persetujuan kelayakan/progres bimbingan.*

- **URL**: `PUT /bimbingan/mahasiswa/{mhsId}`
- **Path Parameters**:
  - `mhsId` (string): Wajib
- **Request Body (JSON)**:
  ```json
  {
    "ringkasan": "string",
    "isApproved": true
  }
  ```
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "id": 1,
      "mahasiswaId": 1,
      "dosenId": 1,
      "periodeId": "20261",
      "ringkasan": "Mahasiswa sudah melengkapi revisi draft TA.",
      "isApproved": true
    }
    ```

---

### 🔹 Kirim Pesan Bimbingan
*Mengirimkan pesan konsultasi baru ke thread bimbingan mahasiswa.*

- **URL**: `POST /bimbingan/mahasiswa/{mhsId}/thread`
- **Path Parameters**:
  - `mhsId` (string): Wajib
- **Request Body (JSON)**:
  ```json
  {
    "pesan": "Halo, saya ingin berkonsultasi mengenai rencana studi saya."
  }
  ```
- **Responses**:
  - **Status `201`**: 
    ```json
    {
      "id": 1,
      "bimbinganId": 1,
      "senderRole": "mahasiswa",
      "pesan": "Halo, saya ingin berkonsultasi mengenai rencana studi saya.",
      "createdAt": null
    }
    ```

---

## 📁 Kelompok: Kedisiplinan

### 🔹 Catat Tindakan Indisipliner
*Admin/Dosen mencatat tindakan indisipliner mahasiswa beserta bobot pelanggaran.*

- **URL**: `POST /pelanggaran/`
- **Request Body (JSON)**:
  ```json
  {
    "mahasiswaId": 1,
    "tanggal": "2026-06-27",
    "jenisPelanggaran": "Keterlambatan masuk kelas praktikum",
    "bobotPoin": 5,
    "keterangan": "Terlambat lebih dari 30 menit tanpa alasan sah."
  }
  ```
- **Responses**:
  - **Status `201`**: 
    ```json
    {
      "id": 1,
      "mahasiswaId": 1,
      "tanggal": "2026-06-27",
      "jenisPelanggaran": "Keterlambatan masuk kelas praktikum",
      "bobotPoin": 5,
      "keterangan": "Terlambat lebih dari 30 menit tanpa alasan sah."
    }
    ```

---

### 🔹 Daftar Semua Pelanggaran
*Mengambil semua data pelanggaran mahasiswa untuk keperluan rekap BAAK/Kaprodi.*

- **URL**: `GET /pelanggaran/`
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    [
      {
        "id": 1,
        "mahasiswaId": 1,
        "nim": "202301001",
        "namaMahasiswa": "Andi Pratama",
        "prodiNama": "Teknik Elektro",
        "tanggal": "2026-06-27",
        "jenisPelanggaran": "Keterlambatan masuk kelas praktikum",
        "bobotPoin": 5,
        "keterangan": "Terlambat lebih dari 30 menit tanpa alasan sah.",
        "createdAt": null
      }
    ]
    ```

---

### 🔹 Riwayat Pelanggaran Mahasiswa
*Mengambil daftar riwayat tindakan indisipliner beserta akumulasi poin pelanggaran mahasiswa.*

- **URL**: `GET /pelanggaran/mahasiswa/{mhsId}`
- **Path Parameters**:
  - `mhsId` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "totalPoin": 5,
      "pelanggaranList": [
        {
          "id": 1,
          "tanggal": "2026-06-27",
          "jenisPelanggaran": "Terlambat masuk kelas",
          "bobotPoin": 5,
          "keterangan": "Terlambat lebih dari 15 menit",
          "createdAt": null
        }
      ]
    }
    ```

---

## 📁 Kelompok: KHS & Transkrip

### 🔹 Ambil Kartu Hasil Studi (KHS) Mahasiswa
*Mengambil nilai akademik per semester beserta kalkulasi IP. Akses diblokir bagi mahasiswa jika terdapat tunggakan SPP atau kompensasi mangkir.*

- **URL**: `GET /khs/mahasiswa/{mhsId}/periode/{periodeId}`
- **Path Parameters**:
  - `mhsId` (string): Wajib
  - `periodeId` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "blocked": false,
      "reason": "",
      "detail": null,
      "krsList": [
        {
          "id": 1,
          "nilaiAngka": "85.5",
          "nilaiHuruf": "A",
          "nilaiIndeks": "4.0",
          "isApproved": true,
          "kelasKuliah": {
            "id": 1,
            "namaKelas": "Kelas A"
          },
          "mataKuliah": {
            "id": 1,
            "kode": "MK001",
            "nama": "Dasar Pemrograman",
            "sksTotal": 3
          }
        }
      ],
      "summary": {
        "totalSks": 21,
        "ipSemester": 3.75,
        "ipk": 3.65,
        "totalSksKumulatif": 84
      }
    }
    ```

---

### 🔹 Ambil Transkrip Nilai Akademik Mahasiswa
*Mengambil transkrip nilai kumulatif untuk seluruh mata kuliah yang telah diselesaikan mahasiswa.*

- **URL**: `GET /khs/mahasiswa/{mhsId}/transkrip`
- **Path Parameters**:
  - `mhsId` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "mahasiswa": {
        "id": 1,
        "nim": "202301001",
        "nama": "Andi Pratama"
      },
      "transkripList": [
        {
          "mataKuliahKode": "MK001",
          "mataKuliahNama": "Dasar Pemrograman",
          "sks": 3,
          "nilaiHuruf": "A",
          "nilaiIndeks": 4
        }
      ],
      "totalSksLulus": 84,
      "ipk": 3.65
    }
    ```

---

### 🔹 Cek Kelayakan Ujian Mahasiswa
*Mengecek apakah mahasiswa layak mengikuti ujian pada periode tertentu (tidak memiliki tunggakan SPP & kompensasi mangkir).*

- **URL**: `GET /khs/mahasiswa/{mhsId}/periode/{periodeId}/eligibility`
- **Path Parameters**:
  - `mhsId` (string): Wajib
  - `periodeId` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "mahasiswaId": 1,
      "periodeId": "20261",
      "bimbingan": {
        "isApproved": false,
        "interactionsCount": 0,
        "eligible": false
      },
      "classes": [
        null
      ],
      "overallEligible": true
    }
    ```

---

## 📁 Kelompok: Yudisium & Komponen Nilai

### 🔹 Daftar Pengajuan Yudisium
*Mengambil daftar semua pengajuan yudisium mahasiswa.*

- **URL**: `GET /yudisium/`
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    [
      {
        "id": 1,
        "mahasiswaId": 1,
        "nim": "202301001",
        "nama": "Andi Pratama",
        "judulTa": "Rancang Bangun Sistem Informasi Vokasi",
        "skorToefl": 450,
        "bebasPerpustakaan": true,
        "bebasLab": true,
        "buktiPembayaranWisuda": true,
        "status": "diajukan",
        "catatan": null
      }
    ]
    ```

---

### 🔹 Ambil Detail Pengajuan Yudisium Mahasiswa
*Mengambil status dan kelengkapan berkas pengajuan yudisium mahasiswa.*

- **URL**: `GET /yudisium/mahasiswa/{mhsId}`
- **Path Parameters**:
  - `mhsId` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "id": 1,
      "mahasiswaId": 1,
      "nim": "202301001",
      "nama": "Andi Pratama",
      "judulTa": "Rancang Bangun Sistem Informasi Vokasi",
      "skorToefl": 450,
      "bebasPerpustakaan": true,
      "bebasLab": true,
      "buktiPembayaranWisuda": true,
      "status": "diajukan",
      "catatan": null
    }
    ```
  - **Status `404`**: 
    ```json
    {
      "error": "Pengajuan yudisium tidak ditemukan"
    }
    ```

---

### 🔹 Ajukan Yudisium
*Mengajukan yudisium bagi mahasiswa dengan menyertakan kelengkapan berkas.*

- **URL**: `POST /yudisium/mahasiswa/{mhsId}`
- **Path Parameters**:
  - `mhsId` (string): Wajib
- **Request Body (JSON)**:
  ```json
  {
    "judulTa": "Rancang Bangun Sistem Informasi Vokasi",
    "skorToefl": 450,
    "bebasPerpustakaan": false,
    "bebasLab": false,
    "buktiPembayaranWisuda": false
  }
  ```
- **Responses**:
  - **Status `201`**: 
    ```json
    {
      "id": 1,
      "mahasiswaId": 1,
      "judulTa": "Rancang Bangun Sistem Informasi Vokasi",
      "skorToefl": 450,
      "bebasPerpustakaan": true,
      "bebasLab": true,
      "buktiPembayaranWisuda": true,
      "status": "diajukan"
    }
    ```

---

### 🔹 Update Status Yudisium
*Memperbarui status verifikasi/persetujuan pengajuan yudisium mahasiswa oleh kaprodi/admin.*

- **URL**: `PUT /yudisium/mahasiswa/{mhsId}/status`
- **Path Parameters**:
  - `mhsId` (string): Wajib
- **Request Body (JSON)**:
  ```json
  {
    "status": "string",
    "catatan": "string"
  }
  ```
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "id": 1,
      "mahasiswaId": 1,
      "status": "diverifikasi",
      "catatan": "Berkas lengkap dan sesuai"
    }
    ```

---

### 🔹 Daftar Komponen Nilai Kelas
*Mengambil daftar komponen nilai (uts, uas, tugas, dll) untuk suatu Kelas Kuliah.*

- **URL**: `GET /yudisium/kelas/{kelasKuliahId}/komponen`
- **Path Parameters**:
  - `kelasKuliahId` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    [
      {
        "id": 1,
        "kelasKuliahId": 1,
        "nama": "UTS",
        "bobot": 30
      }
    ]
    ```

---

### 🔹 Simpan Komponen Nilai Kelas
*Menyimpan komponen nilai beserta bobotnya untuk suatu Kelas Kuliah.*

- **URL**: `POST /yudisium/kelas/komponen`
- **Request Body (JSON)**:
  ```json
  {
    "kelasKuliahId": 0,
    "komponenList": [
      {
        "nama": "string",
        "bobot": 0
      }
    ]
  }
  ```
- **Responses**:
  - **Status `200`**: 
    ```json
    [
      {
        "id": 1,
        "kelasKuliahId": 1,
        "nama": "UTS",
        "bobot": 30
      }
    ]
    ```

---

### 🔹 Daftar Nilai Mahasiswa Kelas
*Mengambil daftar nilai mahasiswa beserta nilainya per komponen di suatu Kelas Kuliah.*

- **URL**: `GET /yudisium/kelas/{kelasKuliahId}/nilai`
- **Path Parameters**:
  - `kelasKuliahId` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    [
      {
        "krsId": 1,
        "mahasiswaNim": "202301001",
        "mahasiswaNama": "Andi Pratama",
        "nilaiKomponenList": [
          {
            "komponenNilaiId": 1,
            "namaKomponen": "UTS",
            "bobot": 30,
            "nilai": 85.5
          }
        ]
      }
    ]
    ```

---

### 🔹 Simpan Nilai Mahasiswa Kelas
*Menginput/menyimpan nilai mahasiswa untuk setiap komponen nilai di suatu Kelas Kuliah.*

- **URL**: `POST /yudisium/kelas/nilai`
- **Request Body (JSON)**:
  ```json
  {
    "kelasKuliahId": 0,
    "nilaiList": [
      {
        "krsId": 0,
        "nilaiKomponenList": [
          {
            "komponenNilaiId": 0,
            "nilai": 0
          }
        ]
      }
    ]
  }
  ```
- **Responses**:
  - **Status `200`**: 
    ```json
    [
      {
        "id": 1,
        "mahasiswaId": 1,
        "kelasKuliahId": 1,
        "nilaiAngka": "85.5",
        "nilaiHuruf": "A",
        "nilaiIndeks": "4.0"
      }
    ]
    ```

---

### 🔹 Kunci Nilai Kelas
*Mengunci nilai suatu Kelas Kuliah agar tidak dapat diubah lagi dan nilai diproses ke KHS.*

- **URL**: `POST /yudisium/kelas/{kelasKuliahId}/lock`
- **Path Parameters**:
  - `kelasKuliahId` (string): Wajib
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "id": 1,
      "mataKuliahId": 1,
      "periodeId": "20261",
      "nama": "Kelas A",
      "isLocked": true
    }
    ```

---

## 📁 Kelompok: PDDIKTI

### 🔹 Statistik Neo Feeder PDDIKTI
*Mengambil statistik jumlah sinkronisasi data mahasiswa, kelas kuliah, dan KRS dengan PDDIKTI.*

- **URL**: `GET /pddikti/stats`
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "mahasiswa": {
        "total": 10,
        "synced": 8,
        "unsynced": 2
      },
      "kelasKuliah": {
        "total": 5,
        "synced": 4,
        "unsynced": 1
      },
      "krs": {
        "total": 15,
        "synced": 12,
        "unsynced": 3
      }
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak. Hanya Admin atau Kaprodi/Dosen."
    }
    ```

---

### 🔹 Sinkronisasi Semua Data ke PDDIKTI
*Menjalankan sinkronisasi data program studi, mata kuliah, mahasiswa, kelas kuliah, dan KRS yang belum tersinkronisasi ke Neo Feeder PDDIKTI.*

- **URL**: `POST /pddikti/sync`
- **Request Body**: Tidak ada
- **Responses**:
  - **Status `200`**: 
    ```json
    {
      "message": "Sinkronisasi dengan Neo Feeder PDDIKTI berhasil dilaksanakan.",
      "details": {
        "prodiSynced": 1,
        "mataKuliahSynced": 2,
        "mahasiswaSynced": 5,
        "kelasSynced": 3,
        "krsSynced": 10
      }
    }
    ```
  - **Status `403`**: 
    ```json
    {
      "error": "Akses ditolak. Hanya Admin atau Kaprodi/Dosen."
    }
    ```

---

