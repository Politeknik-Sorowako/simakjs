# Panduan Konfigurasi Automatic Database Sync (Prod ➡️ Staging)

Dokumen ini menjelaskan langkah-langkah setup integrasi sinkronisasi otomatis database **Production** ke **Staging** menggunakan mekanisme *pull* pada VPS.

---

## 🔒 1. Konfigurasi SSH Key Isolation (VPS Staging ➡️ VPS Production)

Jalankan perintah ini di VPS **Staging**:

```bash
# 1. Generate SSH Key khusus untuk Staging Pull
ssh-keygen -t ed25519 -C "staging-pull@simak" -f ~/.ssh/id_rsa_staging_pull -N ""

# 2. Salin isi public key
cat ~/.ssh/id_rsa_staging_pull.pub
```

Di VPS **Production**, tambahkan isi public key tersebut ke file `~/.ssh/authorized_keys` milik user deploy (`deploy`):

```bash
# Tambahkan ke ~/.ssh/authorized_keys di VPS Prod
command="pg_dump -U postgres -d simak_vokasi --clean --if-exists --no-owner --no-acl",no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAAC3NzaC1lZDI1NTE5... staging-pull@simak
```
*(Catatan: Menggunakan sintaks `command="..."` membatasi SSH key tersebut HANYA bisa mengeksekusi `pg_dump` demi keamanan).*

---

## 🛠️ 2. Environment Variables VPS Staging

Di VPS Staging, pastikan environment variable berikut terpasang di file `.env` milik backend:

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

## ⏰ 4. Penjadwalan Otomatis dengan Systemd (Rekomendasi)

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

## 📝 5. Audit Log & Troubleshooting

* Audit log sinkronisasi tersimpan di file `apps/backend/db-migrations.log`.
* Anda dapat mengecek log systemd via:
  ```bash
  sudo journalctl -u simak-db-sync.service -n 50
  ```
