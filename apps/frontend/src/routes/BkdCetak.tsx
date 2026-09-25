import { useSearchParams } from '@solidjs/router';
import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { useAuth } from '../contexts/AuthContext';
import { type BkdRekap, bkdController } from '../controllers/bkdController';
import { filterKelasBerBap, filterKelasBerpresensi } from '../utils/bkd-bulk-print';
import { hitungRekapPerTanggal, hitungRincianSesi } from '../utils/bkd-helpers';

const PRESENSI_LABEL: {
  key: keyof { hadir: number; sakit: number; izin: number; alpa: number; telat: number };
  label: string;
}[] = [
  { key: 'hadir', label: 'H' },
  { key: 'sakit', label: 'S' },
  { key: 'izin', label: 'I' },
  { key: 'alpa', label: 'A' },
  { key: 'telat', label: 'T' },
];

export default function BkdCetak() {
  const auth = useAuth();
  const isDosenRole = () => auth.hasRole(['dosen']);
  const [searchParams] = useSearchParams();
  const [hasPrinted, setHasPrinted] = createSignal(false);

  const [rekap] = createResource(
    () => {
      const dosenId = Number(searchParams.dosenId);
      const periodeId = searchParams.periodeId || '';
      // Dosen memakai dosenId=0 (placeholder); backend memaksa self via email.
      if ((!dosenId && !isDosenRole()) || !periodeId) return null;
      return { dosenId, periodeId };
    },
    async (target): Promise<BkdRekap | null> => {
      if (!target) return null;
      try {
        const res = await bkdController.getRekap(target.dosenId, target.periodeId);
        return res.data;
      } catch {
        return null;
      }
    },
  );

  createEffect(() => {
    if (rekap() && !hasPrinted()) {
      setHasPrinted(true);
      setTimeout(() => window.print(), 300);
    }
  });

  const bimbingan = () => rekap()?.bimbingan || [];

  const rekapBimbingan = () => hitungRekapPerTanggal(bimbingan());

  const rincianBimbingan = () => hitungRincianSesi(bimbingan());

  function escapeHtml(value: unknown): string {
    if (value == null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const openBapBulkPrintWindow = () => {
    const data = rekap();
    if (!data) {
      window.alert('Data BKD belum termuat.');
      return;
    }
    const kelasBerisi = filterKelasBerBap(data.mengajar);
    if (kelasBerisi.length === 0) {
      window.alert('Tidak ada sesi BAP untuk dicetak.');
      return;
    }
    const rowsHtml = kelasBerisi
      .map(
        (mk) => `
        <div class="section">
          <h3>[${escapeHtml(mk.mataKuliah.kode)}] ${escapeHtml(mk.mataKuliah.nama)} · Kelas ${escapeHtml(mk.namaKelas)}</h3>
          <table>
            <thead>
              <tr><th>No</th><th>Pertemuan</th><th>Tanggal</th><th>Materi</th><th>Durasi</th><th>Tanda Tangan</th></tr>
            </thead>
            <tbody>
              ${mk.pertemuan
                .map(
                  (p, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${escapeHtml(p.pertemuanKe)}</td>
                  <td>${escapeHtml(p.tanggal)}</td>
                  <td>${p.tema ? `${escapeHtml(p.tema)} — ` : ''}${escapeHtml(p.materi)}</td>
                  <td>${escapeHtml(p.durasiMenit)} mnt</td>
                  <td></td>
                </tr>`,
                )
                .join('')}
            </tbody>
          </table>
          <div class="sign-area">
            <div class="sign-box">
              <p class="sign-gap">(_______________)</p>
              <p>${escapeHtml(data.dosen.nama)}</p>
            </div>
          </div>
        </div>`,
      )
      .join('');

    openPrintWindow(
      'BAP-Bulk',
      'BERITA ACARA PERKULIAHAN (BAP)',
      data,
      `<p class="sub">Seluruh sesi perkuliahan per periode</p>${rowsHtml}`,
    );
  };

  const openPresensiBulkPrintWindow = () => {
    const data = rekap();
    if (!data) return;
    const pertemuanByKelas = new Map<number, BkdRekap['mengajar'][number]['pertemuan']>();
    for (const mk of data.mengajar) pertemuanByKelas.set(mk.kelasId, mk.pertemuan);
    const kelasBerisi = filterKelasBerpresensi(data.rekapPresensi || []);
    if (kelasBerisi.length === 0) {
      window.alert('Tidak ada data presensi untuk dicetak.');
      return;
    }
    const rowsHtml = kelasBerisi
      .map((rk) => {
        const sesi = pertemuanByKelas.get(rk.kelasId) || [];
        return `
        <div class="section">
          <h3>[${escapeHtml(rk.mataKuliah.kode)}] ${escapeHtml(rk.mataKuliah.nama)} · Kelas ${escapeHtml(rk.namaKelas)} (${escapeHtml(rk.jumlahPertemuan)} pertemuan, ${escapeHtml(rk.totalMenit)} mnt)</h3>
          <h4>A. Rekap Presensi per Mahasiswa</h4>
          <table>
            <thead>
              <tr><th>No</th><th>NIM</th><th>Nama</th><th>H</th><th>S</th><th>I</th><th>A</th><th>T</th><th>Total Hadir</th><th>% Hadir</th></tr>
            </thead>
            <tbody>
              ${rk.mahasiswa
                .map(
                  (m, i) => `
                <tr>
                  <td>${i + 1}</td><td>${escapeHtml(m.nim)}</td><td>${escapeHtml(m.nama)}</td>
                  <td>${escapeHtml(m.hadir)}</td><td>${escapeHtml(m.sakit)}</td><td>${escapeHtml(m.izin)}</td><td>${escapeHtml(m.alpa)}</td><td>${escapeHtml(m.telat)}</td>
                  <td>${escapeHtml(m.totalKehadiran)}</td><td>${escapeHtml(m.persentaseHadir)}%</td>
                </tr>`,
                )
                .join('')}
            </tbody>
          </table>
          <h4>B. Rekap Presensi per Sesi</h4>
          <table>
            <thead>
              <tr><th>No</th><th>Pertemuan</th><th>Tanggal</th><th>H</th><th>S</th><th>I</th><th>A</th><th>T</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${sesi
                .map(
                  (p, i) => `
                <tr>
                  <td>${i + 1}</td><td>${escapeHtml(p.pertemuanKe)}</td><td>${escapeHtml(p.tanggal)}</td>
                  <td>${escapeHtml(p.presensiRingkasan.hadir)}</td><td>${escapeHtml(p.presensiRingkasan.sakit)}</td><td>${escapeHtml(p.presensiRingkasan.izin)}</td>
                  <td>${escapeHtml(p.presensiRingkasan.alpa)}</td><td>${escapeHtml(p.presensiRingkasan.telat)}</td><td>${escapeHtml(p.presensiRingkasan.total)}</td>
                </tr>`,
                )
                .join('')}
            </tbody>
          </table>
          <div class="sign-area">
            <div class="sign-box">
              <p class="sign-gap">(_______________)</p>
              <p>${escapeHtml(data.dosen.nama)}</p>
            </div>
          </div>
        </div>`;
      })
      .join('');

    openPrintWindow(
      'Rekap-Presensi',
      'REKAP PRESENSI PERKULIAHAN',
      data,
      `<p class="sub">Seluruh kelas & sesi perkuliahan per periode</p>${rowsHtml}`,
    );
  };

  const openPrintWindow = (title: string, heading: string, data: NonNullable<BkdRekap>, bodyHtml: string) => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 24px; }
    h2 { text-align: center; margin: 0 0 6px; font-size: 18px; }
    .sub { text-align: center; font-size: 13px; margin: 2px 0; }
    .meta { text-align: center; font-size: 12px; margin: 4px 0 14px; color: #333; }
    .section { margin-top: 24px; page-break-before: always; }
    .section:first-child { page-break-before: auto; }
    h3 { font-size: 14px; margin: 0 0 8px; }
    h4 { font-size: 12px; margin: 14px 0 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #000; padding: 5px 8px; text-align: left; }
    th { background: #eee; text-align: center; }
    td { text-align: center; }
    .empty { text-align: center; color: #666; }
    .sign-area { margin-top: 40px; }
    .sign-box { display: inline-block; width: 220px; text-align: center; }
    .sign-gap { margin-bottom: 60px; }
  </style>
</head>
<body>
  <h2>POLITEKNIK SOROWAKO</h2>
  <h2>${escapeHtml(heading)}</h2>
  <p class="meta">Periode Akademik: ${escapeHtml(data.periode.nama)} · Dosen: ${escapeHtml(data.dosen.nama)} (NIP: ${escapeHtml(data.dosen.nip)} · NUPTK: ${escapeHtml(data.dosen.nuptk || data.dosen.nidn || '-')})</p>
  ${bodyHtml}
  <script>
    window.onload = function() { window.print(); };
  <\/script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=1000,height=750');
    if (!win) {
      window.alert('Popup diblokir. Aktifkan popup untuk mencetak.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <div class="min-h-screen bg-white p-8 text-secondary-800">
      <div class="mb-4 flex justify-end gap-2 print:hidden">
        <button
          type="button"
          onClick={openBapBulkPrintWindow}
          class="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand-600 border border-brand-300 shadow-sm transition-all hover:bg-brand-50 active:scale-95"
        >
          🗂️ Cetak BAP (Semua Sesi)
        </button>
        <button
          type="button"
          onClick={openPresensiBulkPrintWindow}
          class="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand-600 border border-brand-300 shadow-sm transition-all hover:bg-brand-50 active:scale-95"
        >
          📊 Cetak Rekap Presensi
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          class="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-95"
        >
          🖨️ Cetak Sekarang
        </button>
      </div>

      <Show
        when={!rekap.loading}
        fallback={
          <div class="flex items-center justify-center py-24 text-secondary-400">
            <div class="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            <span class="text-sm">Menyiapkan data cetak...</span>
          </div>
        }
      >
        <Show
          when={rekap()}
          fallback={
            <div class="rounded-2xl border border-secondary-100 p-10 text-center text-secondary-500">
              Data BKD tidak dapat dimuat. Pastikan parameter dosen &amp; periode valid dan Anda memiliki akses.
            </div>
          }
        >
          {(data) => (
            <div id="print-area-bkd" class="text-secondary-800">
              <div class="border-b border-secondary-200 pb-3 text-center">
                <h2 class="text-xl font-bold tracking-wider text-brand-700">POLITEKNIK SOROWAKO</h2>
                <h3 class="text-base font-bold uppercase tracking-widest text-secondary-600">
                  Laporan Beban Kerja Dosen (BKD)
                </h3>
                <p class="text-xs text-secondary-500">Periode Akademik: {data().periode.nama || '-'}</p>
              </div>

              <div class="mt-4 grid grid-cols-2 gap-4 text-xs text-secondary-700">
                <div>
                  <p>
                    Nama Dosen: <span class="font-bold text-secondary-900">{data().dosen.nama || '-'}</span>
                  </p>
                  <p>
                    NIP: <span class="font-bold">{data().dosen.nip || '-'}</span>
                  </p>
                </div>
                <div class="text-right">
                  <p>
                    NUPTK: <span class="font-bold">{data().dosen.nuptk || data().dosen.nidn || '-'}</span>
                  </p>
                  <p>
                    Program Studi: <span class="font-bold">{data().dosen.prodi || '-'}</span>
                  </p>
                </div>
              </div>

              <div class="mt-6">
                <h4 class="mb-2 text-sm font-bold uppercase tracking-widest text-secondary-600">
                  A. Rekapitulasi Mengajar
                </h4>
                <table class="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr class="border-b border-secondary-200 bg-secondary-50 font-bold uppercase text-secondary-500">
                      <th class="border-r border-secondary-200 p-2">Kode MK</th>
                      <th class="border-r border-secondary-200 p-2">Mata Kuliah</th>
                      <th class="border-r border-secondary-200 p-2">Kelas</th>
                      <th class="border-r border-secondary-200 p-2 text-center">SKS</th>
                      <th class="border-r border-secondary-200 p-2 text-center">Pertemuan</th>
                      <th class="p-2 text-center">Total Menit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={data().mengajar}>
                      {(r) => (
                        <tr class="border-b border-secondary-200">
                          <td class="border-r border-secondary-200 p-2">{r.mataKuliah.kode}</td>
                          <td class="border-r border-secondary-200 p-2 font-bold text-secondary-800">
                            {r.mataKuliah.nama}
                          </td>
                          <td class="border-r border-secondary-200 p-2">{r.namaKelas}</td>
                          <td class="border-r border-secondary-200 p-2 text-center">{r.mataKuliah.sks}</td>
                          <td class="border-r border-secondary-200 p-2 text-center">{r.jumlahPertemuan}</td>
                          <td class="p-2 text-center">{r.totalMenit}</td>
                        </tr>
                      )}
                    </For>
                    <Show when={data().mengajar.length === 0}>
                      <tr>
                        <td colspan="6" class="p-4 text-center text-secondary-400">
                          Tidak ada kelas yang diampu pada periode ini.
                        </td>
                      </tr>
                    </Show>
                  </tbody>
                  <tfoot>
                    <tr class="font-bold text-secondary-800">
                      <td colspan="3" class="border-r border-secondary-200 p-2 text-right">
                        Total
                      </td>
                      <td class="border-r border-secondary-200 p-2 text-center">{data().ringkasan.totalSks}</td>
                      <td class="border-r border-secondary-200 p-2 text-center">{data().ringkasan.totalPertemuan}</td>
                      <td class="p-2 text-center">{data().ringkasan.totalMenit}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div class="mt-6">
                <h4 class="mb-2 text-sm font-bold uppercase tracking-widest text-secondary-600">
                  B. Rekap Presensi per Kelas
                </h4>
                <table class="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr class="border-b border-secondary-200 bg-secondary-50 font-bold uppercase text-secondary-500">
                      <th class="border-r border-secondary-200 p-2">Mata Kuliah</th>
                      <th class="border-r border-secondary-200 p-2">Kelas</th>
                      <th class="border-r border-secondary-200 p-2 text-center">H</th>
                      <th class="border-r border-secondary-200 p-2 text-center">S</th>
                      <th class="border-r border-secondary-200 p-2 text-center">I</th>
                      <th class="border-r border-secondary-200 p-2 text-center">A</th>
                      <th class="p-2 text-center">T</th>
                      <th class="p-2 text-center">% Hadir</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={data().mengajar}>
                      {(r) => (
                        <tr class="border-b border-secondary-200">
                          <td class="border-r border-secondary-200 p-2 font-bold text-secondary-800">
                            {r.mataKuliah.nama}
                          </td>
                          <td class="border-r border-secondary-200 p-2">{r.namaKelas}</td>
                          <For each={PRESENSI_LABEL}>
                            {(st) => (
                              <td class="border-r border-secondary-200 p-2 text-center">{r.presensi[st.key]}</td>
                            )}
                          </For>
                          <td class="p-2 text-center">{r.presensi.persen}%</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>

              <div class="mt-6">
                <h4 class="mb-2 text-sm font-bold uppercase tracking-widest text-secondary-600">
                  C1. Rekap Bimbingan per Tanggal
                </h4>
                <table class="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr class="border-b border-secondary-200 bg-secondary-50 font-bold uppercase text-secondary-500">
                      <th class="border-r border-secondary-200 p-2">Tanggal Bimbingan</th>
                      <th class="border-r border-secondary-200 p-2 text-center">Jumlah Sesi</th>
                      <th class="p-2">Daftar Mahasiswa</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={rekapBimbingan()}>
                      {(r) => (
                        <tr class="border-b border-secondary-200">
                          <td class="border-r border-secondary-200 p-2 font-bold text-secondary-800">{r.tanggal}</td>
                          <td class="border-r border-secondary-200 p-2 text-center">{r.jumlahSesi}</td>
                          <td class="p-2">{r.daftarMahasiswa}</td>
                        </tr>
                      )}
                    </For>
                    <Show when={rekapBimbingan().length === 0}>
                      <tr>
                        <td colspan="3" class="p-4 text-center text-secondary-400">
                          Tidak ada data bimbingan.
                        </td>
                      </tr>
                    </Show>
                  </tbody>
                </table>
              </div>

              <div class="mt-6">
                <h4 class="mb-2 text-sm font-bold uppercase tracking-widest text-secondary-600">
                  C2. Rincian Sesi Bimbingan
                </h4>
                <table class="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr class="border-b border-secondary-200 bg-secondary-50 font-bold uppercase text-secondary-500">
                      <th class="border-r border-secondary-200 p-2">Tanggal Bimbingan</th>
                      <th class="border-r border-secondary-200 p-2">NIM</th>
                      <th class="border-r border-secondary-200 p-2">Nama Mahasiswa</th>
                      <th class="p-2">Topik Bimbingan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={rincianBimbingan()}>
                      {(r) => (
                        <tr class="border-b border-secondary-200">
                          <td class="border-r border-secondary-200 p-2 font-bold text-secondary-800">{r.tanggal}</td>
                          <td class="border-r border-secondary-200 p-2">{r.nim}</td>
                          <td class="border-r border-secondary-200 p-2 font-bold text-secondary-800">{r.nama}</td>
                          <td class="p-2">{r.topik}</td>
                        </tr>
                      )}
                    </For>
                    <Show when={rincianBimbingan().length === 0}>
                      <tr>
                        <td colspan="4" class="p-4 text-center text-secondary-400">
                          Tidak ada data bimbingan.
                        </td>
                      </tr>
                    </Show>
                  </tbody>
                </table>
              </div>

              <div class="mt-12 grid grid-cols-2 gap-4 text-xs text-secondary-700">
                <div class="text-center">
                  <p>Mengetahui,</p>
                  <p>Kaprodi / Pimpinan</p>
                  <div class="h-16" />
                  <p class="font-bold underline">.........................................................</p>
                </div>
                <div class="text-center">
                  <p>Dosen Yang Bersangkutan</p>
                  <div class="h-16" />
                  <p class="font-bold underline">{data().dosen.nama || '...........................'}</p>
                </div>
              </div>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
}
