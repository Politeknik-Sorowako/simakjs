# Rencana Implementasi: Formasi Mata Kuliah Berbasis Kurikulum

## Tujuan
- Menyusun formasi mata kuliah dalam suatu kurikulum sehingga untuk menyusun RPS dan KRS cukup memanggil kurikulumnya
- Menjaga konsistensi paket kurikulum antar angkatan

## Arsitektur

```
┌──────────────┐     ┌─────────────────────┐     ┌──────────────┐
│   angkatan    │────▶│ angkatan_kurikulum   │◀────│  kurikulum   │
│  (mahasiswa)  │     │ (mapping table)      │     │  + MK/sem    │
└──────┬───────┘     └─────────────────────┘     └──────┬───────┘
       │                                                 │
       │         ┌──────────────┐                        │
       └────────▶│     KRS      │◀─── sugesti + validasi─┘
                 │  (pilih kelas)│
                 └──────────────┘
                       │
                 ┌─────┴────────┐
                 │  kelas_kuliah │ (kelas tersedia per periode)
                 └─────┬────────┘
                       │
                 ┌─────┴────────┐
                 │     RPS      │◀─── bulk generate dari kurikulum
                 │  (topik/eval)│
                 └──────────────┘
```

## Fase 1: Database

### 1A. Tabel baru `angkatan_kurikulum`
- id: serial PK
- programStudiId: FK → program_studi.id
- angkatan: varchar(4), not null
- kurikulumId: FK → kurikulum.id
- isActive: boolean default true
- created_at, updated_at
- UNIQUE (programStudiId, angkatan) — satu kurikulum aktif per prodi per angkatan

### 1B. Field `isLocked` di tabel `kurikulum`
- is_locked: boolean default false
- Otomatis true saat kurikulum dipakai oleh binding angkatan aktif

## Fase 2: Backend module `angkatan-kurikulum`

### Endpoints
| Method | Path | Fungsi |
|--------|------|--------|
| GET | /angkatan-kurikulum | List semua binding (filter by prodiId) |
| GET | /angkatan-kurikulum/aktif | Lookup kurikulum aktif untuk mahasiswa |
| POST | /angkatan-kurikulum | Bind angkatan ke kurikulum |
| PUT | /angkatan-kurikulum/:id | Ganti kurikulum untuk angkatan |
| DELETE | /angkatan-kurikulum/:id | Hapus binding |

## Fase 3: Backend Bulk Generate RPS

### Endpoint Baru
| Method | Path | Fungsi |
|--------|------|--------|
| POST | /rps/bulk-generate | Generate RPS massal dari kurikulum |

Request: { kurikulumId, semester, periodeId }
- Ambil semua MK dari kurikulumMataKuliah berdasarkan kurikulumId + semester
- Buat RPS kosong untuk setiap MK yang belum punya RPS di periode tersebut

## Fase 4: Backend KRS Sugesti & Validasi

### Endpoint Baru
| Method | Path | Fungsi |
|--------|------|--------|
| GET | /krs/rencana-studi?mahasiswaId=&periodeId= | Rencana studi dari kurikulum + progress |
| GET | /krs/validasi?mahasiswaId=&periodeId= | Validasi KRS mahasiswa terhadap rencana kurikulum |

## Fase 5-7: Frontend
- Halaman AngkatanKurikulum untuk binding
- Bulk generate UI di halaman RPS
- Panel rencana studi + validasi di halaman KRS
