import { t } from 'elysia';

export const getPddiktiStatsSchema = {
  response: {
    200: t.Object({
      mahasiswa: t.Object({
        total: t.Integer({ default: 10 }),
        synced: t.Integer({ default: 8 }),
        unsynced: t.Integer({ default: 2 })
      }),
      kelasKuliah: t.Object({
        total: t.Integer({ default: 5 }),
        synced: t.Integer({ default: 4 }),
        unsynced: t.Integer({ default: 1 })
      }),
      krs: t.Object({
        total: t.Integer({ default: 15 }),
        synced: t.Integer({ default: 12 }),
        unsynced: t.Integer({ default: 3 })
      })
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin, Prodi, atau Dosen.' })
    })
  },
  detail: {
    tags: ['PDDIKTI'],
    summary: 'Statistik Neo Feeder PDDIKTI',
    description: 'Mengambil statistik jumlah sinkronisasi data mahasiswa, kelas kuliah, dan KRS dengan PDDIKTI.'
  }
};

export const syncPddiktiSchema = {
  response: {
    200: t.Object({
      message: t.String({ default: 'Sinkronisasi dengan Neo Feeder PDDIKTI berhasil dilaksanakan.' }),
      details: t.Object({
        prodiSynced: t.Integer({ default: 1 }),
        mataKuliahSynced: t.Integer({ default: 2 }),
        mahasiswaSynced: t.Integer({ default: 5 }),
        kelasSynced: t.Integer({ default: 3 }),
        krsSynced: t.Integer({ default: 10 })
      })
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin, Prodi, atau Dosen.' })
    })
  },
  detail: {
    tags: ['PDDIKTI'],
    summary: 'Sinkronisasi Semua Data ke PDDIKTI',
    description: 'Menjalankan sinkronisasi data program studi, mata kuliah, mahasiswa, kelas kuliah, dan KRS yang belum tersinkronisasi ke Neo Feeder PDDIKTI.'
  }
};
