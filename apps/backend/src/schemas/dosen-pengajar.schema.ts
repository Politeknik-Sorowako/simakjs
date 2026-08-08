import { t } from 'elysia';

export const dosenPengajarBody = t.Object({
  dosenId: t.Integer({ default: 1 }),
  kelasKuliahId: t.Integer({ default: 1 }),
  sksBebanMengajar: t.Optional(t.Integer({ default: 3 })),
  idPddikti: t.Optional(t.String()),
});

export const updateDosenPengajarBody = t.Partial(
  t.Object({
    dosenId: t.Integer(),
    kelasKuliahId: t.Integer(),
    sksBebanMengajar: t.Integer(),
    idPddikti: t.String(),
  }),
);

export const getDosenPengajarSchema = {
  detail: {
    tags: ['Dosen Pengajar Kelas'],
    summary: 'Daftar Plotting Dosen Pengajar',
    description: 'Mengambil data plotting dosen ke kelas kuliah.',
  },
  query: t.Object({
    page: t.Optional(t.Numeric({ default: 1 })),
    limit: t.Optional(t.Numeric({ default: 10 })),
    kelasKuliahId: t.Optional(t.Numeric()),
  }),
  response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.Integer(),
          dosenId: t.Integer(),
          kelasKuliahId: t.Integer(),
          sksBebanMengajar: t.Union([t.Integer(), t.Null()]),
          idPddikti: t.Union([t.String(), t.Null()]),
          createdAt: t.Union([t.Date(), t.Null()], { default: null }),
          updatedAt: t.Union([t.Date(), t.Null()], { default: null }),
          dosen: t.Union([
            t.Object({
              id: t.Integer(),
              nip: t.String(),
              nama: t.String(),
              email: t.String(),
            }),
            t.Null(),
          ]),
          kelasKuliah: t.Union([
            t.Object({
              id: t.Integer(),
              namaKelas: t.String(),
              periodeId: t.String(),
            }),
            t.Null(),
          ]),
        }),
      ),
      meta: t.Object({
        total: t.Integer(),
        page: t.Integer(),
        limit: t.Integer(),
        totalPages: t.Integer(),
      }),
    }),
  },
};

export const createDosenPengajarSchema = {
  detail: {
    tags: ['Dosen Pengajar Kelas'],
    summary: 'Plot Dosen ke Kelas',
    description: 'Menambahkan mapping dosen pengajar ke suatu kelas.',
  },
  body: dosenPengajarBody,
  response: {
    201: t.Object({
      id: t.Integer(),
      dosenId: t.Integer(),
      kelasKuliahId: t.Integer(),
      sksBebanMengajar: t.Union([t.Integer(), t.Null()]),
      idPddikti: t.Union([t.String(), t.Null()]),
      createdAt: t.Union([t.Date(), t.Null()], { default: null }),
      updatedAt: t.Union([t.Date(), t.Null()], { default: null }),
    }),
    403: t.Object({
      error: t.String(),
    }),
  },
};

export const deleteDosenPengajarSchema = {
  detail: {
    tags: ['Dosen Pengajar Kelas'],
    summary: 'Hapus Plotting Dosen',
    description: 'Menghapus mapping dosen pengajar dari suatu kelas.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  response: {
    200: t.Object({
      message: t.String(),
    }),
    403: t.Object({
      error: t.String(),
    }),
    404: t.Object({
      error: t.String(),
    }),
  },
};
