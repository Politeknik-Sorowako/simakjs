# Database Migration Workflow

## Overview

Sistem menggunakan Drizzle ORM dengan migration-based approach yang aman.
Setiap perubahan schema harus melalui migration — tidak boleh langsung edit tabel di database.

## Quick Reference

```bash
# --- Daily Development ---
bun run db:generate      # Generate migration file setelah edit schema.ts
bun run db:safe-migrate  # Apply migration dengan auto-backup (di container)
bunx drizzle-kit migrate # Apply migration langsung (tanpa backup)

# --- Backup & Restore ---
bun run db:backup        # Manual backup database
bun run db:restore       # Restore dari backup (interactive)
bun run db:restore backup_20260708_120000.sql.gz  # Restore file spesifik

# --- Emergency ---
bun run db:reset-baseline  # Reset database dari nol (HAPUS SEMUA DATA)
bun run db:reset           # Truncate semua tabel + seed admin
```

## Workflow Pengembangan

### 1. Saat ada perubahan schema

```bash
# Edit schema.ts
# Lalu generate migration:
bun run db:generate
# Hasil: file baru di apps/backend/drizzle/00010_*.sql

# Review migration file yang dihasilkan
# Commit ke git:
git add apps/backend/src/models/schema.ts apps/backend/drizzle/
git commit -m "feat: add new table for penelitian"
```

### 2. Saat deploy

```bash
# Container akan otomatis menjalankan:
# 1. Backup database
# 2. Ensure enums
# 3. Apply migration
# 4. Start aplikasi

docker compose up --build -d
```

## Fitur Keamanan

### Auto-Backup Sebelum Migration
Setiap kali `db:safe-migrate` dijalankan, sistem akan:
1. Backup database otomatis (pg_dump + gzip)
2. Simpan di `apps/backend/backups/` (atau volume Docker)
3. Retensi: 10 backup terakhir (konfigurabel via `BACKUP_RETENTION`)

### Error Recovery
Jika migration gagal:
- Sistem akan auto-restore dari backup terbaru
- Log error dicetak ke console
- Aplikasi TIDAK akan start sampai migration berhasil

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_DIR` | `./backups` | Direktori penyimpanan backup |
| `BACKUP_RETENTION` | `10` | Jumlah backup yang disimpan |
| `PGHOST` | `localhost` | Host PostgreSQL |
| `PGPORT` | `5432` | Port PostgreSQL |
| `PGDATABASE` | dari DATABASE_URL | Nama database |

## Backup Strategy

### Manual Backup
```bash
# Backup
bun run db:backup

# Lihat daftar backup
ls -lh apps/backend/backups/

# Restore (interactive)
bun run db:restore
```

### Otomatis (via safe-migrate)
```bash
# Setiap kali container start, backup otomatis dibuat
# Disimpan di volume Docker: backup_data
```

### Emergency Restore
```bash
# 1. Daftar backup yang tersedia
ls -lh apps/backend/backups/

# 2. Pilih backup terbaru
bun run db:restore backup_20260708_120000.sql.gz

# 3. Konfirmasi restore
# 4. Restart aplikasi
docker compose restart backend
```

## Troubleshooting

### Migration Gagal
**Gejala:** Container backend crash loop
**Penyebab:** Migration error (conflict schema, enum issues)
**Solusi:**
```bash
# 1. Cek log
docker compose logs backend

# 2. Restore dari backup
docker compose exec backend bun run db:restore

# 3. Fix migration file
# 4. Restart
docker compose restart backend
```

### Enum Conflict
**Gejala:** Error "enum label already exists"
**Penyebab:** Enum value sudah ada di database
**Solusi:** Script `ensure-enums.ts` otomatis handle ini dengan skip jika sudah ada.

### Database Corrupt
**Gejala:** Aplikasi error "relation does not exist"
**Penyebab:** Migration tidak complete
**Solusi:**
```bash
# Reset baseline (HAPUS SEMUA DATA)
bun run db:reset-baseline

# Restore backup terakhir
bun run db:restore
```
