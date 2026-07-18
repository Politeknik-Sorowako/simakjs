# User Manual: Persiapan Awal Semester

Panduan lengkap persiapan semester akademik di SIMAK Vokasi, mulai dari penyusunan kurikulum OBE hingga pengelolaan KRS.

---

## 1. Ringkasan Alur Persiapan Semester

Persiapan semester dilakukan secara berurutan. Setiap tahap memiliki dependensi terhadap tahap sebelumnya.

```
Tahap 1: Penyusunan Kurikulum OBE
  ├── Visi Misi Prodi
  ├── Profil Lulusan
  ├── CPL (Capaian Pembelajaran Lulusan)
  ├── Bahan Kajian
  └── Mapping: CPL ↔ Profil Lulusan, Bahan Kajian ↔ CPL

          ▼

Tahap 2: Pengelolaan Mata Kuliah
  ├── CRUD Mata Kuliah + SKS
  ├── Kurikulum (daftar MK per semester)
  ├── Angkatan Kurikulum (binding angkatan ke kurikulum)
  └── Mapping: MK ↔ Bahan Kajian, CPMK ↔ CPL

          ▼

Tahap 3: Penyusunan RPS
  ├── RPS per Mata Kuliah per Periode
  ├── Topik pertemuan mingguan
  ├── Rencana Evaluasi (bobot penilaian)
  └── Copy RPS / Bulk Generate

          ▼

Tahap 4: Pembuatan Kelas Kuliah
  ├── Buat kelas (MK + Periode + Nama Kelas)
  ├── Plot Dosen Pengajar
  └── Komponen Nilai

          ▼

Tahap 5: Pengelolaan KRS
  ├── Mahasiswa pilih kelas
  ├── Validasi kurikulum
  ├── Persetujuan (per individu / massal)
  └── Input Nilai
```

---

## 2. Role & Hak Akses

### Daftar Role

| Role | Keterangan |
|------|-----------|
| **Admin** | Pengelola sistem penuh. Mengelola data master, kurikulum, kelas, dan semua modul akademik. |
| **Prodi** (Kaprodi) | Ketua Program Studi. Mengelola kurikulum OBE, CPL, Bahan Kajian, CPMK, dan memantau akademik. |
| **Dosen** | Pengajar. Mengelola RPS, mengajar kelas, mengisi BAP/Presensi, menilai mahasiswa. |
| **Mahasiswa** | Pengguna sistem. Memilih KRS, melihat nilai, mengajukan cuti/yudisium. |

### Hak Akses per Modul

| Modul | Admin | Prodi | Dosen | Mahasiswa |
|-------|:-----:|:-----:|:-----:|:---------:|
| Program Studi | CRUD | - | - | - |
| Periode Akademik | CRUD | - | - | - |
| **Tahap 1: OBE** | | | | |
| Visi Misi Prodi | Hapus | CRUD | Lihat | Lihat |
| Profil Lulusan | CRUD | CRUD | - | - |
| CPL | CRUD | CRUD | Lihat | Lihat |
| Bahan Kajian | CRUD | CRUD | Lihat | - |
| Mapping CPL ↔ Profil Lulusan | CRUD | CRUD | - | - |
| Mapping Bahan Kajian ↔ CPL | CRUD | CRUD | - | - |
| **Tahap 2: Mata Kuliah** | | | | |
| Mata Kuliah | CRUD | Lihat | Lihat | - |
| Kurikulum | CRUD | Lihat | Lihat | - |
| Angkatan Kurikulum | CRUD | - | - | - |
| CPMK | CRUD | CRUD | CRUD | Lihat |
| Sub-CPMK | CRUD | CRUD | CRUD | Lihat |
| Mapping CPMK ↔ CPL | CRUD | CRUD | Lihat | - |
| Mapping MK ↔ Bahan Kajian | CRUD | CRUD | - | - |
| **Tahap 3: RPS** | | | | |
| RPS | CRUD | Lihat | CRUD | Lihat |
| Topik Pertemuan | CRUD | Lihat | CRUD | Lihat |
| Rencana Evaluasi | CRUD | Lihat | CRUD | Lihat |
| **Tahap 4: Kelas** | | | | |
| Kelas Kuliah | CRUD | Lihat | Lihat | Lihat |
| Plot Dosen | CRUD | - | - | - |
| Komponen Nilai | CRUD | CRUD | CRUD | - |
| **Tahap 5: KRS** | | | | |
| KRS | CRUD + Setuju | CRUD + Setuju | Setuju + Nilai | Buat Sendiri |
| Input Nilai | CRUD | CRUD | CRUD | - |

---

## 3. Tahap 1: Penyusunan Kurikulum OBE

**Tujuan:** Menyusun kerangka kurikulum berbasis Outcome-Based Education (OBE) yang mendefinisikan visi, profil lulusan, capaian pembelajaran, dan bahan kajian program studi.

**Role:** Admin, Prodi
**Prerequisites:** Program Studi sudah dibuat, Periode Akademik sudah ditentukan

### 3.1 Visi Misi Prodi

Didefinisikan oleh **Prodi** atau **Admin**.

1. Buka menu **OBE → Visi & Misi Prodi**
2. Pilih Program Studi
3. Isi **Visi**, **Misi**, **Tujuan**, **Sasaran**, dan **Tahun Berlaku**
4. Aktifkan visi misi yang berlaku (hanya satu yang aktif per prodi)

> **Catatan:** Visi misi yang aktif akan menjadi acuan untuk penilaian evaluasi kurikulum.

### 3.2 Profil Lulusan

Didefinisikan oleh **Prodi** atau **Admin**.

1. Buka menu **OBE → Profil Lulusan**
2. Pilih Program Studi
3. Tambah profil lulusan: **Kode** (misal PL-01), **Deskripsi**, **Urutan**
4. Profil lulusan merepresentasikan kompetensi yang dimiliki lulusan

### 3.3 CPL (Capaian Pembelajaran Lulusan)

Didefinisikan oleh **Prodi** atau **Admin**.

1. Buka menu **OBE → CPL**
2. Pilih Program Studi
3. Tambah CPL: **Kode** (misal CPL-01), **Deskripsi**, **Urutan**
4. **Mapping CPL ↔ Profil Lulusan:** Hubungkan setiap CPL ke profil lulusan yang relevan dengan bobot

> **Cara cepat:** Gunakan **Impor CSV** untuk menambah CPL dalam jumlah banyak sekaligus.

### 3.4 Bahan Kajian

Didefinisikan oleh **Prodi** atau **Admin**.

1. Buka menu **OBE → Bahan Kajian**
2. Pilih Program Studi
3. Tambah bahan kajian: **Kode**, **Nama**, **Deskripsi**, **Urutan**
4. **Mapping Bahan Kajian ↔ CPL:** Hubungkan bahan kajian ke CPL yang relevan dengan bobot

### 3.5 Peta OBE

Untuk memantau keterkaitan antar komponen OBE:

1. Buka menu **OBE → Peta OBE**
2. Visualisasi hubungan: **Profil Lulusan → CPL → Bahan Kajian → Mata Kuliah**
3. Pastikan semua CPL terhubung minimal ke satu profil lulusan
4. Pastikan semua bahan kajian terhubung ke minimal satu CPL

---

## 4. Tahap 2: Pengelolaan Mata Kuliah

**Tujuan:** Mengelola data mata kuliah, menyusun kurikulum per semester, dan mendefinisikan CPMK serta mapping ke CPL.

**Role:** Admin (Mata Kuliah, Kurikulum, Angkatan), Prodi/Dosen (CPMK, Mapping)
**Prerequisites:** Tahap 1 selesai (CPL, Bahan Kajian sudah didefinisikan)

### 4.1 Mata Kuliah

Dikelola oleh **Admin**.

1. Buka menu **Mata Kuliah**
2. Tambah mata kuliah: **Kode**, **Nama**, **SKS Total**, rincian SKS (Tatap Muka, Praktek, PL, Simulasi)
3. **Mapping MK ↔ Bahan Kajian:** Klik tombol **BK** pada baris mata kuliah, lalu pilih bahan kajian yang relevan dan bobot kontribusinya

> **Catatan:** Mata Kuliah bersifat global (tidak terikat prodi). Keterkaitan ke prodi melalui kurikulum.

### 4.2 Kurikulum

Dikelola oleh **Admin**.

1. Buka menu **Kurikulum**
2. Tambah kurikulum: **Kode**, **Nama**, **Program Studi**, **Periode Mulai**, jumlah SKS (Lulus/Wajib/Pilihan)
3. **Tambah Mata Kuliah ke Kurikulum:** Klik kurikulum → tentukan MK mana yang masuk semester berapa, beserta rincian SKS dan status Wajib/Pilihan
4. **Kunci kurikulum** (`isLocked`) setelah selesai disusun agar tidak ada perubahan yang tidak terduga

### 4.3 Angkatan Kurikulum

Dikelola oleh **Admin**.

1. Buka menu **Angkatan Kurikulum**
2. Binding angkatan mahasiswa ke kurikulum: **Program Studi**, **Angkatan** (misal 2024), **Kurikulum**
3. Setiap angkatan hanya boleh terikat ke satu kurikulum
4. Binding ini menentukan **Rencana Studi** mahasiswa (mata kuliah apa yang harus diambil per semester)

### 4.4 CPMK (Capaian Pembelajaran Mata Kuliah)

Didefinisikan oleh **Admin**, **Prodi**, atau **Dosen**.

1. Buka menu **OBE → CPMK**
2. Filter mata kuliah: Pilih Prodi → Kurikulum → Mata Kuliah
3. Tambah CPMK: **Kode**, **Deskripsi**, **Bobot MK**
4. **Sub-CPMK:** Detailkan CPMK menjadi sub-capaian jika diperlukan
5. **Mapping CPMK ↔ CPL:** Hubungkan CPMK ke CPL program studi dengan bobot

> **Flow:** CPL (Prodi) → Mapping ke CPMK (Mata Kuliah) → Sub-CPMK → Rencana Evaluasi

---

## 5. Tahap 3: Penyusunan RPS

**Tujuan:** Menyusun Rencana Pembelajaran Semester yang berisi topik pertemuan, metode, dan rencana evaluasi per mata kuliah.

**Role:** Dosen (utama), Admin, Prodi (monitoring)
**Prerequisites:** Tahap 2 selesai (Kurikulum, Mata Kuliah, CPMK sudah didefinisikan), Periode Akademik sudah dibuat

### 5.1 Membuat RPS

1. Buka menu **RPS**
2. Filter: Pilih **Periode → Prodi → Kurikulum → Mata Kuliah**
3. Klik **Tambah RPS** pada mata kuliah yang dipilih
4. Isi:
   - **Deskripsi Mata Kuliah**
   - **CPL Prodi** (CPL yang menjadi target capaian)
   - **Evaluasi Dosen** (penilaian proses pembelajaran)

### 5.2 Topik Pertemuan

1. Pada RPS yang sudah dibuat, tambahkan **Topik** per pertemuan
2. Isi: **Pertemuan ke-**, **Topik**, **Sub-Topik**, **Metode**
3. Hubungkan ke **CPMK** dan **Sub-CPMK** yang relevan

### 5.3 Rencana Evaluasi

1. Di bagian **Rencana Evaluasi**, tentukan komponen penilaian
2. Contoh: UTS (30%), UAS (30%), Tugas (20%), Presensi (10%), Quiz (10%)
3. Setiap komponen evaluasi dapat dihubungkan ke **Sub-CPMK** tertentu dengan bobot

### 5.4 Copy RPS / Bulk Generate

Untuk efisiensi:

- **Copy RPS:** Salin RPS dari periode sebelumnya ke periode baru
- **Bulk Generate:** Generate RPS otomatis berdasarkan struktur kurikulum (semua MK di kurikulum akan dibuatkan RPS)

---

## 6. Tahap 4: Pembuatan Kelas Kuliah

**Tujuan:** Membuat kelas untuk setiap mata kuliah yang akan diampu pada periode akademik, menugaskan dosen, dan menentukan komponen nilai.

**Role:** Admin (kelas + plot dosen), Prodi/Dosen (komponen nilai)
**Prerequisites:** Tahap 3 selesai (RPS sudah dibuat)

### 6.1 Membuat Kelas

1. Buka menu **Kelas Kuliah**
2. Klik **Tambah Kelas**
3. Pilih **Mata Kuliah**, **Periode Akademik**, masukkan **Nama Kelas** (misal TI-A, TI-B)
4. Setiap mata kuliah bisa memiliki beberapa kelas

### 6.2 Plot Dosen Pengajar

1. Pada kelas yang sudah dibuat, klik **Plot Dosen**
2. Pilih dosen yang akan mengajar
3. Masukkan **SKS Beban Mengajar** untuk dosen tersebut
4. Satu kelas bisa memiliki beberapa dosen (misal dosen teori + dosen praktikum)

### 6.3 Komponen Nilai

1. Pada kelas, klik **Komponen Nilai**
2. Tambah komponen sesuai Rencana Evaluasi dari RPS
3. Isi: **Nama Komponen**, **Bobot** (%), hubungkan ke **Sub-CPMK** atau **Rencana Evaluasi**
4. Total bobot harus = 100%

> **Catatan:** Komponen nilai pada kelas akan menjadi acuan saat dosen mengisi nilai.

---

## 7. Tahap 5: Pengelolaan KRS

**Tujuan:** Mahasiswa memilih mata kuliah pada periode akademik, diverifikasi terhadap kurikulum, disetujui dosen/admin, dan diakhiri dengan input nilai.

**Role:** Mahasiswa (pilih + batal), Dosen/Prodi/Admin (setuju + nilai)
**Prerequisites:** Tahap 4 selesai (Kelas Kuliah sudah dibuat dan dosen sudah ditugaskan)

### 7.1 Mahasiswa Memilih KRS

1. Mahasiswa membuka menu **KRS**
2. Panel **Rencana Studi** menampilkan mata kuliah yang tersedia berdasarkan kurikulum angkatan
3. Status setiap MK: **Diambil** (sudah kontrak), **Lulus** (sudah selesai), **Tersedia** (bisa diambil)
4. Mahasiswa memilih kelas yang diinginkan

> **Validasi otomatis:**
> - MK wajib yang belum diambil pada semester yang seharusnya → peringatan
> - MK di luar rencana studi → peringatan
> - MK tidak ada di kurikulum → ditolak
> - Status mahasiswa harus **aktif** (SPP/UKT sudah dibayar)

### 7.2 Persetujuan KRS

**Per Individu:**
1. Dosen PA / Admin / Prodi membuka tab **Kelola KRS**
2. Cari mahasiswa yang mengajukan KRS
3. Klik **Setuju** untuk menyetujui KRS mahasiswa

**Massal:**
1. Buka tab **Persetujuan Massal KRS**
2. Daftar mahasiswa dengan KRS pending ditampilkan
3. Centang mahasiswa yang akan disetujui
4. Klik **Setujui Terpilih** untuk menyetujui sekaligus

### 7.3 Input Nilai

1. Dosen / Admin / Prodi membuka tab **Kelola KRS**
2. Pada baris mahasiswa yang sudah disetujui, klik **Input Nilai**
3. Isi nilai per komponen: **Tugas**, **Quiz**, **UTS**, **UAS**, **Presensi**
4. Sistem akan menghitung otomatis: **Nilai Angka → Nilai Huruf → Nilai Indeks**

---

## 8. Dependency Antar Modul

```
Program Studi ─────────────────────────────────────────────┐
    │                                                       │
    ├── Visi Misi Prodi                                     │
    ├── Profil Lulusan ──┐                                  │
    ├── CPL ─────────────┤── Mapping CPL ↔ Profil Lulusan   │
    ├── Bahan Kajian ────┤── Mapping BK ↔ CPL              │
    │                    │                                  │
    │   ┌────────────────┘                                  │
    │   │                                                   │
    │   ▼                                                   │
    ├── Mata Kuliah ──┐                                     │
    │   │              ├── Mapping MK ↔ BK                  │
    │   │              ├── CPMK → Sub-CPMK                  │
    │   │              │     └── Mapping CPMK ↔ CPL         │
    │   │              │                                    │
    │   ├── Kurikulum ──┤── Kurikulum Mata Kuliah (per Smt) │
    │   │              │                                    │
    │   │              └── Angkatan Kurikulum                │
    │   │                                                   │
    │   ▼                                                   │
    ├── RPS (per MK per Periode)                            │
    │   ├── Topik Pertemuan → hubungkan ke CPMK/Sub-CPMK    │
    │   └── Rencana Evaluasi → hubungkan ke Sub-CPMK        │
    │                                                       │
    │   ▼                                                   │
    ├── Kelas Kuliah (per MK per Periode)                   │
    │   ├── Plot Dosen Pengajar                             │
    │   └── Komponen Nilai → hubungkan ke Sub-CPMK/Evaluasi │
    │                                                       │
    │   ▼                                                   │
    └── KRS (Mahasiswa pilih kelas)                         │
        ├── Validasi Kurikulum (angkatan ↔ kurikulum)       │
        ├── Persetujuan (Dosen/Prodi/Admin)                 │
        └── Input Nilai → KHS                               │
```

---

## 9. Status & Workflow

### Status KRS

```
[Mahasiswa pilih kelsa] ──→ isApproved: false (Pending)
                                    │
                    ┌───────────────┘
                    ▼
        [Dosen/Prodi/Admin setuju] ──→ isApproved: true (Disetujui)
                                              │
                              ┌───────────────┘
                              ▼
                    [Input Nilai] ──→ nilaiAngka, nilaiHuruf, nilaiIndeks terisi
```

### Status Mahasiswa

| Status | Keterangan |
|--------|-----------|
| `aktif` | Mahasiswa aktif, bisa KRS |
| `cuti` | Mahasiswa cuti, tidak bisa KRS |
| `lulus` | Lulus |
| `drop_out` | Keluar/Drop Out |

### Status Visi Misi

- Hanya **satu** visi misi yang aktif (`isAktif`) per program studi
- Aktifkan visi misi terbaru saat memasuki tahun berlaku baru

---

## 10. Tips & Catatan Penting

1. **Urutan wajib:** Jangan membuat kelas sebelum RPS selesai. Jangan buat KRS sebelum kelas ada.
2. **Kurikulum dikunci** (`isLocked`) setelah selesai disusun. Hubungi admin jika perlu buka kunci.
3. **Angkatan Kurikulum wajib diisi** untuk validasi KRS. Tanpa binding ini, mahasiswa tidak bisa memilih KRS.
4. **CPMK wajib terhubung ke CPL** agar alur OBE dari CPL → CPMK → Evaluasi → Nilai bisa dilacak.
5. **Komponen Nilai total harus 100%.** Jika tidak, input nilai akan gagal.
6. **Copy RPS** dari periode sebelumnya untuk menghemat waktu. Review dan update topik yang berubah.
7. **Bulk Generate RPS** cocok digunakan di awal periode baru ketika semua MK di kurikulum perlu RPS baru.
8. **Persetujuan Massal KRS** sangat membantu saat jumlah mahasiswa banyak. Gunakan tab khusus untuk ini.
