# Panduan Konfigurasi Automatic Database Sync (Prod ➡️ Staging)

Dokumen ini menjelaskan setup sinkronisasi otomatis database **Production** ke **Staging**.
Karena **Staging & Production berada di VPS yang sama**, mode default adalah **`LOCAL_SYNC=true`**
(pull `pg_dump` langsung dari container production via `docker exec`, tanpa SSH lintas server).

---

## 🗂️ 1. File yang Terlibat

| File | Fungsi |
|---|---|
| `apps/backend/src/scripts/sync-staging-from-prod.ts` | Script utama: dump prod → restore staging → migrate → sanitasi → verifikasi |
| `apps/backend/src/scripts/sanitize-staging.sql` | Sanitasi PII lengkap (email, password, NIM, NIK, tanggal lahir, nama ibu, alamat, telepon, dsb.) |
| `.deployment/sync-staging.config.sh` | Konfigurasi terpusat sync (mode, container, cron, telegram) |
| `scripts/sync-staging-standalone.sh` | Wrapper manual + cron (dengan `flock` anti-tabrakan + notifikasi) |

---

## 📝 2. Konfigurasi `.env` Backend Staging

Isi placeholder pada `.env` di folder staging (`/var/www/simakjs-staging/apps/backend/.env` atau `.env` root proyek):

```env
# Mode sinkronisasi (local = VPS sama)
LOCAL_SYNC=true

# Container db production & staging (VPS sama)
PROD_DB_NAME=simak_vokasi
PROD_DB_USER=simak_user
PROD_DB_CONTAINER=simak_db
STAGING_DB_CONTAINER=simak_db_staging

# URL health check backend staging
STAGING_BACKEND_URL=http://localhost:3001

# Telegram (opsional)
SYNC_TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=xxxxxxxxx:yyyyyyyyy
TELEGRAM_CHAT_ID=-1000000000000
TELEGRAM_ENABLED=true

# Fallback SSH (hanya bila LOCAL_SYNC=false)
PROD_SSH_HOST=localhost
PROD_SSH_USER=nasrulhamid
PROD_SSH_PORT=2200
PROD_SSH_KEY=/home/nasrulhamid/.ssh/id_deploy
```

> Catatan: jangan pernah commit `.env`. `PROD_SSH_KEY` menunjuk key yang tersimpan di VPS
> (`/home/nasrulhamid/.ssh/id_deploy`) — tidak diperlukan untuk mode `LOCAL_SYNC=true`.

---

## ⚙️ 3. Mode: Local (satu VPS) vs SSH (lintas VPS)

| Mode | `LOCAL_SYNC` | Cara ambil dump | Kapan dipakai |
|---|---|---|---|
| **Local (default)** | `true` | `docker exec simak_db pg_dump ...` | Staging & Production di VPS sama |
| SSH (fallback) | `false` | `ssh user@host "docker exec simak_db pg_dump ..."` | Staging di VPS berbeda |

Untuk SSH lintas VPS, tetap terapkan **key isolation** versi lama (wrapper `allow_pg_dump.sh` +
`command=` di `authorized_keys`) agak SSH key hanya boleh menjalankan `pg_dump`.

---

## 🧪 4. Pengujian Manual / Dry Run

Dari folder `apps/backend` di VPS:

```bash
# Simulasi tanpa menyentuh DB (memverifikasi env & alur)
bun run db:sync-staging --dry-run

# Eksekusi langsung
bun run db:sync-staging
```

Atau lewat wrapper (logging + flock + telegram):

```bash
cd /var/www/simakjs-staging
./scripts/sync-staging-standalone.sh --dry-run
./scripts/sync-staging-standalone.sh
```

Log ada di `apps/backend/db-migrations.log` dan `logs/sync-staging-YYYYMMDD.log`.

---

## ⏰ 5. Penjadwalan Otomatis 02:00 WITA / GMT+8

### Opsi A — cron (sederhana)

```bash
# Edit crontab untuk user yang menjalankan deploy
crontab -e
```

Tambahkan (pastikan `CRON_TZ` didukung; jika tidak, konversi manual ke zona server):

```cron
CRON_TZ=Asia/Makassar
0 2 * * * /var/www/simakjs-staging/scripts/sync-staging-standalone.sh >> /var/www/simakjs-staging/logs/sync-staging-cron.log 2>&1
```

### Opsi B — systemd timer (disarankan, robust)

Buat `/etc/systemd/system/simak-db-sync.service`:

```ini
[Unit]
Description=SIMAK Staging Database Auto-Sync Service
After=network.target docker.service

[Service]
Type=oneshot
WorkingDirectory=/var/www/simakjs-staging
ExecStart=/var/www/simakjs-staging/scripts/sync-staging-standalone.sh
```

Buat `/etc/systemd/system/simak-db-sync.timer`:

```ini
[Unit]
Description=Trigger SIMAK Staging Database Sync at 02:00 WITA (GMT+8)

[Timer]
OnCalendar=*-*-* 02:00:00 Asia/Makassar
Persistent=true

[Install]
WantedBy=timers.target
```

Aktifkan:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now simak-db-sync.timer
sudo systemctl status simak-db-sync.timer
```

`Persistent=true` → bila server mati saat 02:00, task dijalankan segera setelah hidup.
`flock` di wrapper mencegah dua proses sync berjalan bersamaan.

---

## ✔️ 6. Verifikasi yang Dilakukan Script

Setelah restore + sanitasi, script otomatis mengecek:
1. Jumlah baris tabel inti (`users`, `mahasiswa`, `dosen`, `mata_kuliah`).
2. **PII tersisa harus 0**: tidak ada lagi email asli, NIK/NIM/Nama Ibu yang belum di-mask (kueri verifikasi di akhir `sanitize-staging.sql`).
3. `GET /health` backend staging mengembalikan **HTTP 200**.
4. Kirim notifikasi Telegram sukses/gagal (bila `SYNC_TELEGRAM_ENABLED=true`).

---

## 🔐 7. Sanitasi PII (Detail)

`sanitize-staging.sql` memask (idempotent, dalam satu transaksi):
- **`users`**: email → `user_<id>@staging.simak.local`, nama → `User <id>`, avatar NULL, password → `Staging123!` (bcrypt), kecuali super_admin/admin.
- **`dosen`**: email, nama, nik/nidn, tempat & tanggal lahir.
- **`mahasiswa`**: email, nama, **nim**, **nik**, **nama ibu kandung**, tempat & tanggal lahir, alamat (jalan/rt/rw/kodePos).
- **`applications`** (calon mahasiswa): nik, nama lengkap, telepon, nama ibu, alamat, tempat/tanggal lahir, no pendaftar.
- `password_resets` di-truncate.
- Kueri verifikasi menampilkan jumlah data asli yang tersisa (target 0).

---

## 🧹 8. Rollback & Keamanan

- Backup staging dibuat sebelum restore oleh `safe-migrate.ts` (di `apps/backend/backups`).
- Manual: `bun run db:backup` sebelum menjalankan sync.
- Dump temp `temp_prod_dump_<random>.sql` berhak akses `0o600`, dihapus otomatis setelah diproses.
- **Fail-fast guard**: dump < 10 KB dibatalkan agar tidak merusak DB staging.