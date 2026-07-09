# Rencana Implementasi: Dashboard Enhancement SIMAK

## Latar Belakang

Berdasarkan analisis struktur data dan frontend, dashboard SIMAK saat ini sangat minim:
- Dashboard Admin hanya menampilkan 3 angka statis (total prodi, dosen, mahasiswa)
- Dashboard Dosen hanya teks deskriptif (tidak ada data aktual)
- Dashboard Mahasiswa menampilkan IPK **hardcoded "3.85"** (tidak fetch dari API)
- Tidak ada library chart/visualisasi data
- Filter global Prodi/Periode di Navbar tidak digunakan di Dashboard

## Tujuan

1. Menyajikan data akademik secara visual dan informatif
2. Memanfaatkan data yang sudah ada di database
3. Membuat dashboard interaktif dengan filter global

## Prioritas Implementasi

### P0 — Bug Fix
- IPK hardcoded → fetch dari `GET /bimbingan/mahasiswa/{id}/akademik-summary`

### P1 — Chart Library + Admin Dashboard
- Install Chart.js
- Buat reusable chart components (Bar, Pie, Line, StatCard)
- Ringkasan keuangan: donut chart status pembayaran
- Mahasiswa per prodi: bar chart
- Mahasiswa per status: stacked bar
- KRS pending approval: stat card + link
- Tren pembayaran: line chart
- PDDIKTI sync status: badge per entitas

### P1 — Dosen Dashboard
- Kelas diampu (nama MK, jadwal, jumlah mahasiswa)
- Jadwal hari ini
- BAP pending (pertemuan terakhir)
- KRS waiting approval
- Mahasiswa bimbingan
- Rekap BKD semester ini

### P2 — Mahasiswa Dashboard
- IPK & IP per semester (transkrip)
- Status tagihan (nominal, terbayar, sisa)
- Jadwal hari ini
- Presensi per MK (% kehadiran)
- Kompensasi menit
- Progress bimbingan

### P3 — Keuangan Dashboard
- Revenue summary cards
- Status pembayaran pie chart
- Tunggakan per prodi

### P3 — Infrastruktur
- Skeleton loading
- Export PDF/Excel
- Hubungkan filter global Navbar ke widget dashboard

## Arsitektur

### Komponen Baru
| Komponen | Path | Fungsi |
|----------|------|--------|
| `Charts/index.tsx` | `src/components/charts/` | Re-export chart components |
| `Charts/BarChart.tsx` | `src/components/charts/` | Bar chart reusable |
| `Charts/PieChart.tsx` | `src/components/charts/` | Donut/pie chart reusable |
| `Charts/LineChart.tsx` | `src/components/charts/` | Line chart reusable |
| `Charts/StatCard.tsx` | `src/components/charts/` | Stat card dengan ikon |

### Modifikasi File
| File | Perubahan |
|------|-----------|
| `routes/Dashboard.tsx` | Enhancement besar: admin, dosen, mahasiswa sections |
| `routes/KeuanganDashboard.tsx` | Tambah summary cards + chart |
| `package.json` | Tambah `chart.js` dependency |

## API Endpoints yang Digunakan

| Endpoint | Untuk Dashboard |
|----------|----------------|
| `GET /bimbingan/mahasiswa/{id}/akademik-summary` | IPK mahasiswa, sisa kompensasi, poin pelanggaran |
| `GET /khs/mahasiswa/{id}/transkrip` | Riwayat IP per semester (trend) |
| `GET /tagihan` | Status pembayaran (filter by status prodi) |
| `GET /pddikti/stats` | Status sinkronisasi PDDIKTI |
| `GET /dosen-pengajar?dosenId={id}&periodeId={id}` | Kelas diampu dosen |
| `GET /krs/pending-students` | KRS pending approval |
| `GET /bimbingan/monitoring` | Mahasiswa bimbingan per dosen |
| `GET /periode-akademik` | Periode aktif |

## Cara Menjalankan

```bash
bun install
bun run dev
```
