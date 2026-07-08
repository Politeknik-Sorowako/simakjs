# Activity Log: Fix db:push Enum Conflict & Dokumentasi

**Tanggal:** 2026-07-07
**Branch:** `db/kurikulum`

---

## Perbaikan

### 1. Fix Enum Conflict di `drizzle-kit push`
**Masalah:** Error `enum label "cicilan" already exists` saat menjalankan `db:push`.

**Penyebab:** 
- `drizzle-kit` v0.21.4 memiliki bug yang mencoba menambahkan enum values yang sudah ada di database
- Script `ensure-enums.ts` tidak dijalankan sebelum `db:push`

**Perbaikan:**
- Upgrade `drizzle-kit` dari `^0.21.0` ke `^0.31.0`
- Upgrade `drizzle-orm` dari `^0.30.0` ke `^0.45.0`
- Script `db:push` di `package.json` menjalankan `ensure-enums.ts` sebelum `drizzle-kit push`
- Hapus cache binary lama (`node_modules/.bun/drizzle-kit@0.21.4`)

### 2. Dokumentasi
- Pindahkan 8 file `.md` ke folder `docs/` dengan format `NNN_type_subject-YYYYMMDD.md`
- Catat aktivitas pengembangan di `docs/009_*` dan `docs/010_*`

### 3. Lain-lain
- Tambah `apps/backend/app` ke `.gitignore`
- File binary 75MB yang tidak sengaja tercommit
