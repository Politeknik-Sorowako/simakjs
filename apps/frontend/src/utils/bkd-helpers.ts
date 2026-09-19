/**
 * Helper untuk mengagregasi data bimbingan BKD menjadi dua format tabel:
 * - rekapPerTanggal: grup per tanggal (tanggal, jumlah sesi, daftar mahasiswa)
 * - rincian: satu baris per sesi (tanggal, NIM, nama, topik)
 */

export interface BkdSesi {
  tanggalBimbingan?: string | null;
  topikBimbingan?: string | null;
  [key: string]: unknown;
}

export interface BkdItem {
  mahasiswa?: { nim: string; nama: string };
  sesi?: BkdSesi[];
  [key: string]: unknown;
}

export interface RekapPerTanggal {
  tanggal: string;
  jumlahSesi: number;
  daftarMahasiswa: string;
}

export interface RincianSesi {
  tanggal: string;
  nim: string;
  nama: string;
  topik: string;
}

function sortTanggalAsc(a: string, b: string): number {
  if (a === '-') return 1;
  if (b === '-') return -1;
  return a.localeCompare(b);
}

export function hitungRekapPerTanggal(bimbinganList: BkdItem[]): RekapPerTanggal[] {
  const map = new Map<string, { tanggal: string; jumlahSesi: number; mahasiswa: Map<string, string> }>();
  for (const b of bimbinganList) {
    for (const s of b.sesi || []) {
      const tgl = s.tanggalBimbingan || '-';
      const entry = map.get(tgl) || { tanggal: tgl, jumlahSesi: 0, mahasiswa: new Map<string, string>() };
      entry.jumlahSesi += 1;
      const nim = b.mahasiswa?.nim || '-';
      const nama = b.mahasiswa?.nama || '-';
      entry.mahasiswa.set(nim, `${nama} (${nim})`);
      map.set(tgl, entry);
    }
  }
  return [...map.values()]
    .map((e) => ({
      tanggal: e.tanggal,
      jumlahSesi: e.jumlahSesi,
      daftarMahasiswa: [...e.mahasiswa.values()].join(', '),
    }))
    .sort((a, b) => sortTanggalAsc(a.tanggal, b.tanggal));
}

export function hitungRincianSesi(bimbinganList: BkdItem[]): RincianSesi[] {
  const list: RincianSesi[] = [];
  for (const b of bimbinganList) {
    for (const s of b.sesi || []) {
      list.push({
        tanggal: s.tanggalBimbingan || '-',
        nim: b.mahasiswa?.nim || '-',
        nama: b.mahasiswa?.nama || '-',
        topik: s.topikBimbingan || '-',
      });
    }
  }
  return list.sort((a, b) => {
    const byDate = sortTanggalAsc(a.tanggal, b.tanggal);
    return byDate !== 0 ? byDate : a.nama.localeCompare(b.nama);
  });
}
