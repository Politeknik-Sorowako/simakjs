import { t } from 'elysia';

export const resetE2eSchema = {
  detail: {
    tags: ['E2E Testing'],
    summary: 'Reset Database & Seed Data',
    description: 'Menghapus semua data dan melakukan seeding ulang data awal untuk testing. Hanya dapat diakses oleh Admin.',
  },
  response: {
    200: t.Object({
      message: t.String({ default: 'Database reset and seeded successfully' }),
      data: t.Object({
        prodiId: t.Integer(),
        dosenId: t.Integer(),
        mahasiswaId: t.Integer(),
        kelasId: t.Integer(),
        cpmkId: t.Integer(),
      }),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya admin yang dapat mereset database.' }),
    }),
    500: t.Object({
      error: t.String({ default: 'Gagal mereset database' }),
    }),
  },
};
