import type { KompensasiDetailResponse } from '../controllers/presensiController';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTanggal(tanggal?: string | null): string {
  if (!tanggal) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(tanggal);
  if (!m) return tanggal;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return tanggal;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDurasi(totalMenit: number): string {
  const jam = Math.floor(totalMenit / 60);
  const sisa = totalMenit % 60;
  return sisa === 0 ? `${jam} jam` : `${jam} jam ${sisa} menit`;
}

function sumberLabel(sumber: string): string {
  if (sumber === 'perkuliahan') return 'Perkuliahan';
  if (sumber === 'apel') return 'Apel';
  return 'Kompensasi Manual';
}

/**
 * Membuka jendela cetak (window.print) berisi slip rekap kompensasi per mahasiswa:
 * identitas, ringkasan, riwayat kompensasi, dan riwayat pembayaran.
 */
export function printSlipKompensasi(detail: KompensasiDetailResponse): void {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) return;

  const mhs = detail.mahasiswa;
  const summary = detail.summary;

  const riwayatRows = detail.historyKompensasi
    .map(
      (h) => `<tr>
        <td>${escapeHtml(formatTanggal(h.bapTanggal))}</td>
        <td>${escapeHtml(sumberLabel(h.sumber))}</td>
        <td>${escapeHtml((h.verifiedStatus ?? h.status).toUpperCase())}</td>
        <td style="text-align:right">${Number(h.durasiMangkir) || 0} mnt</td>
        <td style="text-align:right">${Number(h.poinKompensasi) || 0} mnt</td>
        <td>${escapeHtml(h.keteranganAdmin || h.keterangan || '-')}</td>
      </tr>`,
    )
    .join('');

  const paymentRows = detail.payments
    .map(
      (p) => `<tr>
        <td>${escapeHtml(formatTanggal(p.tanggal))}</td>
        <td style="text-align:right">${Number(p.jumlahMenit) || 0} mnt</td>
        <td>${escapeHtml(p.keterangan || '-')}</td>
      </tr>`,
    )
    .join('');

  const sisaClass = summary.sisaKompensasi > 0 ? '#b91c1c' : '#15803d';

  const body = `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Rekap Kompensasi - ${escapeHtml(mhs.nama)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 12px; line-height: 1.5; }
  .doc { max-width: 760px; margin: 0 auto; }
  .kop { text-align: center; border-bottom: 2.5px solid #111; padding-bottom: 10px; margin-bottom: 18px; }
  .kop h2 { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
  .kop h3 { font-size: 19px; font-weight: 900; text-transform: uppercase; color: #0f3d91; }
  .kop p { font-size: 10px; color: #555; }
  .judul { text-align: center; margin: 14px 0; }
  .judul h4 { font-size: 14px; font-weight: 800; text-decoration: underline; text-transform: uppercase; }
  .judul p { font-size: 11px; color: #555; }
  .identitas { margin: 12px 0; padding: 12px; background: #f8f8f8; border: 1px solid #ddd; border-radius: 6px; }
  .row { display: grid; grid-template-columns: 190px 1fr; gap: 8px; padding: 2px 0; }
  .row > span:first-child { font-weight: 600; color: #555; }
  .ringkasan { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 14px 0; }
  .kartu { border: 1px solid #ddd; border-radius: 8px; padding: 10px; text-align: center; background: #fbfbfb; }
  .kartu .label { font-size: 10px; text-transform: uppercase; color: #666; font-weight: 700; }
  .kartu .nilai { font-size: 17px; font-weight: 900; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }
  th { background: #0f3d91; color: #fff; font-size: 10px; text-transform: uppercase; padding: 7px 8px; text-align: left; }
  td { border: 1px solid #ddd; padding: 6px 8px; font-size: 11px; }
  tr:nth-child(even) td { background: #f7f7f7; }
  h5 { font-size: 12px; font-weight: 800; text-transform: uppercase; margin: 14px 0 4px; }
  .catatan { font-size: 10px; color: #555; margin-top: 12px; }
  .ttd { margin-top: 34px; padding-top: 14px; border-top: 1px dashed #999; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; text-align: center; font-size: 12px; }
  .ttd > div { display: flex; flex-direction: column; justify-content: space-between; height: 108px; }
  .tanda { font-weight: 700; text-decoration: underline; }
  .ttd p { font-size: 10px; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <div class="doc">
    <div class="kop">
      <h2>Pemerintah Kabupaten Luwu Timur</h2>
      <h3>Politeknik Sorowako</h3>
      <p>Jl. Andi Ahmad No. 1, Sorowako, Luwu Timur, Sulawesi Selatan</p>
    </div>
    <div class="judul">
      <h4>Rekap Kompensasi Mahasiswa</h4>
      <p>Sistem Informasi Akademik Vokasi (SIMAK Vokasi)</p>
    </div>
    <div class="identitas">
      <div class="row"><span>Nama</span><span>${escapeHtml(mhs.nama)}</span></div>
      <div class="row"><span>NIM</span><span>${escapeHtml(mhs.nim)}</span></div>
      <div class="row"><span>Email</span><span>${escapeHtml(mhs.email)}</span></div>
    </div>
    <div class="ringkasan">
      <div class="kartu">
        <div class="label">Total Kompensasi</div>
        <div class="nilai" style="color:#0f3d91">${formatDurasi(summary.totalKompensasi)}</div>
        <div style="font-size:10px;color:#777">${summary.totalKompensasi} menit</div>
      </div>
      <div class="kartu">
        <div class="label">Total Dibayar</div>
        <div class="nilai" style="color:#15803d">${formatDurasi(summary.totalDibayar)}</div>
        <div style="font-size:10px;color:#777">${summary.totalDibayar} menit</div>
      </div>
      <div class="kartu">
        <div class="label">Sisa Kompensasi</div>
        <div class="nilai" style="color:${sisaClass}">${formatDurasi(Math.max(summary.sisaKompensasi, 0))}</div>
        <div style="font-size:10px;color:#777">${Math.max(summary.sisaKompensasi, 0)} menit</div>
      </div>
    </div>
    <h5>A. Riwayat Kompensasi</h5>
    <table>
      <thead><tr><th>Tanggal</th><th>Sumber</th><th>Status</th><th>Durasi</th><th>Poin</th><th>Keterangan</th></tr></thead>
      <tbody>${riwayatRows || '<tr><td colspan="6" style="text-align:center;color:#888">Tidak ada riwayat kompensasi</td></tr>'}</tbody>
    </table>
    <h5>B. Riwayat Pembayaran</h5>
    <table>
      <thead><tr><th>Tanggal</th><th>Jumlah Menit</th><th>Keterangan</th></tr></thead>
      <tbody>${paymentRows || '<tr><td colspan="3" style="text-align:center;color:#888">Belum ada pembayaran</td></tr>'}</tbody>
    </table>
    <p class="catatan">Dokumen ini dicetak otomatis dari SIMAK Vokasi pada ${escapeHtml(new Date().toLocaleString('id-ID'))}.</p>
    <div class="ttd">
      <div>
        <span>Petugas / Admin</span>
        <div>
          <p class="tanda">_______________</p>
          <p>Nama & Tanda Tangan</p>
        </div>
      </div>
      <div>
        <span>Mengetahui,<br />Ketua Program Studi</span>
        <div>
          <p class="tanda">_______________</p>
          <p>Nama & Tanda Tangan</p>
        </div>
      </div>
    </div>
    <div class="no-print" style="margin-top:22px; text-align:center;">
      <button onclick="window.print()" style="padding:10px 22px; font-size:14px;">Cetak / Simpan PDF</button>
    </div>
    <script>window.onload = function(){ window.print(); };</script>
  </div>
</body>
</html>`;

  win.document.open();
  win.document.write(body);
  win.document.close();
}
