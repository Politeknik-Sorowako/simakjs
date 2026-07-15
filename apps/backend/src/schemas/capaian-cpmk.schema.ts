import { t } from 'elysia';

export const getCapaianCpmkByKelasSchema = {
  detail: {
    tags: ['Capaian CPMK'],
    summary: 'Capaian CPMK per Kelas',
    description: 'Mengambil capaian CPMK untuk semua mahasiswa di satu kelas.',
  },
  params: t.Object({
    kelasKuliahId: t.Numeric(),
  }),
};

export const getCapaianCpmkByMahasiswaSchema = {
  detail: {
    tags: ['Capaian CPMK'],
    summary: 'Capaian CPMK per Mahasiswa',
    description: 'Mengambil capaian CPMK untuk satu mahasiswa.',
  },
  params: t.Object({
    mahasiswaId: t.Numeric(),
  }),
};

export const hitungCapaianCpmkSchema = {
  detail: {
    tags: ['Capaian CPMK'],
    summary: 'Hitung Capaian CPMK per Kelas',
    description: 'Menghitung ulang capaian CPMK untuk semua mahasiswa di satu kelas.',
  },
  params: t.Object({
    kelasKuliahId: t.Numeric(),
  }),
};

export const getRekapCapaianCpmkSchema = {
  detail: {
    tags: ['Capaian CPMK'],
    summary: 'Rekap Capaian CPMK per Kelas',
    description: 'Mengambil rekap rata-rata capaian CPMK per kelas.',
  },
  params: t.Object({
    kelasKuliahId: t.Numeric(),
  }),
};
