/**
 * Utilitas ekspor rekap BKD (per dosen per periode) ke CSV & Excel.
 * - Excel: multi-sheet (Teori, Praktikum, Presensi Praktikum, Bimbingan).
 * - CSV: satu file flat berkolom `Jenis` (Teori / Praktikum / Presensi Praktikum / Bimbingan),
 *   disertai BOM UTF-8 agar kompatibel dengan Excel.
 */
import type { BkdRekap } from '../controllers/bkdController';
import { type ExportColumn, type ExportSheet, exportToCSV, exportToExcelMultipleSheets } from './export';

function namaFile(rekap: BkdRekap, suffix: string): string {
  return `BKD-Rekap-${suffix}-${rekap.dosen.nama || 'Dosen'}-${rekap.periode.nama || ''}`;
}

const teoriColumns: ExportColumn[] = [
  {
    header: 'Kode MK',
    accessor: (r: Record<string, unknown>) => (r.mataKuliah as { kode?: string } | undefined)?.kode ?? '-',
  },
  {
    header: 'Mata Kuliah',
    accessor: (r: Record<string, unknown>) => (r.mataKuliah as { nama?: string } | undefined)?.nama ?? '-',
  },
  { header: 'Kelas', accessor: 'namaKelas' },
  { header: 'SKS', accessor: (r: Record<string, unknown>) => (r.mataKuliah as { sks?: number } | undefined)?.sks ?? 0 },
  { header: 'Pertemuan', accessor: 'jumlahPertemuan' },
  { header: 'Total Menit', accessor: 'totalMenit' },
  {
    header: 'Hadir',
    accessor: (r: Record<string, unknown>) => (r.presensi as { hadir?: number } | undefined)?.hadir ?? 0,
  },
  {
    header: 'Sakit',
    accessor: (r: Record<string, unknown>) => (r.presensi as { sakit?: number } | undefined)?.sakit ?? 0,
  },
  {
    header: 'Izin',
    accessor: (r: Record<string, unknown>) => (r.presensi as { izin?: number } | undefined)?.izin ?? 0,
  },
  {
    header: 'Alpa',
    accessor: (r: Record<string, unknown>) => (r.presensi as { alpa?: number } | undefined)?.alpa ?? 0,
  },
  {
    header: '% Hadir',
    accessor: (r: Record<string, unknown>) => (r.presensi as { persen?: number } | undefined)?.persen ?? 0,
  },
];

const praktikumColumns: ExportColumn[] = [
  {
    header: 'Kode MK',
    accessor: (r: Record<string, unknown>) => (r.mataKuliah as { kode?: string } | undefined)?.kode ?? '-',
  },
  {
    header: 'Mata Kuliah',
    accessor: (r: Record<string, unknown>) => (r.mataKuliah as { nama?: string } | undefined)?.nama ?? '-',
  },
  { header: 'Kelas', accessor: 'namaKelas' },
  { header: 'Group', accessor: 'namaGroup' },
  { header: 'SKS', accessor: (r: Record<string, unknown>) => (r.mataKuliah as { sks?: number } | undefined)?.sks ?? 0 },
  {
    header: 'SKS Praktikum',
    accessor: (r: Record<string, unknown>) =>
      (r.mataKuliah as { sksPraktek?: number | null } | undefined)?.sksPraktek ?? 0,
  },
  { header: 'Pertemuan', accessor: 'jumlahPertemuan' },
  { header: 'Total Menit', accessor: 'totalMenit' },
  {
    header: 'Hadir',
    accessor: (r: Record<string, unknown>) => (r.presensi as { hadir?: number } | undefined)?.hadir ?? 0,
  },
  {
    header: 'Sakit',
    accessor: (r: Record<string, unknown>) => (r.presensi as { sakit?: number } | undefined)?.sakit ?? 0,
  },
  {
    header: 'Izin',
    accessor: (r: Record<string, unknown>) => (r.presensi as { izin?: number } | undefined)?.izin ?? 0,
  },
  {
    header: 'Alpa',
    accessor: (r: Record<string, unknown>) => (r.presensi as { alpa?: number } | undefined)?.alpa ?? 0,
  },
  {
    header: '% Hadir',
    accessor: (r: Record<string, unknown>) => (r.presensi as { persen?: number } | undefined)?.persen ?? 0,
  },
];

const presensiPraktikumColumns: ExportColumn[] = [
  { header: 'Kode MK', accessor: 'kode' },
  { header: 'Mata Kuliah', accessor: 'namaMk' },
  { header: 'Kelas', accessor: 'namaKelas' },
  { header: 'Group', accessor: 'namaGroup' },
  { header: 'NIM', accessor: 'nim' },
  { header: 'Nama Mahasiswa', accessor: 'nama' },
  { header: 'Hadir', accessor: 'hadir' },
  { header: 'Sakit', accessor: 'sakit' },
  { header: 'Izin', accessor: 'izin' },
  { header: 'Alpa', accessor: 'alpa' },
  { header: 'Total Kehadiran', accessor: 'totalKehadiran' },
  { header: '% Hadir', accessor: (r: Record<string, unknown>) => `${r.persentaseHadir ?? 0}%` },
];

const bimbinganColumns: ExportColumn[] = [
  { header: 'Tanggal', accessor: 'tanggal' },
  { header: 'NIM', accessor: 'nim' },
  { header: 'Nama Mahasiswa', accessor: 'nama' },
  { header: 'Topik', accessor: 'topik' },
  { header: 'Status BKD', accessor: 'statusBkd' },
];

interface FlatRow extends Record<string, unknown> {}

function flattenPresensiPraktikum(rekap: BkdRekap): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const r of rekap.rekapPresensiPraktikum || []) {
    for (const m of r.mahasiswa) {
      rows.push({
        kode: r.mataKuliah.kode,
        namaMk: r.mataKuliah.nama,
        namaKelas: r.namaKelas,
        namaGroup: r.namaGroup,
        nim: m.nim,
        nama: m.nama,
        hadir: m.hadir,
        sakit: m.sakit,
        izin: m.izin,
        alpa: m.alpa,
        totalKehadiran: m.totalKehadiran,
        persentaseHadir: m.persentaseHadir,
      });
    }
  }
  return rows;
}

function flattenBimbingan(rekap: BkdRekap): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const b of rekap.bimbingan || []) {
    for (const s of b.sesi || []) {
      rows.push({
        tanggal: s.tanggalBimbingan ?? '-',
        nim: b.mahasiswa?.nim ?? '-',
        nama: b.mahasiswa?.nama ?? '-',
        topik: s.topikBimbingan ?? '-',
        statusBkd: s.statusBkd ? 'Ya' : 'Tidak',
      });
    }
  }
  return rows;
}

/** Baris flat berkolom Jenis untuk CSV gabungan seluruh seksi. */
function flattenRekapCsv(rekap: BkdRekap): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const m of rekap.mengajar || []) {
    rows.push({
      jenis: 'Teori',
      kode: m.mataKuliah.kode,
      namaMk: m.mataKuliah.nama,
      namaKelas: m.namaKelas,
      sks: m.mataKuliah.sks,
      jumlahPertemuan: m.jumlahPertemuan,
      totalMenit: m.totalMenit,
      ...m.presensi,
    });
  }
  for (const m of rekap.mengajarPraktikum || []) {
    rows.push({
      jenis: 'Praktikum',
      kode: m.mataKuliah.kode,
      namaMk: m.mataKuliah.nama,
      namaKelas: m.namaKelas,
      namaGroup: m.namaGroup,
      sks: m.mataKuliah.sks,
      sksPraktek: m.mataKuliah.sksPraktek ?? 0,
      jumlahPertemuan: m.jumlahPertemuan,
      totalMenit: m.totalMenit,
      ...m.presensi,
    });
  }
  for (const r of flattenPresensiPraktikum(rekap)) {
    rows.push({ jenis: 'Presensi Praktikum', ...r });
  }
  for (const r of flattenBimbingan(rekap)) {
    rows.push({ jenis: 'Bimbingan', ...r });
  }
  return rows;
}

const csvColumns: ExportColumn[] = [
  { header: 'Jenis', accessor: 'jenis' },
  { header: 'Kode MK', accessor: 'kode' },
  { header: 'Mata Kuliah', accessor: 'namaMk' },
  { header: 'Kelas', accessor: 'namaKelas' },
  { header: 'Group', accessor: 'namaGroup' },
  { header: 'SKS', accessor: 'sks' },
  { header: 'SKS Praktikum', accessor: 'sksPraktek' },
  { header: 'Pertemuan', accessor: 'jumlahPertemuan' },
  { header: 'Total Menit', accessor: 'totalMenit' },
  { header: 'NIM', accessor: 'nim' },
  { header: 'Nama Mahasiswa', accessor: 'nama' },
  { header: 'Hadir', accessor: 'hadir' },
  { header: 'Sakit', accessor: 'sakit' },
  { header: 'Izin', accessor: 'izin' },
  { header: 'Alpa', accessor: 'alpa' },
  { header: 'Total Kehadiran', accessor: 'totalKehadiran' },
  { header: '% Hadir', accessor: 'persen' },
  { header: 'Tanggal', accessor: 'tanggal' },
  { header: 'Topik', accessor: 'topik' },
  { header: 'Status BKD', accessor: 'statusBkd' },
];

export function exportBkdRekapExcel(rekap: BkdRekap) {
  const sheets: ExportSheet[] = [
    { name: 'Teori', columns: teoriColumns, data: rekap.mengajar || [] },
    { name: 'Praktikum', columns: praktikumColumns, data: rekap.mengajarPraktikum || [] },
    { name: 'Presensi Praktikum', columns: presensiPraktikumColumns, data: flattenPresensiPraktikum(rekap) },
    { name: 'Bimbingan', columns: bimbinganColumns, data: flattenBimbingan(rekap) },
  ];
  exportToExcelMultipleSheets(sheets, namaFile(rekap, 'Lengkap'));
}

export function exportBkdRekapCSV(rekap: BkdRekap) {
  exportToCSV(flattenRekapCsv(rekap), csvColumns, namaFile(rekap, 'Lengkap'));
}
