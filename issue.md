# Issue: Perancangan Skema Database Master Data PDDIKTI ke Database Lokal

**Deskripsi Singkat:**
Tugas ini berfokus pada perancangan skema database lokal (PostgreSQL) yang akan digunakan untuk menyimpan dan mensinkronisasikan master data dari Feeder PDDIKTI. Skema ini nantinya akan diimplementasikan ke dalam *codebase* menggunakan Drizzle ORM.

**Objektif:**
Menghasilkan struktur database yang optimal di sisi aplikasi lokal berdasarkan referensi data PDDIKTI, beserta kode implementasi skema menggunakan Drizzle ORM.

---

## 📋 Task List (Langkah Implementasi)

Silakan kerjakan task berikut secara berurutan:

- [ ] **Task 1: Ekstraksi Definisi Struktur Database PDDIKTI**
  - Cari dan kumpulkan informasi struktur database dari dokumentasi resmi, web service, atau kamus data Feeder PDDIKTI.
  - Identifikasi entitas master data (nama tabel, kolom, tipe data asli, serta relasi antar tabel / *Primary Key* & *Foreign Key*).
  - *Output yang diharapkan:* Dokumen referensi singkat (bisa berupa teks/markdown) mengenai struktur asli dari PDDIKTI.

- [ ] **Task 2: Analisis & Penyesuaian untuk PostgreSQL Lokal**
  - Lakukan analisis terhadap struktur data asli dari Task 1.
  - Tentukan penyesuaian yang diperlukan agar struktur tersebut optimal untuk PostgreSQL dan kebutuhan aplikasi lokal.
  - *Panduan:* 
    - Pertimbangkan konvensi penamaan (misal: *snake_case*).
    - Mapping tipe data yang tepat (misal: kapan menggunakan `varchar`, `text`, `uuid`, `timestamp`, dll).
    - Pertimbangkan penambahan kolom khusus untuk kebutuhan sinkronisasi, misalnya kolom `id_pddikti` (sebagai referensi origin), `last_sync` (waktu sinkronisasi terakhir), atau `status_sync`.

- [ ] **Task 3: Rekomendasi Daftar Tabel Lokal Utama & Referensi**
  - Berdasarkan analisis, tentukan daftar tabel apa saja yang wajib dibuat di database lokal.
  - *Rekomendasi tabel minimal:*
    1. `program_studi` (Prodi)
    2. `mahasiswa`
    3. `dosen`
    4. `mata_kuliah`
    5. `kelas_kuliah`
    6. `nilai` (atau KRS/Aktivitas Kuliah Mahasiswa)
  - Identifikasi juga tabel referensi pendukung (misalnya: `agama`, `status_mahasiswa`, `periode_akademik` / semester).

- [ ] **Task 4: Definisi Detail Skema Tabel Lokal**
  - Buat draf detail skema untuk setiap tabel yang direkomendasikan di Task 3.
  - Definisikan secara spesifik:
    - Nama kolom
    - Tipe data PostgreSQL yang digunakan
    - *Constraints* (seperti `NOT NULL`, `UNIQUE`, dll)
    - *Indexes* untuk optimasi query (terutama pada kolom pencarian dan *foreign keys*)
    - Relasi antar tabel.
  - Pastikan menyertakan *audit fields* standar seperti `created_at` dan `updated_at`.

- [ ] **Task 5: Implementasi Skema dengan Drizzle ORM**
  - Terjemahkan definisi detail skema dari Task 4 menjadi kode TypeScript menggunakan Drizzle ORM.
  - Buat file definisi skema (misalnya di direktori `src/db/schema/` atau disesuaikan dengan arsitektur *codebase*).
  - Pastikan mendefinisikan tabel (`pgTable`), tipe data Drizzle, *Primary Keys*, dan *Foreign Keys* (`references()`) dengan akurat.
  - Definisikan juga Drizzle `relations` agar proses *querying* relasional lebih mudah di sisi aplikasi.
  - *Output yang diharapkan:* Kode TypeScript berisi skema Drizzle ORM yang *type-safe* dan siap di-generate menjadi *migration file*.

---

## ✅ Kriteria Penerimaan (Acceptance Criteria)
1. Terdapat *mapping* atau penjelasan jelas mengenai konversi tipe data dan struktur dari PDDIKTI ke PostgreSQL.
2. Daftar tabel yang diperlukan (minimal tabel mahasiswa, prodi, dosen, mata kuliah, kelas, dan nilai) sudah terdefinisi secara jelas beserta relasinya.
3. Struktur database dirancang optimal dan mencakup kolom pembantu untuk kebutuhan proses sinkronisasi (*id_pddikti*, *last_sync*).
4. Kode skema Drizzle ORM valid (tidak ada *type error* TypeScript), mematuhi *best practices*, dan siap untuk dijalankan perintah `drizzle-kit generate`.
