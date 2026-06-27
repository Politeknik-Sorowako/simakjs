import { t } from 'elysia';

export const bimbinganThreadBody = t.Object({
  pesan: t.String({ minLength: 1, maxLength: 1000, default: 'Halo, saya ingin berkonsultasi mengenai rencana studi saya.' }),
});

export const bimbinganUpdateBody = t.Object({
  ringkasan: t.Optional(t.String({ maxLength: 2000 })),
  isApproved: t.Boolean({ default: true }),
});

export const getBimbinganSchema = {
  detail: {
    tags: ['Bimbingan'],
    summary: 'Ambil Data Bimbingan & Chat Thread',
    description: 'Mengambil data bimbingan aktif beserta riwayat thread chat antara Dosen PA dan Mahasiswa.'
  },
  params: t.Object({
    mhsId: t.Numeric()
  })
};

export const createBimbinganThreadSchema = {
  detail: {
    tags: ['Bimbingan'],
    summary: 'Kirim Pesan Bimbingan',
    description: 'Mengirimkan pesan konsultasi baru ke thread bimbingan mahasiswa.'
  },
  params: t.Object({
    mhsId: t.Numeric()
  }),
  body: bimbinganThreadBody
};

export const updateBimbinganSchema = {
  detail: {
    tags: ['Bimbingan'],
    summary: 'Update Ringkasan & Persetujuan Bimbingan',
    description: 'Dosen PA memperbarui ringkasan bimbingan serta memberikan persetujuan kelayakan/progres bimbingan.'
  },
  params: t.Object({
    mhsId: t.Numeric()
  }),
  body: bimbinganUpdateBody
};

export const getBimbinganMonitoringSchema = {
  detail: {
    tags: ['Bimbingan'],
    summary: 'Monitoring Progres Bimbingan Akademik',
    description: 'Admin atau Kaprodi memantau seluruh status bimbingan mahasiswa pada periode aktif.'
  }
};
