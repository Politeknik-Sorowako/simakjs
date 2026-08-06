# Panduan Konfigurasi Automatic Database Sync (Prod ➡️ Staging)

Dokumen ini menjelaskan langkah-langkah setup integrasi sinkronisasi otomatis database **Production** ke **Staging** menggunakan mekanisme *pull* pada VPS secara aman.

---

## 🔒 1. Konfigurasi Production Wrapper Script & SSH Key Isolation

Untuk mencegah SSH Key Staging disalahgunakan melakukan perintah shell bebas pada server Production, kita buat skrip pembatas di server **Production**.

### Langkah di VPS Production:

1. Buat file pembatas `/usr/local/bin/allow_pg_dump.sh`:

```bash
sudo nano /usr/local/bin/allow_pg_dump.sh
```

Isi berkas tersebut dengan:

```bash
#!/bin/bash
# Restricted execution script for Staging DB Sync SSH Key
PROD_DB_NAME="${PROD_DB_NAME:-simak_vokasi}"
PROD_DB_USER="${PROD_DB_USER:-postgres}"

# Jalankan pg_dump dengan opsi teraman (read-only locks)
exec pg_dump -U "$PROD_DB_USER" -d "$PROD_DB_NAME" --clean --if-exists --no-owner --no-acl
```

Beri izin eksekusi:

```bash
sudo chmod +x /usr/local/bin/allow_pg_dump.sh
```

2. Tambahkan public key VPS Staging ke `~/.ssh/authorized_keys` di VPS **Production** dengan perintah terbatas:

```bash
# Tambahkan baris berikut ke ~/.ssh/authorized_keys milik user deploy di Production
command="/usr/local/bin/allow_pg_dump.sh",no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAAC3NzaC1lZDI1NTE5... staging-pull@simak
```

---

## 🛠️ 2. Environment Variables VPS Staging

Di VPS **Staging**, pastikan variabel environment berikut terpasang di file `.env` backend:

```env
PROD_SSH_HOST=103.x.x.x              # IP VPS Production
PROD_SSH_USER=deploy                 # SSH user VPS Production
PROD_SSH_KEY=~/.ssh/id_rsa_staging_pull
PROD_DB_NAME=simak_vokasi
PROD_DB_USER=postgres
DATABASE_URL=postgresql://simak_user:password@localhost:5432/simak_staging
```

---

## 🧪 3. Pengujian Manual / Dry Run

Uji skrip sinkronisasi dari folder `apps/backend` di VPS Staging:

```bash
# Dry run (simulasi tanpa menyentuh DB)
bun run db:sync-staging --dry-run

# Eksekusi langsung
bun run db:sync-staging
```

---

## ⏰ 4. Penjadwalan Otomatis dengan Systemd

Buat file Service di VPS Staging `/etc/systemd/system/simak-db-sync.service`:

```ini
[Unit]
Description=SIMAK Staging Database Auto-Sync Service
After=network.target postgresql.service

[Service]
Type=oneshot
User=ubuntu
WorkingDirectory=/var/www/simakjs/apps/backend
ExecStart=/home/ubuntu/.bun/bin/bun run db:sync-staging
EnvironmentFile=/var/www/simakjs/apps/backend/.env

[Install]
WantedBy=multi-user.target
```

Buat file Timer di VPS Staging `/etc/systemd/system/simak-db-sync.timer`:

```ini
[Unit]
Description=Trigger SIMAK Staging Database Sync at 02:00 WITA

[Timer]
OnCalendar=*-*-* 02:00:00 Asia/Makassar
Persistent=true

[Install]
WantedBy=timers.target
```

Aktifkan timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now simak-db-sync.timer
sudo systemctl status simak-db-sync.timer
```

---

## 📝 5. Audit Log & Keamanan Data

* Audit log sinkronisasi tersimpan di `apps/backend/db-migrations.log`.
* File dump temporary dibuat dengan nama acak (`temp_prod_dump_<random>.sql`) dan hak akses `0o600` (hanya bisa dibaca oleh pemilik proses).
* Dump file di bawah 10 KB akan otomatis dibatalkan (*Fail-Fast Guard*) untuk mencegah kerusakan DB Staging.
* Data sensitif pengguna (email & password) otomatis disanitasi pasca-restore.

---

## ✅ Pre-Merge Checklist

- [x] **Database connectivity tested in target staging environment:** Teruji menggunakan `DATABASE_URL` via Bun runtime & `psql` restore stream.
- [x] **SSH key pair generation and placement completed:** Terkonfigurasi dengan pembatas wrapper script (`allow_pg_dump.sh`) & `authorized_keys`.
- [x] **Systemd configuration reviewed and environment paths verified:** Unit service (`simak-db-sync.service`) & timer (`simak-db-sync.timer`) telah disesuaikan path lokasi runtime Bun & `.env`.
- [x] **All required environment variables documented and validated:** Fungsi `validateEnv()` di `sync-staging-from-prod.ts` memvalidasi `DATABASE_URL` dan `PROD_SSH_HOST` sebelum eksekusi.

