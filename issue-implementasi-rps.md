# Issue: Implementasi Ulang Alur Penyusunan RPS

## Tujuan
Memperbaiki alur penyusunan RPS agar lebih terstruktur: dosen/admin menentukan periode → prodi → kurikulum → mata kuliah, melihat daftar kelas yang mengambil MK, dan dapat menyalin RPS dari periode sebelumnya.

---

## Fase 1: Backend — Endpoint Baru

### 1A. Endpoint Daftar Kelas per MK
**Path:** `GET /kelas-kuliah/by-mk?mataKuliahId=X&periodeId=Y`
**Fungsi:** Mengambil daftar kelas kuliah yang mengambil mata kuliah tertentu di periode tertentu
**Response:**
```json
[
  { "id": 1, "namaKelas": "4A", "dosenPengajar": [{ "nama": "Dr. Budi" }] }
]
```

### 1B. Endpoint Copy RPS
**Path:** `POST /rps/copy`
**Fungsi:** Menyalin RPS (header + topik) dari periode sebelumnya ke periode baru
**Body:** `{ "sourceRpsId": 10, "targetPeriodeId": "20251", "targetMataKuliahId": 5 }`
**Logika:**
1. Ambil RPS sumber + topik
2. Buat RPS baru dengan data yang sama untuk target
3. Copy semua topik ke RPS baru

### 1C. Endpoint Kurikulum by Prodi
**Path:** `GET /kurikulum?prodiId=X`
**Fungsi:** Already exists — filter kurikulum berdasarkan prodi

---

## Fase 2: Frontend Controller — Method Baru

**File:** `apps/frontend/src/controllers/rpsController.ts`
- `getClassesForMk(mataKuliahId, periodeId)` → panggil `/kelas-kuliah/by-mk`
- `copyRps(sourceRpsId, targetPeriodeId, targetMataKuliahId)` → panggil `/rps/copy`

---

## Fase 3: Frontend — Redesign Halaman RPS

**File:** `apps/frontend/src/routes/Rps.tsx`

### Filter Cascading (Wizard-like)
1. **Periode Akademik** — dropdown, default ke periode aktif
2. **Program Studi** — dropdown, menentukan kurikulum yang tersedia
3. **Kurikulum** — dropdown, filter by prodi, menentukan MK yang tersedia
4. **Mata Kuliah** — dropdown, filter by kurikulum, load RPS saat dipilih

### Panel Daftar Kelas
- Tampilkan tabel kelas yang mengambil MK terpilih
- Kolom: Nama Kelas, Dosen Pengajar, Aksi

### Tombol Copy RPS
- Dropdown pilih RPS dari periode sebelumnya
- Tombol "Copy ke Periode Ini"
- Konfirmasi sebelum copy

---

## Fase 4: Frontend — Tombol RPS di Kelas Kuliah

**File:** `apps/frontend/src/routes/KelasKuliah.tsx`
- Tambah tombol `[RPS]` di setiap row tabel
- Navigasi ke `/rps?mataKuliahId=X&periodeId=Y`

**File:** `apps/frontend/src/routes/Rps.tsx`
- Baca query params `mataKuliahId` dan `periodeId` dari URL
- Auto-pilih dropdown sesuai params

---

## Urutan Implementasi

```
Fase 1 (Backend API) ──→ Fase 2 (Controller) ──→ Fase 3 (Halaman RPS) ──→ Fase 4 (Kelas Kuliah)
```

## Checklist Verifikasi
- [ ] GET /kelas-kuliah/by-mk mengembalikan daftar kelas
- [ ] POST /rps/copy berhasil membuat RPS baru + topik
- [ ] Dropdown cascading (Periode → Prodi → Kurikulum → MK) berfungsi
- [ ] Periode default adalah periode aktif
- [ ] Panel daftar kelas muncul saat MK dipilih
- [ ] Tombol Copy RPS berfungsi
- [ ] Tombol [RPS] di Kelas Kuliah navigasi ke /rps dengan benar
- [ ] Query params ?mataKuliahId&periodeId terbaca di URL
