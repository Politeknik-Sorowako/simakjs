/**
 * Cetak bulk PDF dari data BKD:
 * - exportBapBulkPDF: seluruh BAP sesi perkuliahan dosen per periode dalam satu file.
 * - exportPresensiBulkPDF: rekap presensi (agregat per mahasiswa + ringkas per sesi)
 *   seluruh kelas dosen per periode dalam satu file.
 *
 * Kop dokumen mengikuti gaya export.ts (exportToPDF): institusi, judul, info dosen,
 * garis pemisah, footer nomor halaman, dan blok tanda tangan.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  BkdMengajar,
  BkdMengajarPraktikum,
  BkdRekap,
  BkdRekapPresensiKelas,
  BkdRekapPresensiRombel,
} from '../controllers/bkdController';

interface KopOptions {
  orientasi: 'portrait' | 'landscape';
  judul: string;
  rekap: BkdRekap;
}

function formatTanggalBulan(tanggal: string): string {
  if (!tanggal || tanggal === '-') return '-';
  const [y, m, d] = tanggal.split('-');
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const idx = Number(m) - 1;
  if (!y || !m || !d || idx < 0 || idx > 11) return tanggal;
  return `${Number(d)} ${bulan[idx]} ${y}`;
}

function gambarKop(doc: jsPDF, opts: KopOptions): { startY: number } {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFontSize(14);
  doc.setTextColor(31, 41, 55);
  doc.text('POLITEKNIK SOROWAKO', pageWidth / 2, 14, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Pendidikan Vokasi · Sorowako, Sulawesi Selatan', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  doc.text(opts.judul, pageWidth / 2, 30, { align: 'center' });

  const infoLines = [
    `Periode Akademik: ${opts.rekap.periode.nama || '-'}`,
    `Nama Dosen: ${opts.rekap.dosen.nama || '-'}     NIP: ${opts.rekap.dosen.nip || '-'}     NUPTK: ${
      opts.rekap.dosen.nuptk || opts.rekap.dosen.nidn || '-'
    }`,
    `Program Studi: ${opts.rekap.dosen.prodi || '-'}`,
  ];
  let infoY = 35;
  for (const line of infoLines) {
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    doc.text(line, margin, infoY);
    infoY += 4.5;
  }

  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.5);
  doc.line(margin, infoY + 1, pageWidth - margin, infoY + 1);
  return { startY: infoY + 8 };
}

function gambarFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `SIMAK Vokasi - Politeknik Sorowako | Halaman ${i} dari ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' },
    );
  }
}

function gambarTandaTangan(doc: jsPDF, namaDosen: string, startY: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = startY + 14;
  if (y > pageHeight - 46) {
    doc.addPage();
    y = 40;
  }
  const x = pageWidth / 2;
  doc.setFontSize(9);
  doc.setTextColor(55, 65, 81);
  doc.text('Dosen Yang Bersangkutan', x, y, { align: 'center' });
  doc.text('..............................', x, y + 16, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  doc.text(namaDosen || '...........................', x, y + 24, { align: 'center' });
}

function judulKelas(m: BkdMengajar): string {
  return `[${m.mataKuliah.kode}] ${m.mataKuliah.nama} — Kelas ${m.namaKelas}`;
}

function judulRombel(m: BkdMengajarPraktikum): string {
  return `[${m.mataKuliah.kode}] ${m.mataKuliah.nama} — Kelas ${m.namaKelas} · Group ${m.namaGroup}`;
}

/** Kelas yang memiliki minimal satu sesi BAP (seksi kosong dilewati saat cetak). */
export function filterKelasBerBap(mengajar: BkdMengajar[]): BkdMengajar[] {
  return mengajar.filter((m) => m.pertemuan.length > 0);
}

/** Kelas yang memiliki minimal satu baris presensi mahasiswa (seksi kosong dilewati saat cetak). */
export function filterKelasBerpresensi(rekap: BkdRekapPresensiKelas[]): BkdRekapPresensiKelas[] {
  return rekap.filter((r) => r.mahasiswa.length > 0);
}

/** Rombel yang memiliki minimal satu sesi BAP praktikum (seksi kosong dilewati saat cetak). */
export function filterRombelBerBap(mengajar: BkdMengajarPraktikum[]): BkdMengajarPraktikum[] {
  return mengajar.filter((m) => m.pertemuan.length > 0);
}

/** Rombel yang memiliki minimal satu baris presensi praktikum (seksi kosong dilewati saat cetak). */
export function filterRombelBerpresensi(rekap: BkdRekapPresensiRombel[]): BkdRekapPresensiRombel[] {
  return rekap.filter((r) => r.mahasiswa.length > 0);
}

export function exportBapBulkPDF(rekap: BkdRekap) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const margin = 14;

  const { startY } = gambarKop(doc, { orientasi: 'portrait', judul: 'Berita Acara Perkuliahan (BAP)', rekap });

  filterKelasBerBap(rekap.mengajar).forEach((mk, idx) => {
    if (idx > 0) doc.addPage();

    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text(judulKelas(mk), margin, startY + 2);

    const rows = mk.pertemuan.map((p, i) => [
      String(i + 1),
      String(p.pertemuanKe),
      formatTanggalBulan(p.tanggal),
      p.tema ? `${p.tema} — ${p.materi}` : p.materi,
      `${p.durasiMenit} mnt`,
      '',
    ]);

    autoTable(doc, {
      head: [['No', 'Pertemuan', 'Tanggal', 'Materi', 'Durasi', 'Tanda Tangan']],
      body: rows,
      startY: startY + 8,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [31, 41, 55], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 30, halign: 'center' },
      },
      margin: { left: margin, right: margin },
    });

    const lastY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? startY + 18;
    gambarTandaTangan(doc, rekap.dosen.nama, lastY);
  });

  gambarFooter(doc);
  doc.save(`BAP-Bulk-${rekap.dosen.nama || 'Dosen'}-${rekap.periode.nama || ''}.pdf`);
}

export function exportPresensiBulkPDF(rekap: BkdRekap) {
  const doc = new jsPDF('l', 'mm', 'a4');
  const margin = 14;

  const { startY } = gambarKop(doc, { orientasi: 'landscape', judul: 'Rekap Presensi Perkuliahan', rekap });

  // Map kelasId -> pertemuan (dari BkdMengajar) untuk tabel ringkas per sesi.
  const pertemuanByKelas = new Map<number, BkdMengajar['pertemuan']>();
  for (const m of rekap.mengajar) pertemuanByKelas.set(m.kelasId, m.pertemuan);

  const kelasRekap = filterKelasBerpresensi(
    rekap.rekapPresensi && rekap.rekapPresensi.length > 0
      ? rekap.rekapPresensi
      : rekap.mengajar.map((m) => ({
          kelasId: m.kelasId,
          namaKelas: m.namaKelas,
          mataKuliah: m.mataKuliah,
          jumlahPertemuan: m.jumlahPertemuan,
          totalMenit: m.totalMenit,
          mahasiswa: [],
        })),
  );

  kelasRekap.forEach((rk, idx) => {
    if (idx > 0) doc.addPage();

    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text(
      `[${rk.mataKuliah.kode}] ${rk.mataKuliah.nama} — Kelas ${rk.namaKelas} (${rk.jumlahPertemuan} pertemuan, ${rk.totalMenit} mnt)`,
      margin,
      startY + 2,
    );

    // Tabel agregat per mahasiswa.
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);
    doc.text('A. Rekap Presensi per Mahasiswa', margin, startY + 9);

    const mhsRows = rk.mahasiswa.map((m, i) => [
      String(i + 1),
      m.nim,
      m.nama,
      String(m.hadir),
      String(m.sakit),
      String(m.izin),
      String(m.alpa),
      String(m.telat),
      String(m.totalKehadiran),
      `${m.persentaseHadir}%`,
    ]);

    autoTable(doc, {
      head: [['No', 'NIM', 'Nama', 'H', 'S', 'I', 'A', 'T', 'Total Hadir', '% Hadir']],
      body: mhsRows,
      startY: startY + 12,
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [31, 41, 55], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 14, halign: 'center' },
        6: { cellWidth: 14, halign: 'center' },
        7: { cellWidth: 14, halign: 'center' },
        8: { cellWidth: 22, halign: 'center' },
        9: { cellWidth: 18, halign: 'center' },
      },
      margin: { left: margin, right: margin },
    });

    // Tabel ringkas per sesi.
    const afterMhs = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? startY + 20;
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);
    doc.text('B. Rekap Presensi per Sesi', margin, afterMhs + 8);

    const pertemuan = pertemuanByKelas.get(rk.kelasId) || [];
    const sesiRows = pertemuan.map((p, i) => [
      String(i + 1),
      String(p.pertemuanKe),
      formatTanggalBulan(p.tanggal),
      String(p.presensiRingkasan.hadir),
      String(p.presensiRingkasan.sakit),
      String(p.presensiRingkasan.izin),
      String(p.presensiRingkasan.alpa),
      String(p.presensiRingkasan.telat),
      String(p.presensiRingkasan.total),
    ]);

    autoTable(doc, {
      head: [['No', 'Pertemuan', 'Tanggal', 'H', 'S', 'I', 'A', 'T', 'Total']],
      body: sesiRows,
      startY: afterMhs + 11,
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 26, halign: 'center' },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 14, halign: 'center' },
        6: { cellWidth: 14, halign: 'center' },
        7: { cellWidth: 14, halign: 'center' },
        8: { cellWidth: 16, halign: 'center' },
      },
      margin: { left: margin, right: margin },
    });

    const lastY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? afterMhs + 16;
    gambarTandaTangan(doc, rekap.dosen.nama, lastY);
  });

  gambarFooter(doc);
  doc.save(`Rekap-Presensi-${rekap.dosen.nama || 'Dosen'}-${rekap.periode.nama || ''}.pdf`);
}

export function exportBapPraktikumBulkPDF(rekap: BkdRekap) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const margin = 14;

  const { startY } = gambarKop(doc, {
    orientasi: 'portrait',
    judul: 'Berita Acara Praktikum (BAP Praktikum)',
    rekap,
  });

  filterRombelBerBap(rekap.mengajarPraktikum || []).forEach((mk, idx) => {
    if (idx > 0) doc.addPage();

    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text(`[PRAKTIKUM] ${judulRombel(mk)}`, margin, startY + 2);

    const rows = mk.pertemuan.map((p, i) => [
      String(i + 1),
      String(p.sesiKe),
      formatTanggalBulan(p.tanggal),
      p.tema ? `${p.tema} — ${p.materi}` : p.materi,
      `${p.durasiMenit} mnt`,
      '',
    ]);

    autoTable(doc, {
      head: [['No', 'Sesi', 'Tanggal', 'Materi', 'Durasi', 'Tanda Tangan']],
      body: rows,
      startY: startY + 8,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [31, 41, 55], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 30, halign: 'center' },
      },
      margin: { left: margin, right: margin },
    });

    const lastY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? startY + 18;
    gambarTandaTangan(doc, rekap.dosen.nama, lastY);
  });

  gambarFooter(doc);
  doc.save(`BAP-Praktikum-Bulk-${rekap.dosen.nama || 'Dosen'}-${rekap.periode.nama || ''}.pdf`);
}

export function exportPresensiPraktikumBulkPDF(rekap: BkdRekap) {
  const doc = new jsPDF('l', 'mm', 'a4');
  const margin = 14;

  const { startY } = gambarKop(doc, { orientasi: 'landscape', judul: 'Rekap Presensi Praktikum', rekap });

  // Map rombelId -> pertemuan (dari BkdMengajarPraktikum) untuk tabel ringkas per sesi.
  const pertemuanByRombel = new Map<number, BkdMengajarPraktikum['pertemuan']>();
  for (const m of rekap.mengajarPraktikum || []) pertemuanByRombel.set(m.rombelId, m.pertemuan);

  const rombelRekap = filterRombelBerpresensi(
    rekap.rekapPresensiPraktikum && rekap.rekapPresensiPraktikum.length > 0
      ? rekap.rekapPresensiPraktikum
      : (rekap.mengajarPraktikum || []).map((m) => ({
          rombelId: m.rombelId,
          namaGroup: m.namaGroup,
          kelasId: m.kelasId,
          namaKelas: m.namaKelas,
          mataKuliah: m.mataKuliah,
          jumlahPertemuan: m.jumlahPertemuan,
          totalMenit: m.totalMenit,
          mahasiswa: [],
        })),
  );

  rombelRekap.forEach((rk, idx) => {
    if (idx > 0) doc.addPage();

    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text(
      `[PRAKTIKUM] [${rk.mataKuliah.kode}] ${rk.mataKuliah.nama} — Kelas ${rk.namaKelas} · Group ${rk.namaGroup} (${rk.jumlahPertemuan} pertemuan, ${rk.totalMenit} mnt)`,
      margin,
      startY + 2,
    );

    // Tabel agregat per mahasiswa.
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);
    doc.text('A. Rekap Presensi per Mahasiswa', margin, startY + 9);

    const mhsRows = rk.mahasiswa.map((m, i) => [
      String(i + 1),
      m.nim,
      m.nama,
      String(m.hadir),
      String(m.sakit),
      String(m.izin),
      String(m.alpa),
      String(m.telat),
      String(m.totalKehadiran),
      `${m.persentaseHadir}%`,
    ]);

    autoTable(doc, {
      head: [['No', 'NIM', 'Nama', 'H', 'S', 'I', 'A', 'T', 'Total Hadir', '% Hadir']],
      body: mhsRows,
      startY: startY + 12,
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [31, 41, 55], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 14, halign: 'center' },
        6: { cellWidth: 14, halign: 'center' },
        7: { cellWidth: 14, halign: 'center' },
        8: { cellWidth: 22, halign: 'center' },
        9: { cellWidth: 18, halign: 'center' },
      },
      margin: { left: margin, right: margin },
    });

    // Tabel ringkas per sesi.
    const afterMhs = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? startY + 20;
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);
    doc.text('B. Rekap Presensi per Sesi', margin, afterMhs + 8);

    const pertemuan = pertemuanByRombel.get(rk.rombelId) || [];
    const sesiRows = pertemuan.map((p, i) => [
      String(i + 1),
      String(p.sesiKe),
      formatTanggalBulan(p.tanggal),
      String(p.presensiRingkasan.hadir),
      String(p.presensiRingkasan.sakit),
      String(p.presensiRingkasan.izin),
      String(p.presensiRingkasan.alpa),
      String(p.presensiRingkasan.telat),
      String(p.presensiRingkasan.total),
    ]);

    autoTable(doc, {
      head: [['No', 'Sesi', 'Tanggal', 'H', 'S', 'I', 'A', 'T', 'Total']],
      body: sesiRows,
      startY: afterMhs + 11,
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 26, halign: 'center' },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 14, halign: 'center' },
        6: { cellWidth: 14, halign: 'center' },
        7: { cellWidth: 14, halign: 'center' },
        8: { cellWidth: 16, halign: 'center' },
      },
      margin: { left: margin, right: margin },
    });

    const lastY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? afterMhs + 16;
    gambarTandaTangan(doc, rekap.dosen.nama, lastY);
  });

  gambarFooter(doc);
  doc.save(`Rekap-Presensi-Praktikum-${rekap.dosen.nama || 'Dosen'}-${rekap.periode.nama || ''}.pdf`);
}
