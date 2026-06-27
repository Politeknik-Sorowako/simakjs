import { t } from 'elysia';

export const getKhsSchema = {
  detail: {
    tags: ['KHS & Transkrip'],
    summary: 'Ambil Kartu Hasil Studi (KHS) Mahasiswa',
    description: 'Mengambil nilai akademik per semester beserta kalkulasi IP. Akses diblokir bagi mahasiswa jika terdapat tunggakan SPP atau kompensasi mangkir.'
  },
  params: t.Object({
    mhsId: t.Numeric(),
    periodeId: t.String({ minLength: 1, maxLength: 10 })
  })
};

export const getTranskripSchema = {
  detail: {
    tags: ['KHS & Transkrip'],
    summary: 'Ambil Transkrip Nilai Akademik Mahasiswa',
    description: 'Mengambil transkrip nilai kumulatif untuk seluruh mata kuliah yang telah diselesaikan mahasiswa.'
  },
  params: t.Object({
    mhsId: t.Numeric()
  })
};
