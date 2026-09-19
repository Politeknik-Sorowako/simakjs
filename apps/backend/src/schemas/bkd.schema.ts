import { t } from 'elysia';

export const getRekapBkdSchema = {
  detail: {
    tags: ['BKD'],
    summary: 'Rekap BKD Dosen (Mengajar, Presensi, Bimbingan)',
    description:
      'Mengambil rekapitulasi beban kerja dosen (BKD) per periode: agregat mengajar per kelas/mata kuliah (SKS, jumlah pertemuan, total menit), rekap presensi, dan riwayat bimbingan akademik.',
  },
  query: t.Object({
    dosenId: t.Optional(t.Numeric({ error: 'ID Dosen tidak valid' })),
    periodeId: t.String({ minLength: 1, maxLength: 10, error: 'Periode akademik tidak valid' }),
  }),
};
