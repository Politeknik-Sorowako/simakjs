import { t } from 'elysia';

export const rpsBody = t.Object({
  mataKuliahId: t.Integer({ default: 1 }),
  periodeId: t.String({ default: '20241' }),
  deskripsi: t.Optional(t.String()),
  cplProdi: t.Optional(t.String())
});

export const rpsTopikBody = t.Object({
  pertemuanKe: t.Integer({ default: 1 }),
  topik: t.String({ default: 'Pengenalan dan Kontrak Kuliah' }),
  subTopik: t.Optional(t.String()),
  metode: t.Optional(t.String({ default: 'Ceramah & Diskusi' })),
  cpmkId: t.Optional(t.Integer())
});

export const rencanaEvaluasiBody = t.Object({
  mataKuliahId: t.Integer({ default: 1 }),
  namaEvaluasi: t.String({ default: 'UTS' }),
  bobotEvaluasi: t.Numeric({ default: 20 }),
  deskripsi: t.Optional(t.String()),
  idPddikti: t.Optional(t.String())
});

export const getRpsSchema = {
  detail: {
    tags: ['RPS'],
    summary: 'Ambil RPS',
    description: 'Mengambil data RPS beserta topiknya berdasarkan mataKuliahId dan periodeId.'
  },
  query: t.Object({
    mataKuliahId: t.Numeric(),
    periodeId: t.String()
  })
};

export const createRpsSchema = {
  detail: {
    tags: ['RPS'],
    summary: 'Buat RPS Baru',
    description: 'Membuat header RPS baru (Akses Admin atau Dosen).'
  },
  body: rpsBody
};

export const updateRpsSchema = {
  detail: {
    tags: ['RPS'],
    summary: 'Perbarui RPS',
    description: 'Memperbarui data RPS berdasarkan ID.'
  },
  params: t.Object({
    id: t.Numeric()
  }),
  body: t.Partial(t.Object({
    deskripsi: t.Optional(t.String()),
    cplProdi: t.Optional(t.String())
  }))
};

export const addTopikSchema = {
  detail: {
    tags: ['RPS'],
    summary: 'Tambah Topik ke RPS',
    description: 'Menambahkan topik bahasan pertemuan ke RPS tertentu.'
  },
  params: t.Object({
    id: t.Numeric()
  }),
  body: rpsTopikBody
};

export const updateTopikSchema = {
  detail: {
    tags: ['RPS'],
    summary: 'Perbarui Topik RPS',
    description: 'Memperbarui data topik RPS berdasarkan ID topik.'
  },
  params: t.Object({
    topikId: t.Numeric()
  }),
  body: t.Partial(rpsTopikBody)
};

export const deleteTopikSchema = {
  detail: {
    tags: ['RPS'],
    summary: 'Hapus Topik RPS',
    description: 'Menghapus topik RPS berdasarkan ID topik.'
  },
  params: t.Object({
    topikId: t.Numeric()
  })
};

export const getRencanaEvaluasiSchema = {
  detail: {
    tags: ['Rencana Evaluasi'],
    summary: 'Daftar Rencana Evaluasi',
    description: 'Mengambil semua rencana evaluasi untuk mata kuliah tertentu.'
  },
  query: t.Object({
    mataKuliahId: t.Numeric()
  })
};

export const createRencanaEvaluasiSchema = {
  detail: {
    tags: ['Rencana Evaluasi'],
    summary: 'Buat Rencana Evaluasi Baru',
    description: 'Menambahkan rencana evaluasi baru untuk mata kuliah.'
  },
  body: rencanaEvaluasiBody
};

export const updateRencanaEvaluasiSchema = {
  detail: {
    tags: ['Rencana Evaluasi'],
    summary: 'Perbarui Rencana Evaluasi',
    description: 'Memperbarui rencana evaluasi berdasarkan ID.'
  },
  params: t.Object({
    id: t.Numeric()
  }),
  body: t.Partial(rencanaEvaluasiBody)
};

export const deleteRencanaEvaluasiSchema = {
  detail: {
    tags: ['Rencana Evaluasi'],
    summary: 'Hapus Rencana Evaluasi',
    description: 'Menghapus rencana evaluasi berdasarkan ID.'
  },
  params: t.Object({
    id: t.Numeric()
  })
};
