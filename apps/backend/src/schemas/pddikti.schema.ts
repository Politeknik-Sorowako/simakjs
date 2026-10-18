import { t } from 'elysia';

export const getPddiktiStatsSchema = {
  response: {
    200: t.Object({
      mahasiswa: t.Object({
        total: t.Integer({ default: 10 }),
        synced: t.Integer({ default: 8 }),
        unsynced: t.Integer({ default: 2 }),
      }),
      kelasKuliah: t.Object({
        total: t.Integer({ default: 5 }),
        synced: t.Integer({ default: 4 }),
        unsynced: t.Integer({ default: 1 }),
      }),
      krs: t.Object({
        total: t.Integer({ default: 15 }),
        synced: t.Integer({ default: 12 }),
        unsynced: t.Integer({ default: 3 }),
      }),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin, Prodi, atau Dosen.' }),
    }),
  },
  detail: {
    tags: ['PDDIKTI'],
    summary: 'Statistik Neo Feeder PDDIKTI',
    description: 'Mengambil statistik jumlah sinkronisasi data mahasiswa, kelas kuliah, dan KRS dengan PDDIKTI.',
  },
};

export const testFeederConnectionSchema = {
  body: t.Optional(
    t.Object({
      url: t.Optional(t.String()),
      username: t.Optional(t.String()),
      password: t.Optional(t.String()),
    }),
  ),
  response: {
    200: t.Object({
      ok: t.Boolean(),
      url: t.String(),
      username: t.String(),
      latencyMs: t.Number(),
      profilKode: t.Optional(t.String()),
      profilNama: t.Optional(t.String()),
      error: t.Optional(t.String()),
      checkedAt: t.String(),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin atau Super Admin.' }),
    }),
  },
  detail: {
    tags: ['PDDIKTI'],
    summary: 'Uji Koneksi Neo Feeder PDDIKTI',
    description: 'Memvalidasi alamat & kredensial Web Service Feeder dengan memanggil GetToken + GetProfilPT.',
  },
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
        krsSynced: t.Integer({ default: 10 }),
      }),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin, Prodi, atau Dosen.' }),
    }),
  },
  detail: {
    tags: ['PDDIKTI'],
    summary: 'Sinkronisasi Semua Data ke PDDIKTI',
    description:
      'Menjalankan sinkronisasi data program studi, mata kuliah, mahasiswa, kelas kuliah, dan KRS yang belum tersinkronisasi ke Neo Feeder PDDIKTI.',
  },
};

const ENTITY_UNION = [
  t.Literal('semester'),
  t.Literal('prodi'),
  t.Literal('matkul'),
  t.Literal('dosen'),
  t.Literal('mahasiswa'),
  t.Literal('kelas'),
  t.Literal('krs-nilai'),
  t.Literal('dosen-pengajar'),
  t.Literal('transkrip'),
  t.Literal('aktivitas-mahasiswa'),
  t.Literal('anggota-aktivitas'),
  t.Literal('pembimbing-aktivitas'),
  t.Literal('konversi-aktivitas'),
];

const PULL_ENTITY_KEYS = {
  entity: t.Union(ENTITY_UNION),
};

export const getPullEntitiesSchema = {
  response: {
    200: t.Object({
      writeGuard: t.Boolean(),
      entities: t.Array(
        t.Object({
          key: t.Union(ENTITY_UNION),
          label: t.String(),
          category: t.Union([t.Literal('referensi'), t.Literal('master'), t.Literal('transaksional')]),
          feederAct: t.String(),
          description: t.String(),
          previewOnly: t.Optional(t.Boolean()),
        }),
      ),
    }),
    401: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
  },
  detail: {
    tags: ['PDDIKTI'],
    summary: 'Daftar Entitas Pull Neo Feeder PDDIKTI',
    description:
      'Mengambil katalog entitas referensi, master, & transaksional yang dapat ditarik (read-only Get*) dari Neo Feeder.',
  },
};

const scalarNullable = t.Union([t.String(), t.Number(), t.Boolean(), t.Null()]);
const STATUS_UNION = t.Union([
  t.Literal('baru'),
  t.Literal('isi'),
  t.Literal('link_id'),
  t.Literal('konflik'),
  t.Literal('sama'),
]);

export const getPullPreviewSchema = {
  query: t.Object({
    ...PULL_ENTITY_KEYS,
    filter: t.Optional(t.String()),
  }),
  response: {
    200: t.Object({
      entity: t.String(),
      feederAct: t.String(),
      writeGuard: t.Boolean(),
      summary: t.Object({
        totalFeeder: t.Integer(),
        baru: t.Integer(),
        isi: t.Integer(),
        linkId: t.Integer(),
        konflik: t.Integer(),
        sama: t.Integer(),
      }),
      items: t.Array(
        t.Object({
          feederId: t.String(),
          naturalKey: t.String(),
          label: t.String(),
          status: STATUS_UNION,
          localId: t.Union([t.String(), t.Number(), t.Null()]),
          localIdPddikti: t.Union([t.String(), t.Null()]),
          feederData: t.Record(t.String(), scalarNullable),
          localData: t.Union([t.Record(t.String(), scalarNullable), t.Null()]),
          diffs: t.Array(
            t.Object({
              field: t.String(),
              feederValue: scalarNullable,
              localValue: scalarNullable,
            }),
          ),
          canApply: t.Boolean(),
          note: t.Optional(t.String()),
        }),
      ),
      fetchedAt: t.String(),
    }),
    400: t.Object({ error: t.String() }),
    401: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
  },
  detail: {
    tags: ['PDDIKTI'],
    summary: 'Preview Tarik Data dari Neo Feeder PDDIKTI',
    description:
      'Menarik data dari Feeder (read-only Get*) dan membandingkannya dengan database lokal tanpa mengubah data.',
  },
};

export const applyPullSchema = {
  body: t.Object({
    ...PULL_ENTITY_KEYS,
    feederIds: t.Array(t.String(), { minItems: 1, maxItems: 2000 }),
    conflictResolution: t.Optional(t.Union([t.Literal('feeder'), t.Literal('lokal')])),
    filter: t.Optional(t.String()),
  }),
  response: {
    200: t.Object({
      entity: t.String(),
      conflictResolution: t.Union([t.Literal('feeder'), t.Literal('lokal')]),
      inserted: t.Integer(),
      updated: t.Integer(),
      linkedOnly: t.Integer(),
      skipped: t.Integer(),
      errors: t.Array(
        t.Object({
          feederId: t.String(),
          error: t.String(),
        }),
      ),
    }),
    400: t.Object({ error: t.String() }),
    401: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
  },
  detail: {
    tags: ['PDDIKTI'],
    summary: 'Terapkan Data Tarikan Neo Feeder ke Lokal',
    description:
      'Menerapkan baris Feeder terpilih ke tabel lokal (upsert / link id_pddikti). Hanya Admin atau Super Admin.',
  },
};
