import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  time,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('user_role', [
  'super_admin',
  'admin',
  'dosen',
  'mahasiswa',
  'prodi',
  'keuangan',
  'guest',
  'calon_mahasiswa',
]);

export const applicationStatusEnum = pgEnum('application_status', [
  'draft',
  'awaiting_payment',
  'submitted',
  'documents_verified',
  'documents_rejected',
  'returned',
  'exam_scheduled',
  'exam_completed',
  'passed',
  'failed',
  're_registration',
  'nim_issued',
]);
export const jenisKelaminEnum = pgEnum('jenis_kelamin', ['L', 'P']);
export const tagihanStatusEnum = pgEnum('tagihan_status', ['belum_bayar', 'cicilan', 'lunas']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  nama: varchar('nama', { length: 255 }).notNull(),
  role: roleEnum('role').notNull().default('mahasiswa'),
  prodiIds: jsonb('prodi_ids').$type<number[]>().default([]).notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  mustChangePassword: boolean('must_change_password').default(false).notNull(),
  theme: varchar('theme', { length: 20 }).default('light').notNull(),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const programStudi = pgTable('program_studi', {
  id: serial('id').primaryKey(),
  kode: varchar('kode', { length: 50 }).notNull().unique(),
  nama: varchar('nama', { length: 255 }).notNull(),
  jenjang: varchar('jenjang', { length: 10 }).notNull(), // D3, D4, dll.
  idPddikti: varchar('id_pddikti', { length: 50 }).unique(),
  isSynced: boolean('is_synced').default(false).notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const dosen = pgTable('dosen', {
  id: serial('id').primaryKey(),
  nip: varchar('nip', { length: 50 }).notNull().unique(),
  nama: varchar('nama', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  programStudiId: integer('program_studi_id').references(() => programStudi.id, { onDelete: 'restrict' }),
  idPddikti: varchar('id_pddikti', { length: 50 }).unique(),
  isSynced: boolean('is_synced').default(false).notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  nidn: varchar('nidn', { length: 50 }).unique(),
  nik: varchar('nik', { length: 16 }),
  jenisKelamin: jenisKelaminEnum('jenis_kelamin'),
  tanggalLahir: date('tanggal_lahir'),
  tempatLahir: varchar('tempat_lahir', { length: 100 }),
  idAgama: integer('id_agama'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const mahasiswa = pgTable('mahasiswa', {
  id: serial('id').primaryKey(),
  nim: varchar('nim', { length: 50 }).notNull().unique(),
  nama: varchar('nama', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  angkatan: varchar('angkatan', { length: 4 }), // misal "2024"
  programStudiId: integer('program_studi_id').references(() => programStudi.id, { onDelete: 'restrict' }),
  dosenPaId: integer('dosen_pa_id').references(() => dosen.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 50 }).notNull().default('aktif'), // aktif, cuti, lulus, drop_out
  idPddikti: varchar('id_pddikti', { length: 50 }).unique(),
  isSynced: boolean('is_synced').default(false).notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  namaIbuKandung: varchar('nama_ibu_kandung', { length: 255 }),
  nik: varchar('nik', { length: 16 }).unique(),
  jenisKelamin: jenisKelaminEnum('jenis_kelamin').notNull(),
  tanggalLahir: date('tanggal_lahir'),
  tempatLahir: varchar('tempat_lahir', { length: 100 }),
  idAgama: integer('id_agama'),
  jalan: text('jalan'),
  rt: varchar('rt', { length: 5 }),
  rw: varchar('rw', { length: 5 }),
  kodePos: varchar('kode_pos', { length: 10 }),
  kewarganegaraan: varchar('kewarganegaraan', { length: 5 }).default('ID'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const periodeAkademik = pgTable('periode_akademik', {
  id: varchar('id', { length: 5 }).primaryKey(), // misal "20231"
  nama: varchar('nama', { length: 100 }).notNull(),
  aktif: boolean('aktif').default(false).notNull(),
  idPddikti: varchar('id_pddikti', { length: 50 }).unique(),
  isSynced: boolean('is_synced').default(false).notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const mataKuliah = pgTable(
  'mata_kuliah',
  {
    id: serial('id').primaryKey(),
    programStudiId: integer('program_studi_id')
      .notNull()
      .references(() => programStudi.id, { onDelete: 'restrict' }),
    kode: varchar('kode', { length: 50 }).notNull(),
    nama: varchar('nama', { length: 255 }).notNull(),
    sksTotal: integer('sks_total').notNull(),
    sksTatapMuka: integer('sks_tatap_muka'),
    sksPraktek: integer('sks_praktek'),
    sksPraktekLapangan: integer('sks_praktek_lapangan').default(0),
    sksSimulasi: integer('sks_simulasi').default(0),
    idPddikti: varchar('id_pddikti', { length: 50 }).unique(),
    isSynced: boolean('is_synced').default(false).notNull(),
    lastSyncAt: timestamp('last_sync_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    unq: unique('mata_kuliah_prodi_kode_unique').on(t.programStudiId, t.kode),
  }),
);

export const kelasKuliah = pgTable('kelas_kuliah', {
  id: serial('id').primaryKey(),
  mataKuliahId: integer('mata_kuliah_id')
    .notNull()
    .references(() => mataKuliah.id, { onDelete: 'restrict' }),
  periodeId: varchar('periode_id', { length: 5 })
    .notNull()
    .references(() => periodeAkademik.id, { onDelete: 'restrict' }),
  namaKelas: varchar('nama_kelas', { length: 50 }).notNull(),
  isLocked: boolean('is_locked').default(false).notNull(),
  tanggalMulaiEfektif: date('tanggal_mulai_efektif'),
  tanggalAkhirEfektif: date('tanggal_akhir_efektif'),
  idPddikti: varchar('id_pddikti', { length: 50 }).unique(),
  isSynced: boolean('is_synced').default(false).notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const dosenPengajarKelas = pgTable('dosen_pengajar_kelas', {
  id: serial('id').primaryKey(),
  dosenId: integer('dosen_id')
    .notNull()
    .references(() => dosen.id, { onDelete: 'cascade' }),
  kelasKuliahId: integer('kelas_kuliah_id')
    .notNull()
    .references(() => kelasKuliah.id, { onDelete: 'cascade' }),
  sksBebanMengajar: integer('sks_beban_mengajar'),
  idPddikti: varchar('id_pddikti', { length: 50 }).unique(),
  isSynced: boolean('is_synced').default(false).notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const tagihan = pgTable('tagihan', {
  id: serial('id').primaryKey(),
  mahasiswaId: integer('mahasiswa_id')
    .notNull()
    .references(() => mahasiswa.id, { onDelete: 'cascade' }),
  periodeId: varchar('periode_id', { length: 5 })
    .notNull()
    .references(() => periodeAkademik.id, { onDelete: 'restrict' }),
  nominal: integer('nominal').notNull(),
  nominalTerbayar: integer('nominal_terbayar').default(0).notNull(),
  status: tagihanStatusEnum('status').notNull().default('belum_bayar'),
  tanggalBayar: timestamp('tanggal_bayar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const krs = pgTable(
  'krs',
  {
    id: serial('id').primaryKey(),
    mahasiswaId: integer('mahasiswa_id')
      .notNull()
      .references(() => mahasiswa.id, { onDelete: 'cascade' }),
    kelasKuliahId: integer('kelas_kuliah_id')
      .notNull()
      .references(() => kelasKuliah.id, { onDelete: 'cascade' }),
    nilaiAngka: numeric('nilai_angka', { precision: 5, scale: 2 }),
    nilaiHuruf: varchar('nilai_huruf', { length: 5 }),
    nilaiIndeks: numeric('nilai_indeks', { precision: 3, scale: 2 }),
    isApproved: boolean('is_approved').default(false).notNull(),
    approvedById: integer('approved_by_id').references(() => dosen.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at'),
    idPddikti: varchar('id_pddikti', { length: 50 }).unique(),
    isSynced: boolean('is_synced').default(false).notNull(),
    lastSyncAt: timestamp('last_sync_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => {
    return {
      mahasiswaIdIdx: index('krs_mahasiswa_id_idx').on(table.mahasiswaId),
      kelasKuliahIdIdx: index('krs_kelas_kuliah_id_idx').on(table.kelasKuliahId),
      mahasiswaKelasUnique: unique('krs_mahasiswa_kelas_unique').on(table.mahasiswaId, table.kelasKuliahId),
    };
  },
);

// Relations
export const programStudiRelations = relations(programStudi, ({ many }) => ({
  mahasiswa: many(mahasiswa),
  dosen: many(dosen),
  angkatanKurikulum: many(angkatanKurikulum),
  kelompokApel: many(kelompokApel),
}));

export const mahasiswaRelations = relations(mahasiswa, ({ one, many }) => ({
  programStudi: one(programStudi, {
    fields: [mahasiswa.programStudiId],
    references: [programStudi.id],
  }),
  dosenPa: one(dosen, {
    fields: [mahasiswa.dosenPaId],
    references: [dosen.id],
  }),
  krs: many(krs),
  tagihan: many(tagihan),
  presensi: many(presensi),
  kompensasiBayar: many(kompensasiBayar),
  bimbingan: many(bimbingan),
  pelanggaran: many(pelanggaran),
  pengajuanYudisium: one(pengajuanYudisium),
  pengajuanCuti: many(pengajuanCuti),
  mahasiswaKeluar: many(mahasiswaKeluar),
  kelompokApelAnggota: many(kelompokApelAnggota),
  presensiApel: many(presensiApel),
}));

export const dosenRelations = relations(dosen, ({ one, many }) => ({
  programStudi: one(programStudi, {
    fields: [dosen.programStudiId],
    references: [programStudi.id],
  }),
  dosenPengajarKelas: many(dosenPengajarKelas),
  mahasiswaWali: many(mahasiswa),
  bimbingan: many(bimbingan),
  kelompokApelPj: many(kelompokApel, { relationName: 'dosenPj' }),
  sesiApel: many(sesiApel),
}));

export const periodeAkademikRelations = relations(periodeAkademik, ({ many }) => ({
  kelasKuliah: many(kelasKuliah),
}));

export const mataKuliahRelations = relations(mataKuliah, ({ one, many }) => ({
  programStudi: one(programStudi, {
    fields: [mataKuliah.programStudiId],
    references: [programStudi.id],
  }),
  kelasKuliah: many(kelasKuliah),
  cpmk: many(cpmk),
}));

export const kelasKuliahRelations = relations(kelasKuliah, ({ one, many }) => ({
  mataKuliah: one(mataKuliah, {
    fields: [kelasKuliah.mataKuliahId],
    references: [mataKuliah.id],
  }),
  periodeAkademik: one(periodeAkademik, {
    fields: [kelasKuliah.periodeId],
    references: [periodeAkademik.id],
  }),
  dosenPengajarKelas: many(dosenPengajarKelas),
  krs: many(krs),
  komponenNilai: many(komponenNilai),
}));

export const dosenPengajarKelasRelations = relations(dosenPengajarKelas, ({ one }) => ({
  dosen: one(dosen, {
    fields: [dosenPengajarKelas.dosenId],
    references: [dosen.id],
  }),
  kelasKuliah: one(kelasKuliah, {
    fields: [dosenPengajarKelas.kelasKuliahId],
    references: [kelasKuliah.id],
  }),
}));

export const krsRelations = relations(krs, ({ one, many }) => ({
  mahasiswa: one(mahasiswa, {
    fields: [krs.mahasiswaId],
    references: [mahasiswa.id],
  }),
  kelasKuliah: one(kelasKuliah, {
    fields: [krs.kelasKuliahId],
    references: [kelasKuliah.id],
  }),
  approvedBy: one(dosen, {
    fields: [krs.approvedById],
    references: [dosen.id],
  }),
  nilaiKomponenMahasiswa: many(nilaiKomponenMahasiswa),
}));

export const tagihanRelations = relations(tagihan, ({ one }) => ({
  mahasiswa: one(mahasiswa, {
    fields: [tagihan.mahasiswaId],
    references: [mahasiswa.id],
  }),
  periodeAkademik: one(periodeAkademik, {
    fields: [tagihan.periodeId],
    references: [periodeAkademik.id],
  }),
}));

export const presensiStatusEnum = pgEnum('presensi_status', [
  'hadir',
  'sakit',
  'izin',
  'telat',
  'alpa',
  'terlambat',
  'unknown',
]);

export const cpmk = pgTable(
  'cpmk',
  {
    id: serial('id').primaryKey(),
    mataKuliahId: integer('mata_kuliah_id')
      .notNull()
      .references(() => mataKuliah.id, { onDelete: 'cascade' }),
    kurikulumMataKuliahId: integer('kurikulum_mata_kuliah_id').references(() => kurikulumMataKuliah.id, {
      onDelete: 'set null',
    }),
    kode: varchar('kode', { length: 50 }).notNull(),
    deskripsi: text('deskripsi').notNull(),
    bobotMk: numeric('bobot_mk', { precision: 5, scale: 2 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    kurikulumMkIdx: index('cpmk_kurikulum_mata_kuliah_id_idx').on(t.kurikulumMataKuliahId),
    mkKodeUnique: unique('cpmk_mata_kuliah_kode_unique').on(t.mataKuliahId, t.kode),
  }),
);

export const bap = pgTable('bap', {
  id: serial('id').primaryKey(),
  kelasKuliahId: integer('kelas_kuliah_id')
    .notNull()
    .references(() => kelasKuliah.id, { onDelete: 'cascade' }),
  tanggal: date('tanggal').notNull(),
  pertemuanKe: integer('pertemuan_ke').notNull(),
  materi: text('materi').notNull(),
  catatan: text('catatan'),
  durasiMenit: integer('durasi_menit').notNull(),
  cpmkId: integer('cpmk_id').references(() => cpmk.id, { onDelete: 'restrict' }),
  dosenId: integer('dosen_id')
    .notNull()
    .references(() => dosen.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const presensi = pgTable(
  'presensi',
  {
    id: serial('id').primaryKey(),
    bapId: integer('bap_id')
      .notNull()
      .references(() => bap.id, { onDelete: 'cascade' }),
    mahasiswaId: integer('mahasiswa_id')
      .notNull()
      .references(() => mahasiswa.id, { onDelete: 'cascade' }),
    status: presensiStatusEnum('status').notNull(),
    durasiMangkir: integer('durasi_mangkir').default(0).notNull(),
    keterangan: text('keterangan'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    mhsStatusIdx: index('idx_presensi_mhs_status').on(t.mahasiswaId, t.status),
  }),
);

export const kompensasiBayar = pgTable('kompensasi_bayar', {
  id: serial('id').primaryKey(),
  mahasiswaId: integer('mahasiswa_id')
    .notNull()
    .references(() => mahasiswa.id, { onDelete: 'cascade' }),
  jumlahMenit: integer('jumlah_menit').notNull(),
  tanggal: date('tanggal').notNull(),
  keterangan: text('keterangan').notNull(),
  petugasId: integer('petugas_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// --- PRESENSI APEL & KELOMPOK APEL ---

export const kelompokApel = pgTable('kelompok_apel', {
  id: serial('id').primaryKey(),
  namaKelompok: varchar('nama_kelompok', { length: 100 }).notNull(),
  dosenId: integer('dosen_id').references(() => dosen.id, { onDelete: 'restrict' }),
  shift: varchar('shift', { length: 10 }).notNull().default('pagi'),
  keterangan: text('keterangan'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const kelompokApelAnggota = pgTable(
  'kelompok_apel_anggota',
  {
    id: serial('id').primaryKey(),
    kelompokApelId: integer('kelompok_apel_id')
      .notNull()
      .references(() => kelompokApel.id, { onDelete: 'cascade' }),
    mahasiswaId: integer('mahasiswa_id')
      .notNull()
      .references(() => mahasiswa.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    uniqueAnggota: unique('kelompok_apel_anggota_unique').on(t.kelompokApelId, t.mahasiswaId),
  }),
);

export const sesiApel = pgTable('sesi_apel', {
  id: serial('id').primaryKey(),
  kelompokApelId: integer('kelompok_apel_id')
    .notNull()
    .references(() => kelompokApel.id, { onDelete: 'cascade' }),
  tanggal: date('tanggal').notNull(),
  shift: varchar('shift', { length: 10 }).notNull(),
  dosenId: integer('dosen_id')
    .notNull()
    .references(() => dosen.id, { onDelete: 'restrict' }),
  jamMulai: time('jam_mulai').notNull(),
  catatan: text('catatan'),
  isClosed: boolean('is_closed').default(false).notNull(),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const presensiApel = pgTable(
  'presensi_apel',
  {
    id: serial('id').primaryKey(),
    sesiApelId: integer('sesi_apel_id')
      .notNull()
      .references(() => sesiApel.id, { onDelete: 'cascade' }),
    mahasiswaId: integer('mahasiswa_id')
      .notNull()
      .references(() => mahasiswa.id, { onDelete: 'cascade' }),
    status: presensiStatusEnum('status').notNull().default('hadir'),
    menitTerlambat: integer('menit_terlambat'),
    keterangan: text('keterangan'),
    verifiedStatus: presensiStatusEnum('verified_status'),
    verifiedBy: integer('verified_by').references(() => users.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at'),
    verificationNote: text('verification_note'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    mhsStatusVerifiedIdx: index('idx_presensi_apel_mhs_status').on(t.mahasiswaId, t.status, t.verifiedStatus),
  }),
);

export const cpmkRelations = relations(cpmk, ({ one, many }) => ({
  mataKuliah: one(mataKuliah, {
    fields: [cpmk.mataKuliahId],
    references: [mataKuliah.id],
  }),
  kurikulumMataKuliah: one(kurikulumMataKuliah, {
    fields: [cpmk.kurikulumMataKuliahId],
    references: [kurikulumMataKuliah.id],
  }),
  bap: many(bap),
  subCpmk: many(subCpmk),
  cplMappings: many(cpmkCpl),
}));

export const bapRelations = relations(bap, ({ one, many }) => ({
  kelasKuliah: one(kelasKuliah, {
    fields: [bap.kelasKuliahId],
    references: [kelasKuliah.id],
  }),
  cpmk: one(cpmk, {
    fields: [bap.cpmkId],
    references: [cpmk.id],
  }),
  dosen: one(dosen, {
    fields: [bap.dosenId],
    references: [dosen.id],
  }),
  presensi: many(presensi),
}));

export const presensiRelations = relations(presensi, ({ one }) => ({
  bap: one(bap, {
    fields: [presensi.bapId],
    references: [bap.id],
  }),
  mahasiswa: one(mahasiswa, {
    fields: [presensi.mahasiswaId],
    references: [mahasiswa.id],
  }),
}));

export const kompensasiBayarRelations = relations(kompensasiBayar, ({ one }) => ({
  mahasiswa: one(mahasiswa, {
    fields: [kompensasiBayar.mahasiswaId],
    references: [mahasiswa.id],
  }),
  petugas: one(users, {
    fields: [kompensasiBayar.petugasId],
    references: [users.id],
  }),
}));

// --- APEL RELATIONS ---

export const kelompokApelRelations = relations(kelompokApel, ({ one, many }) => ({
  dosen: one(dosen, {
    fields: [kelompokApel.dosenId],
    references: [dosen.id],
  }),
  anggota: many(kelompokApelAnggota),
  sesi: many(sesiApel),
}));

export const kelompokApelAnggotaRelations = relations(kelompokApelAnggota, ({ one }) => ({
  kelompokApel: one(kelompokApel, {
    fields: [kelompokApelAnggota.kelompokApelId],
    references: [kelompokApel.id],
  }),
  mahasiswa: one(mahasiswa, {
    fields: [kelompokApelAnggota.mahasiswaId],
    references: [mahasiswa.id],
  }),
}));

export const sesiApelRelations = relations(sesiApel, ({ one, many }) => ({
  kelompokApel: one(kelompokApel, {
    fields: [sesiApel.kelompokApelId],
    references: [kelompokApel.id],
  }),
  dosen: one(dosen, {
    fields: [sesiApel.dosenId],
    references: [dosen.id],
  }),
  presensi: many(presensiApel),
}));

export const presensiApelRelations = relations(presensiApel, ({ one }) => ({
  sesiApel: one(sesiApel, {
    fields: [presensiApel.sesiApelId],
    references: [sesiApel.id],
  }),
  mahasiswa: one(mahasiswa, {
    fields: [presensiApel.mahasiswaId],
    references: [mahasiswa.id],
  }),
  verifiedByUser: one(users, {
    fields: [presensiApel.verifiedBy],
    references: [users.id],
  }),
}));

// --- END APEL RELATIONS ---

export const kategoriBimbingan = pgTable('kategori_bimbingan', {
  id: serial('id').primaryKey(),
  nama: varchar('nama', { length: 100 }).notNull(),
  deskripsi: text('deskripsi'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const bimbingan = pgTable('bimbingan', {
  id: serial('id').primaryKey(),
  mahasiswaId: integer('mahasiswa_id')
    .notNull()
    .references(() => mahasiswa.id, { onDelete: 'cascade' }),
  dosenId: integer('dosen_id').references(() => dosen.id, { onDelete: 'set null' }),
  kategoriId: integer('kategori_id').references(() => kategoriBimbingan.id, { onDelete: 'set null' }),
  periodeId: varchar('periode_id', { length: 5 })
    .notNull()
    .references(() => periodeAkademik.id, { onDelete: 'restrict' }),
  ringkasan: text('ringkasan'),
  isApproved: boolean('is_approved').default(false).notNull(),
  permasalahan: text('permasalahan'),
  solusi: text('solusi'),
  tanggalBimbingan: date('tanggal_bimbingan'),
  statusBkd: boolean('status_bkd').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const bimbinganThread = pgTable('bimbingan_thread', {
  id: serial('id').primaryKey(),
  bimbinganId: integer('bimbingan_id')
    .notNull()
    .references(() => bimbingan.id, { onDelete: 'cascade' }),
  senderRole: roleEnum('sender_role').notNull(),
  pesan: text('pesan').notNull(),
  tipe: varchar('tipe', { length: 10 }).default('uts').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sesiBimbingan = pgTable('sesi_bimbingan', {
  id: serial('id').primaryKey(),
  bimbinganId: integer('bimbingan_id')
    .notNull()
    .references(() => bimbingan.id, { onDelete: 'cascade' }),
  kategoriId: integer('kategori_id').references(() => kategoriBimbingan.id, { onDelete: 'set null' }),
  pertemuanKe: integer('pertemuan_ke').notNull(),
  tanggalBimbingan: date('tanggal_bimbingan').notNull(),
  permasalahan: text('permasalahan').notNull(),
  solusi: text('solusi').notNull(),
  statusBkd: boolean('status_bkd').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const pelanggaran = pgTable('pelanggaran', {
  id: serial('id').primaryKey(),
  mahasiswaId: integer('mahasiswa_id')
    .notNull()
    .references(() => mahasiswa.id, { onDelete: 'cascade' }),
  tanggal: date('tanggal').notNull(),
  jenisPelanggaran: varchar('jenis_pelanggaran', { length: 255 }).notNull(),
  bobotPoin: integer('bobot_poin').notNull(),
  keterangan: text('keterangan').notNull(),
  dibuatOleh: integer('dibuat_oleh').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const bimbinganRelations = relations(bimbingan, ({ one, many }) => ({
  mahasiswa: one(mahasiswa, {
    fields: [bimbingan.mahasiswaId],
    references: [mahasiswa.id],
  }),
  dosen: one(dosen, {
    fields: [bimbingan.dosenId],
    references: [dosen.id],
  }),
  periodeAkademik: one(periodeAkademik, {
    fields: [bimbingan.periodeId],
    references: [periodeAkademik.id],
  }),
  thread: many(bimbinganThread),
  sesi: many(sesiBimbingan),
}));

export const bimbinganThreadRelations = relations(bimbinganThread, ({ one }) => ({
  bimbingan: one(bimbingan, {
    fields: [bimbinganThread.bimbinganId],
    references: [bimbingan.id],
  }),
}));

export const sesiBimbinganRelations = relations(sesiBimbingan, ({ one }) => ({
  bimbingan: one(bimbingan, {
    fields: [sesiBimbingan.bimbinganId],
    references: [bimbingan.id],
  }),
}));

export const pelanggaranRelations = relations(pelanggaran, ({ one }) => ({
  mahasiswa: one(mahasiswa, {
    fields: [pelanggaran.mahasiswaId],
    references: [mahasiswa.id],
  }),
  petugas: one(users, {
    fields: [pelanggaran.dibuatOleh],
    references: [users.id],
  }),
}));

export const komponenNilai = pgTable('komponen_nilai', {
  id: serial('id').primaryKey(),
  kelasKuliahId: integer('kelas_kuliah_id')
    .notNull()
    .references(() => kelasKuliah.id, { onDelete: 'cascade' }),
  nama: varchar('nama', { length: 100 }).notNull(),
  bobot: integer('bobot').notNull(), // 0 - 100
  subCpmkId: integer('sub_cpmk_id').references(() => subCpmk.id, { onDelete: 'set null' }),
  rencanaEvaluasiId: integer('rencana_evaluasi_id').references(() => rencanaEvaluasi.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const nilaiKomponenMahasiswa = pgTable('nilai_komponen_mahasiswa', {
  id: serial('id').primaryKey(),
  krsId: integer('krs_id')
    .notNull()
    .references(() => krs.id, { onDelete: 'cascade' }),
  komponenNilaiId: integer('komponen_nilai_id')
    .notNull()
    .references(() => komponenNilai.id, { onDelete: 'cascade' }),
  nilai: numeric('nilai', { precision: 5, scale: 2 }).notNull(), // 0.00 - 100.00
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const pengajuanYudisium = pgTable('pengajuan_yudisium', {
  id: serial('id').primaryKey(),
  mahasiswaId: integer('mahasiswa_id')
    .notNull()
    .unique()
    .references(() => mahasiswa.id, { onDelete: 'cascade' }),
  bebasPerpustakaan: boolean('bebas_perpustakaan').default(false).notNull(),
  bebasLab: boolean('bebas_lab').default(false).notNull(),
  buktiPembayaranWisuda: boolean('bukti_pembayaran_wisuda').default(false).notNull(),
  skorToefl: integer('skor_toefl').default(0).notNull(),
  judulTa: text('judul_ta').notNull(),
  status: varchar('status', { length: 20 }).default('diajukan').notNull(), // 'diajukan', 'diverifikasi', 'disetujui', 'ditolak'
  catatan: text('catatan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const komponenNilaiRelations = relations(komponenNilai, ({ one, many }) => ({
  kelasKuliah: one(kelasKuliah, {
    fields: [komponenNilai.kelasKuliahId],
    references: [kelasKuliah.id],
  }),
  nilaiKomponenMahasiswa: many(nilaiKomponenMahasiswa),
}));

export const nilaiKomponenMahasiswaRelations = relations(nilaiKomponenMahasiswa, ({ one }) => ({
  krs: one(krs, {
    fields: [nilaiKomponenMahasiswa.krsId],
    references: [krs.id],
  }),
  komponenNilai: one(komponenNilai, {
    fields: [nilaiKomponenMahasiswa.komponenNilaiId],
    references: [komponenNilai.id],
  }),
}));

export const pengajuanYudisiumRelations = relations(pengajuanYudisium, ({ one }) => ({
  mahasiswa: one(mahasiswa, {
    fields: [pengajuanYudisium.mahasiswaId],
    references: [mahasiswa.id],
  }),
}));

export const passwordResets = pgTable('password_resets', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const kurikulum = pgTable('kurikulum', {
  id: serial('id').primaryKey(),
  kode: varchar('kode', { length: 50 }).notNull().unique(),
  nama: varchar('nama', { length: 255 }).notNull(),
  programStudiId: integer('program_studi_id')
    .notNull()
    .references(() => programStudi.id, { onDelete: 'restrict' }),
  semesterMulai: varchar('semester_mulai', { length: 5 })
    .notNull()
    .references(() => periodeAkademik.id, { onDelete: 'restrict' }),
  jumlahSksLulus: integer('jumlah_sks_lulus').notNull(),
  jumlahSksWajib: integer('jumlah_sks_wajib').notNull(),
  jumlahSksPilihan: integer('jumlah_sks_pilihan').notNull(),
  isAktif: boolean('is_aktif').default(false).notNull(),
  isLocked: boolean('is_locked').default(false).notNull(),
  idPddikti: varchar('id_pddikti', { length: 50 }).unique(),
  isSynced: boolean('is_synced').default(false).notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const kurikulumMataKuliah = pgTable(
  'kurikulum_mata_kuliah',
  {
    id: serial('id').primaryKey(),
    kurikulumId: integer('kurikulum_id')
      .notNull()
      .references(() => kurikulum.id, { onDelete: 'cascade' }),
    mataKuliahId: integer('mata_kuliah_id')
      .notNull()
      .references(() => mataKuliah.id, { onDelete: 'cascade' }),
    semester: integer('semester').notNull(),
    sksMataKuliah: integer('sks_mata_kuliah').notNull(),
    sksTatapMuka: integer('sks_tatap_muka'),
    sksPraktek: integer('sks_praktek'),
    sksPraktekLapangan: integer('sks_praktek_lapangan').default(0),
    sksSimulasi: integer('sks_simulasi').default(0),
    isWajib: boolean('is_wajib').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    unq: unique('kurikulum_mata_kuliah_unique').on(t.kurikulumId, t.mataKuliahId),
  }),
);

export const angkatanKurikulum = pgTable(
  'angkatan_kurikulum',
  {
    id: serial('id').primaryKey(),
    programStudiId: integer('program_studi_id')
      .notNull()
      .references(() => programStudi.id, { onDelete: 'cascade' }),
    angkatan: varchar('angkatan', { length: 4 }).notNull(),
    kurikulumId: integer('kurikulum_id')
      .notNull()
      .references(() => kurikulum.id, { onDelete: 'restrict' }),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    unq: unique('angkatan_kurikulum_prodi_angkatan_unique').on(t.programStudiId, t.angkatan),
  }),
);

export const rps = pgTable('rps', {
  id: serial('id').primaryKey(),
  mataKuliahId: integer('mata_kuliah_id')
    .notNull()
    .references(() => mataKuliah.id, { onDelete: 'restrict' }),
  periodeId: varchar('periode_id', { length: 5 })
    .notNull()
    .references(() => periodeAkademik.id, { onDelete: 'restrict' }),
  deskripsi: text('deskripsi'),
  cplProdi: text('cpl_prodi'),
  evaluasiDosen: text('evaluasi_dosen'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const rpsTopik = pgTable('rps_topik', {
  id: serial('id').primaryKey(),
  rpsId: integer('rps_id')
    .notNull()
    .references(() => rps.id, { onDelete: 'cascade' }),
  pertemuanKe: integer('pertemuan_ke').notNull(),
  topik: varchar('topik', { length: 255 }).notNull(),
  subTopik: text('sub_topik'),
  metode: varchar('metode', { length: 100 }),
  cpmkId: integer('cpmk_id').references(() => cpmk.id, { onDelete: 'set null' }),
  subCpmkId: integer('sub_cpmk_id').references(() => subCpmk.id, { onDelete: 'set null' }),
  idPddikti: varchar('id_pddikti', { length: 50 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const rencanaEvaluasi = pgTable('rencana_evaluasi', {
  id: serial('id').primaryKey(),
  mataKuliahId: integer('mata_kuliah_id')
    .notNull()
    .references(() => mataKuliah.id, { onDelete: 'cascade' }),
  namaEvaluasi: varchar('nama_evaluasi', { length: 100 }).notNull(),
  bobotEvaluasi: numeric('bobot_evaluasi', { precision: 5, scale: 2 }).notNull(),
  deskripsi: text('deskripsi'),
  idPddikti: varchar('id_pddikti', { length: 50 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// Relations
export const kurikulumRelations = relations(kurikulum, ({ one, many }) => ({
  programStudi: one(programStudi, {
    fields: [kurikulum.programStudiId],
    references: [programStudi.id],
  }),
  semesterMulaiPeriode: one(periodeAkademik, {
    fields: [kurikulum.semesterMulai],
    references: [periodeAkademik.id],
  }),
  kurikulumMataKuliah: many(kurikulumMataKuliah),
  angkatanKurikulum: many(angkatanKurikulum),
}));

export const kurikulumMataKuliahRelations = relations(kurikulumMataKuliah, ({ one, many }) => ({
  kurikulum: one(kurikulum, {
    fields: [kurikulumMataKuliah.kurikulumId],
    references: [kurikulum.id],
  }),
  mataKuliah: one(mataKuliah, {
    fields: [kurikulumMataKuliah.mataKuliahId],
    references: [mataKuliah.id],
  }),
  cpmk: many(cpmk),
}));

export const angkatanKurikulumRelations = relations(angkatanKurikulum, ({ one }) => ({
  programStudi: one(programStudi, {
    fields: [angkatanKurikulum.programStudiId],
    references: [programStudi.id],
  }),
  kurikulum: one(kurikulum, {
    fields: [angkatanKurikulum.kurikulumId],
    references: [kurikulum.id],
  }),
}));

export const rpsRelations = relations(rps, ({ one, many }) => ({
  mataKuliah: one(mataKuliah, {
    fields: [rps.mataKuliahId],
    references: [mataKuliah.id],
  }),
  periode: one(periodeAkademik, {
    fields: [rps.periodeId],
    references: [periodeAkademik.id],
  }),
  topik: many(rpsTopik),
}));

export const rpsTopikRelations = relations(rpsTopik, ({ one }) => ({
  rps: one(rps, {
    fields: [rpsTopik.rpsId],
    references: [rps.id],
  }),
  cpmk: one(cpmk, {
    fields: [rpsTopik.cpmkId],
    references: [cpmk.id],
  }),
  subCpmk: one(subCpmk, {
    fields: [rpsTopik.subCpmkId],
    references: [subCpmk.id],
  }),
}));

export const rencanaEvaluasiRelations = relations(rencanaEvaluasi, ({ one }) => ({
  mataKuliah: one(mataKuliah, {
    fields: [rencanaEvaluasi.mataKuliahId],
    references: [mataKuliah.id],
  }),
}));

// ────────────────────────────────────────────────────────────────────────────
// OBE (OUTCOME-BASED EDUCATION) MODULE
// ────────────────────────────────────────────────────────────────────────────

export const profilLulusan = pgTable(
  'profil_lulusan',
  {
    id: serial('id').primaryKey(),
    programStudiId: integer('program_studi_id')
      .notNull()
      .references(() => programStudi.id, { onDelete: 'restrict' }),
    kode: varchar('kode', { length: 20 }).notNull(),
    deskripsi: text('deskripsi').notNull(),
    urutan: integer('urutan').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    unq: unique('profil_lulusan_prodi_kode_unique').on(t.programStudiId, t.kode),
    prodiIdx: index('profil_lulusan_program_studi_id_idx').on(t.programStudiId),
  }),
);

export const cpl = pgTable(
  'cpl',
  {
    id: serial('id').primaryKey(),
    programStudiId: integer('program_studi_id')
      .notNull()
      .references(() => programStudi.id, { onDelete: 'restrict' }),
    kode: varchar('kode', { length: 20 }).notNull(),
    deskripsi: text('deskripsi').notNull(),
    urutan: integer('urutan').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    unq: unique('cpl_prodi_kode_unique').on(t.programStudiId, t.kode),
    prodiIdx: index('cpl_program_studi_id_idx').on(t.programStudiId),
  }),
);

export const cplProfilLulusan = pgTable(
  'cpl_profil_lulusan',
  {
    id: serial('id').primaryKey(),
    cplId: integer('cpl_id')
      .notNull()
      .references(() => cpl.id, { onDelete: 'cascade' }),
    profilLulusanId: integer('profil_lulusan_id')
      .notNull()
      .references(() => profilLulusan.id, { onDelete: 'cascade' }),
    bobot: numeric('bobot', { precision: 5, scale: 2 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    unq: unique('cpl_profil_lulusan_unique').on(t.cplId, t.profilLulusanId),
    cplIdx: index('cpl_profil_lulusan_cpl_id_idx').on(t.cplId),
    plIdx: index('cpl_profil_lulusan_profil_lulusan_id_idx').on(t.profilLulusanId),
  }),
);

export const subCpmk = pgTable('sub_cpmk', {
  id: serial('id').primaryKey(),
  cpmkId: integer('cpmk_id')
    .notNull()
    .references(() => cpmk.id, { onDelete: 'cascade' }),
  kode: varchar('kode', { length: 20 }).notNull(),
  deskripsi: text('deskripsi').notNull(),
  urutan: integer('urutan').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const cpmkCpl = pgTable(
  'cpmk_cpl',
  {
    id: serial('id').primaryKey(),
    cpmkId: integer('cpmk_id')
      .notNull()
      .references(() => cpmk.id, { onDelete: 'cascade' }),
    cplId: integer('cpl_id')
      .notNull()
      .references(() => cpl.id, { onDelete: 'cascade' }),
    bobot: numeric('bobot', { precision: 5, scale: 2 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    unq: unique('cpmk_cpl_unique').on(t.cpmkId, t.cplId),
    cpmkIdx: index('cpmk_cpl_cpmk_id_idx').on(t.cpmkId),
    cplIdx: index('cpmk_cpl_cpl_id_idx').on(t.cplId),
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// OBE RELATIONS
// ────────────────────────────────────────────────────────────────────────────

export const profilLulusanRelations = relations(profilLulusan, ({ one, many }) => ({
  programStudi: one(programStudi, {
    fields: [profilLulusan.programStudiId],
    references: [programStudi.id],
  }),
  cplMappings: many(cplProfilLulusan),
}));

export const cplRelations = relations(cpl, ({ one, many }) => ({
  programStudi: one(programStudi, {
    fields: [cpl.programStudiId],
    references: [programStudi.id],
  }),
  profilLulusanMappings: many(cplProfilLulusan),
  cpmkMappings: many(cpmkCpl),
}));

export const cplProfilLulusanRelations = relations(cplProfilLulusan, ({ one }) => ({
  cpl: one(cpl, {
    fields: [cplProfilLulusan.cplId],
    references: [cpl.id],
  }),
  profilLulusan: one(profilLulusan, {
    fields: [cplProfilLulusan.profilLulusanId],
    references: [profilLulusan.id],
  }),
}));

export const subCpmkRelations = relations(subCpmk, ({ one }) => ({
  cpmk: one(cpmk, {
    fields: [subCpmk.cpmkId],
    references: [cpmk.id],
  }),
}));

export const cpmkCplRelations = relations(cpmkCpl, ({ one }) => ({
  cpmk: one(cpmk, {
    fields: [cpmkCpl.cpmkId],
    references: [cpmk.id],
  }),
  cpl: one(cpl, {
    fields: [cpmkCpl.cplId],
    references: [cpl.id],
  }),
}));

// ────────────────────────────────────────────────────────────────────────────
// OBE PHASE 2: VISI MISI, BAHAN KAJIAN, BK↔CPL, MK↔BK, EVALUASI↔SUBCPMK
// ────────────────────────────────────────────────────────────────────────────

export const visiMisiProdi = pgTable(
  'visi_misi_prodi',
  {
    id: serial('id').primaryKey(),
    programStudiId: integer('program_studi_id')
      .notNull()
      .references(() => programStudi.id, { onDelete: 'restrict' }),
    visi: text('visi').notNull(),
    misi: text('misi').notNull(),
    tujuan: text('tujuan'),
    sasaran: text('sasaran'),
    tahunBerlaku: varchar('tahun_berlaku', { length: 10 }),
    isAktif: boolean('is_aktif').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    prodiIdx: index('visi_misi_prodi_program_studi_id_idx').on(t.programStudiId),
  }),
);

export const bahanKajian = pgTable(
  'bahan_kajian',
  {
    id: serial('id').primaryKey(),
    programStudiId: integer('program_studi_id')
      .notNull()
      .references(() => programStudi.id, { onDelete: 'restrict' }),
    kode: varchar('kode', { length: 20 }).notNull(),
    nama: varchar('nama', { length: 255 }).notNull(),
    deskripsi: text('deskripsi'),
    urutan: integer('urutan').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    unq: unique('bahan_kajian_prodi_kode_unique').on(t.programStudiId, t.kode),
    prodiIdx: index('bahan_kajian_program_studi_id_idx').on(t.programStudiId),
  }),
);

export const bahanKajianCpl = pgTable(
  'bahan_kajian_cpl',
  {
    id: serial('id').primaryKey(),
    bahanKajianId: integer('bahan_kajian_id')
      .notNull()
      .references(() => bahanKajian.id, { onDelete: 'cascade' }),
    cplId: integer('cpl_id')
      .notNull()
      .references(() => cpl.id, { onDelete: 'cascade' }),
    bobot: numeric('bobot', { precision: 5, scale: 2 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    unq: unique('bahan_kajian_cpl_unique').on(t.bahanKajianId, t.cplId),
    bkIdx: index('bahan_kajian_cpl_bahan_kajian_id_idx').on(t.bahanKajianId),
    cplIdx: index('bahan_kajian_cpl_cpl_id_idx').on(t.cplId),
  }),
);

export const mataKuliahBahanKajian = pgTable(
  'mata_kuliah_bahan_kajian',
  {
    id: serial('id').primaryKey(),
    mataKuliahId: integer('mata_kuliah_id')
      .notNull()
      .references(() => mataKuliah.id, { onDelete: 'cascade' }),
    bahanKajianId: integer('bahan_kajian_id')
      .notNull()
      .references(() => bahanKajian.id, { onDelete: 'cascade' }),
    bobotKontribusi: numeric('bobot_kontribusi', { precision: 5, scale: 2 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    unq: unique('mata_kuliah_bahan_kajian_unique').on(t.mataKuliahId, t.bahanKajianId),
    mkIdx: index('mata_kuliah_bahan_kajian_mata_kuliah_id_idx').on(t.mataKuliahId),
    bkIdx: index('mata_kuliah_bahan_kajian_bahan_kajian_id_idx').on(t.bahanKajianId),
  }),
);

export const rencanaEvaluasiSubCpmk = pgTable(
  'rencana_evaluasi_sub_cpmk',
  {
    id: serial('id').primaryKey(),
    rencanaEvaluasiId: integer('rencana_evaluasi_id')
      .notNull()
      .references(() => rencanaEvaluasi.id, { onDelete: 'cascade' }),
    subCpmkId: integer('sub_cpmk_id')
      .notNull()
      .references(() => subCpmk.id, { onDelete: 'cascade' }),
    bobot: numeric('bobot', { precision: 5, scale: 2 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    unq: unique('rencana_evaluasi_sub_cpmk_unique').on(t.rencanaEvaluasiId, t.subCpmkId),
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// OBE PHASE 2 RELATIONS
// ────────────────────────────────────────────────────────────────────────────

export const visiMisiProdiRelations = relations(visiMisiProdi, ({ one }) => ({
  programStudi: one(programStudi, {
    fields: [visiMisiProdi.programStudiId],
    references: [programStudi.id],
  }),
}));

export const bahanKajianRelations = relations(bahanKajian, ({ one, many }) => ({
  programStudi: one(programStudi, {
    fields: [bahanKajian.programStudiId],
    references: [programStudi.id],
  }),
  cplMappings: many(bahanKajianCpl),
  mataKuliahMappings: many(mataKuliahBahanKajian),
}));

export const bahanKajianCplRelations = relations(bahanKajianCpl, ({ one }) => ({
  bahanKajian: one(bahanKajian, {
    fields: [bahanKajianCpl.bahanKajianId],
    references: [bahanKajian.id],
  }),
  cpl: one(cpl, {
    fields: [bahanKajianCpl.cplId],
    references: [cpl.id],
  }),
}));

export const mataKuliahBahanKajianRelations = relations(mataKuliahBahanKajian, ({ one }) => ({
  mataKuliah: one(mataKuliah, {
    fields: [mataKuliahBahanKajian.mataKuliahId],
    references: [mataKuliah.id],
  }),
  bahanKajian: one(bahanKajian, {
    fields: [mataKuliahBahanKajian.bahanKajianId],
    references: [bahanKajian.id],
  }),
}));

export const rencanaEvaluasiSubCpmkRelations = relations(rencanaEvaluasiSubCpmk, ({ one }) => ({
  rencanaEvaluasi: one(rencanaEvaluasi, {
    fields: [rencanaEvaluasiSubCpmk.rencanaEvaluasiId],
    references: [rencanaEvaluasi.id],
  }),
  subCpmk: one(subCpmk, {
    fields: [rencanaEvaluasiSubCpmk.subCpmkId],
    references: [subCpmk.id],
  }),
}));

// NEW TABLES FOR FINANCIAL AND GRADING CONFIGURATIONS

export const transaksiPembayaran = pgTable('transaksi_pembayaran', {
  id: serial('id').primaryKey(),
  tagihanId: integer('tagihan_id')
    .notNull()
    .references(() => tagihan.id, { onDelete: 'cascade' }),
  nominalBayar: integer('nominal_bayar').notNull(),
  tanggalTransaksi: timestamp('tanggal_transaksi').defaultNow().notNull(),
  petugasId: integer('petugas_id').references(() => users.id, { onDelete: 'set null' }),
  isVoid: boolean('is_void').default(false).notNull(),
  catatanKoreksi: text('catatan_koreksi'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const transaksiPembayaranRelations = relations(transaksiPembayaran, ({ one }) => ({
  tagihan: one(tagihan, {
    fields: [transaksiPembayaran.tagihanId],
    references: [tagihan.id],
  }),
  petugas: one(users, {
    fields: [transaksiPembayaran.petugasId],
    references: [users.id],
  }),
}));

export const skemaTarif = pgTable(
  'skema_tarif',
  {
    id: serial('id').primaryKey(),
    angkatan: varchar('angkatan', { length: 4 }).notNull(), // misal "2024"
    programStudiId: integer('program_studi_id')
      .notNull()
      .references(() => programStudi.id, { onDelete: 'cascade' }),
    nominal: integer('nominal').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    unq: unique('skema_tarif_angkatan_prodi_unique').on(t.angkatan, t.programStudiId),
  }),
);

export const skemaTarifRelations = relations(skemaTarif, ({ one }) => ({
  programStudi: one(programStudi, {
    fields: [skemaTarif.programStudiId],
    references: [programStudi.id],
  }),
}));

export const konversiNilai = pgTable('konversi_nilai', {
  id: serial('id').primaryKey(),
  programStudiId: integer('program_studi_id').references(() => programStudi.id, { onDelete: 'cascade' }), // Nullable = Berlaku Global
  nilaiHuruf: varchar('nilai_huruf', { length: 5 }).notNull(),
  bobotIndeks: numeric('bobot_indeks', { precision: 3, scale: 2 }).notNull(),
  nilaiMin: numeric('nilai_min', { precision: 5, scale: 2 }).notNull(),
  nilaiMax: numeric('nilai_max', { precision: 5, scale: 2 }).notNull(),
  predikat: varchar('predikat', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const konversiNilaiRelations = relations(konversiNilai, ({ one }) => ({
  programStudi: one(programStudi, {
    fields: [konversiNilai.programStudiId],
    references: [programStudi.id],
  }),
}));

export const skalaPredikatKelulusan = pgTable('skala_predikat_kelulusan', {
  id: serial('id').primaryKey(),
  ipkMin: numeric('ipk_min', { precision: 3, scale: 2 }).notNull(),
  ipkMax: numeric('ipk_max', { precision: 3, scale: 2 }).notNull(),
  predikat: varchar('predikat', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const pengajuanCuti = pgTable('pengajuan_cuti', {
  id: serial('id').primaryKey(),
  mahasiswaId: integer('mahasiswa_id')
    .notNull()
    .references(() => mahasiswa.id, { onDelete: 'cascade' }),
  periodeId: varchar('periode_id', { length: 5 })
    .notNull()
    .references(() => periodeAkademik.id),
  alasan: text('alasan').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, disetujui_pa, disetujui_keuangan, disetujui_prodi, ditolak, kembali_aktif
  semesterMulaiCuti: varchar('semester_mulai_cuti', { length: 5 }),
  semesterBerakhirCuti: varchar('semester_berakhir_cuti', { length: 5 }),
  catatan: text('catatan'),
  noSuratIzin: varchar('no_surat_izin_cuti', { length: 100 }),
  tanggalSuratIzin: date('tgl_surat_izin_cuti'),
  idPddikti: varchar('id_pddikti', { length: 50 }).unique(),
  isSynced: boolean('is_synced').default(false).notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const pengajuanCutiRelations = relations(pengajuanCuti, ({ one }) => ({
  mahasiswa: one(mahasiswa, {
    fields: [pengajuanCuti.mahasiswaId],
    references: [mahasiswa.id],
  }),
  periodeAkademik: one(periodeAkademik, {
    fields: [pengajuanCuti.periodeId],
    references: [periodeAkademik.id],
  }),
}));

export const mahasiswaKeluar = pgTable('mahasiswa_keluar', {
  id: serial('id').primaryKey(),
  mahasiswaId: integer('mahasiswa_id')
    .notNull()
    .references(() => mahasiswa.id, { onDelete: 'cascade' }),
  periodeId: varchar('periode_id', { length: 5 })
    .notNull()
    .references(() => periodeAkademik.id),
  statusBaru: varchar('status_baru', { length: 50 }).notNull(), // keluar, drop_out, pindah, wafat, non_aktif
  tanggalKeluar: date('tanggal_keluar').notNull(),
  alasanKeluar: text('alasan_keluar'),
  noSk: varchar('no_sk_yudisium', { length: 100 }),
  tanggalSk: date('tanggal_sk_yudisium'),
  ipk: numeric('ipk', { precision: 3, scale: 2 }),
  nomorIjazah: varchar('nomor_ijazah', { length: 100 }),
  idPddikti: varchar('id_pddikti', { length: 50 }).unique(),
  isSynced: boolean('is_synced').default(false).notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const mahasiswaKeluarRelations = relations(mahasiswaKeluar, ({ one }) => ({
  mahasiswa: one(mahasiswa, {
    fields: [mahasiswaKeluar.mahasiswaId],
    references: [mahasiswa.id],
  }),
  periodeAkademik: one(periodeAkademik, {
    fields: [mahasiswaKeluar.periodeId],
    references: [periodeAkademik.id],
  }),
}));

// ────────────────────────────────────────────────────────────────────────────
// ADMISI (PENERIMAAN MAHASISWA BARU) MODULE
// ────────────────────────────────────────────────────────────────────────────

export const admissionSessions = pgTable('admission_sessions', {
  id: serial('id').primaryKey(),
  kode: varchar('kode', { length: 20 }).notNull().unique(),
  nama: varchar('nama', { length: 255 }).notNull(),
  deskripsi: text('deskripsi'),
  tanggalMulai: date('tanggal_mulai').notNull(),
  tanggalTutup: date('tanggal_tutup').notNull(),
  tanggalVerif: date('tanggal_verif'),
  tanggalUjian: date('tanggal_ujian'),
  tanggalPengumuman: date('tanggal_pengumuman'),
  kuota: integer('kuota'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const admissionSessionProdis = pgTable(
  'admission_session_prodis',
  {
    id: serial('id').primaryKey(),
    sessionId: integer('session_id')
      .notNull()
      .references(() => admissionSessions.id, { onDelete: 'cascade' }),
    prodiId: integer('prodi_id')
      .notNull()
      .references(() => programStudi.id, { onDelete: 'restrict' }),
    kuota: integer('kuota'),
    passingGrade: numeric('passing_grade', { precision: 5, scale: 2 }),
    biayaDaftar: integer('biaya_daftar'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    unq: unique('adm_session_prodi_unique').on(t.sessionId, t.prodiId),
  }),
);

export const documentRequirements = pgTable('document_requirements', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .notNull()
    .references(() => admissionSessions.id, { onDelete: 'cascade' }),
  prodiId: integer('prodi_id').references(() => programStudi.id, { onDelete: 'set null' }),
  namaDokumen: varchar('nama_dokumen', { length: 255 }).notNull(),
  deskripsi: text('deskripsi'),
  isWajib: boolean('is_wajib').default(true).notNull(),
  formatFile: varchar('format_file', { length: 50 }),
  maxSizeKb: integer('max_size_kb').default(2048).notNull(),
  urutan: integer('urutan').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const applications = pgTable('applications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  sessionId: integer('session_id')
    .notNull()
    .references(() => admissionSessions.id, { onDelete: 'restrict' }),
  noPendaftar: varchar('no_pendaftar', { length: 30 }).unique(),
  prodiPilihan1: integer('prodi_pilihan1')
    .notNull()
    .references(() => programStudi.id, { onDelete: 'restrict' }),
  prodiPilihan2: integer('prodi_pilihan2').references(() => programStudi.id, { onDelete: 'restrict' }),
  status: applicationStatusEnum('status').notNull().default('draft'),
  nik: varchar('nik', { length: 16 }),
  namaLengkap: varchar('nama_lengkap', { length: 255 }),
  tempatLahir: varchar('tempat_lahir', { length: 100 }),
  tanggalLahir: date('tanggal_lahir'),
  jenisKelamin: jenisKelaminEnum('jenis_kelamin'),
  idAgama: integer('id_agama'),
  kewarganegaraan: varchar('kewarganegaraan', { length: 5 }).default('ID'),
  jalan: text('jalan'),
  rt: varchar('rt', { length: 5 }),
  rw: varchar('rw', { length: 5 }),
  kodePos: varchar('kode_pos', { length: 10 }),
  telepon: varchar('telepon', { length: 20 }),
  namaIbuKandung: varchar('nama_ibu_kandung', { length: 255 }),
  asalSekolah: varchar('asal_sekolah', { length: 255 }),
  jurusanSekolah: varchar('jurusan_sekolah', { length: 255 }),
  tahunLulus: varchar('tahun_lulus', { length: 4 }),
  isReRegistered: boolean('is_re_registered').default(false).notNull(),
  reRegisteredAt: timestamp('re_registered_at'),
  buktiBayarPath: text('bukti_bayar_path'),
  nimDiterbitkan: varchar('nim_diterbitkan', { length: 50 }),
  ukuranJas: varchar('ukuran_jas', { length: 10 }),
  finalScore: numeric('final_score', { precision: 5, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const applicantDocuments = pgTable('applicant_documents', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  requirementId: integer('requirement_id')
    .notNull()
    .references(() => documentRequirements.id, { onDelete: 'restrict' }),
  filePath: text('file_path'),
  fileLink: text('file_link'),
  uploadMethod: varchar('upload_method', { length: 20 }).notNull().default('upload'),
  originalName: varchar('original_name', { length: 255 }),
  fileSizeKb: integer('file_size_kb'),
  mimeType: varchar('mime_type', { length: 100 }),
  isVerified: boolean('is_verified').default(false).notNull(),
  verifiedBy: integer('verified_by').references(() => users.id, { onDelete: 'set null' }),
  verifiedAt: timestamp('verified_at'),
  rejectionNote: text('rejection_note'),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const selectionComponents = pgTable('selection_components', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .notNull()
    .references(() => admissionSessions.id, { onDelete: 'cascade' }),
  prodiId: integer('prodi_id').references(() => programStudi.id, { onDelete: 'set null' }),
  namaKomponen: varchar('nama_komponen', { length: 255 }).notNull(),
  bobot: numeric('bobot', { precision: 5, scale: 2 }).notNull(),
  tipePenilai: varchar('tipe_penilai', { length: 20 }).notNull().default('admin'),
  urutan: integer('urutan').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const selectionScores = pgTable(
  'selection_scores',
  {
    id: serial('id').primaryKey(),
    applicationId: integer('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    componentId: integer('component_id')
      .notNull()
      .references(() => selectionComponents.id, { onDelete: 'restrict' }),
    score: numeric('score', { precision: 5, scale: 2 }).notNull(),
    scoredBy: integer('scored_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    unq: unique('selection_scores_app_component_unique').on(t.applicationId, t.componentId),
  }),
);

export const examSchedules = pgTable('exam_schedules', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  sessionId: integer('session_id')
    .notNull()
    .references(() => admissionSessions.id, { onDelete: 'cascade' }),
  reviewerId: integer('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
  tipeUjian: varchar('tipe_ujian', { length: 50 }).notNull(),
  tanggal: date('tanggal').notNull(),
  waktuMulai: varchar('waktu_mulai', { length: 10 }).notNull(),
  waktuSelesai: varchar('waktu_selesai', { length: 10 }),
  lokasiType: varchar('lokasi_type', { length: 20 }).notNull().default('kampus'),
  lokasiDetail: text('lokasi_detail'),
  catatan: text('catatan'),
  isCompleted: boolean('is_completed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const applicationLogs = pgTable('application_logs', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  statusFrom: applicationStatusEnum('status_from'),
  statusTo: applicationStatusEnum('status_to').notNull(),
  message: text('message'),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reRegistrationPayments = pgTable('re_registration_payments', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  nominal: integer('nominal').notNull(),
  buktiBayar: text('bukti_bayar').notNull(),
  bankAsal: varchar('bank_asal', { length: 100 }),
  namaPengirim: varchar('nama_pengirim', { length: 255 }),
  isVerified: boolean('is_verified').default(false).notNull(),
  verifiedBy: integer('verified_by').references(() => users.id, { onDelete: 'set null' }),
  verifiedAt: timestamp('verified_at'),
  rejectionNote: text('rejection_note'),
  paidAt: timestamp('paid_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// ────────────────────────────────────────────────────────────────────────────
// ADMISI RELATIONS
// ────────────────────────────────────────────────────────────────────────────

export const admissionSessionsRelations = relations(admissionSessions, ({ many }) => ({
  sessionProdis: many(admissionSessionProdis),
  documentRequirements: many(documentRequirements),
  applications: many(applications),
  examSchedules: many(examSchedules),
  selectionComponents: many(selectionComponents),
}));

export const admissionSessionProdisRelations = relations(admissionSessionProdis, ({ one }) => ({
  session: one(admissionSessions, {
    fields: [admissionSessionProdis.sessionId],
    references: [admissionSessions.id],
  }),
  prodi: one(programStudi, {
    fields: [admissionSessionProdis.prodiId],
    references: [programStudi.id],
  }),
}));

export const documentRequirementsRelations = relations(documentRequirements, ({ one, many }) => ({
  session: one(admissionSessions, {
    fields: [documentRequirements.sessionId],
    references: [admissionSessions.id],
  }),
  prodi: one(programStudi, {
    fields: [documentRequirements.prodiId],
    references: [programStudi.id],
  }),
  applicantDocuments: many(applicantDocuments),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  user: one(users, {
    fields: [applications.userId],
    references: [users.id],
  }),
  session: one(admissionSessions, {
    fields: [applications.sessionId],
    references: [admissionSessions.id],
  }),
  prodi1: one(programStudi, {
    fields: [applications.prodiPilihan1],
    references: [programStudi.id],
  }),
  prodi2: one(programStudi, {
    fields: [applications.prodiPilihan2],
    references: [programStudi.id],
  }),
  documents: many(applicantDocuments),
  scores: many(selectionScores),
  examSchedules: many(examSchedules),
  logs: many(applicationLogs),
  payments: many(reRegistrationPayments),
}));

export const applicantDocumentsRelations = relations(applicantDocuments, ({ one }) => ({
  application: one(applications, {
    fields: [applicantDocuments.applicationId],
    references: [applications.id],
  }),
  requirement: one(documentRequirements, {
    fields: [applicantDocuments.requirementId],
    references: [documentRequirements.id],
  }),
  verifiedByUser: one(users, {
    fields: [applicantDocuments.verifiedBy],
    references: [users.id],
  }),
}));

export const selectionComponentsRelations = relations(selectionComponents, ({ one, many }) => ({
  session: one(admissionSessions, {
    fields: [selectionComponents.sessionId],
    references: [admissionSessions.id],
  }),
  prodi: one(programStudi, {
    fields: [selectionComponents.prodiId],
    references: [programStudi.id],
  }),
  scores: many(selectionScores),
}));

export const selectionScoresRelations = relations(selectionScores, ({ one }) => ({
  application: one(applications, {
    fields: [selectionScores.applicationId],
    references: [applications.id],
  }),
  component: one(selectionComponents, {
    fields: [selectionScores.componentId],
    references: [selectionComponents.id],
  }),
  scoredByUser: one(users, {
    fields: [selectionScores.scoredBy],
    references: [users.id],
  }),
}));

export const examSchedulesRelations = relations(examSchedules, ({ one }) => ({
  application: one(applications, {
    fields: [examSchedules.applicationId],
    references: [applications.id],
  }),
  session: one(admissionSessions, {
    fields: [examSchedules.sessionId],
    references: [admissionSessions.id],
  }),
  reviewer: one(users, {
    fields: [examSchedules.reviewerId],
    references: [users.id],
  }),
}));

export const applicationLogsRelations = relations(applicationLogs, ({ one }) => ({
  application: one(applications, {
    fields: [applicationLogs.applicationId],
    references: [applications.id],
  }),
  createdByUser: one(users, {
    fields: [applicationLogs.createdBy],
    references: [users.id],
  }),
}));

export const reRegistrationPaymentsRelations = relations(reRegistrationPayments, ({ one }) => ({
  application: one(applications, {
    fields: [reRegistrationPayments.applicationId],
    references: [applications.id],
  }),
  verifiedByUser: one(users, {
    fields: [reRegistrationPayments.verifiedBy],
    references: [users.id],
  }),
}));

// ────────────────────────────────────────────────────────────────────────────
// ANNOUNCEMENTS (Pengumuman untuk dashboard calon mahasiswa)
// ────────────────────────────────────────────────────────────────────────────

export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  judul: varchar('judul', { length: 255 }).notNull(),
  isi: text('isi').notNull(),
  sessionId: integer('session_id').references(() => admissionSessions.id, { onDelete: 'set null' }),
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  isPinned: boolean('is_pinned').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  filePath: text('file_path'),
  fileName: varchar('file_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// ────────────────────────────────────────────────────────────────────────────
// VA BANKS & PAYMENT VIRTUAL ACCOUNTS
// ────────────────────────────────────────────────────────────────────────────

export const vaBanks = pgTable('va_banks', {
  id: serial('id').primaryKey(),
  kode: varchar('kode', { length: 20 }).notNull().unique(),
  nama: varchar('nama', { length: 100 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  isMidtrans: boolean('is_midtrans').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const paymentVirtualAccounts = pgTable('payment_virtual_accounts', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  vaBankId: integer('va_bank_id')
    .notNull()
    .references(() => vaBanks.id, { onDelete: 'restrict' }),
  vaNumber: varchar('va_number', { length: 50 }).notNull().unique(),
  nominal: integer('nominal').notNull(),
  isPaid: boolean('is_paid').default(false).notNull(),
  paidAt: timestamp('paid_at'),
  verifiedBy: integer('verified_by').references(() => users.id, { onDelete: 'set null' }),
  expiredAt: timestamp('expired_at'),
  midtransTransactionId: varchar('midtrans_transaction_id', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const vaBanksRelations = relations(vaBanks, ({ many }) => ({
  payments: many(paymentVirtualAccounts),
}));

export const paymentVirtualAccountsRelations = relations(paymentVirtualAccounts, ({ one }) => ({
  application: one(applications, {
    fields: [paymentVirtualAccounts.applicationId],
    references: [applications.id],
  }),
  bank: one(vaBanks, {
    fields: [paymentVirtualAccounts.vaBankId],
    references: [vaBanks.id],
  }),
  verifier: one(users, {
    fields: [paymentVirtualAccounts.verifiedBy],
    references: [users.id],
  }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  session: one(admissionSessions, {
    fields: [announcements.sessionId],
    references: [admissionSessions.id],
  }),
  author: one(users, {
    fields: [announcements.createdBy],
    references: [users.id],
  }),
}));

// ────────────────────────────────────────────────────────────────────────────
// OBE PHASE 3: ASESMEN KURIKULUM (CPL-MK, CPMK ACHIEVEMENT, CPL ACHIEVEMENT, PPEPP)
// ────────────────────────────────────────────────────────────────────────────

export const cplMataKuliah = pgTable(
  'cpl_mata_kuliah',
  {
    id: serial('id').primaryKey(),
    cplId: integer('cpl_id')
      .notNull()
      .references(() => cpl.id, { onDelete: 'cascade' }),
    mataKuliahId: integer('mata_kuliah_id')
      .notNull()
      .references(() => mataKuliah.id, { onDelete: 'cascade' }),
    bobot: numeric('bobot', { precision: 5, scale: 2 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    unq: unique('cpl_mata_kuliah_unique').on(t.cplId, t.mataKuliahId),
    cplIdx: index('cpl_mata_kuliah_cpl_id_idx').on(t.cplId),
    mkIdx: index('cpl_mata_kuliah_mata_kuliah_id_idx').on(t.mataKuliahId),
  }),
);

export const capaianCpmk = pgTable(
  'capaian_cpmk',
  {
    id: serial('id').primaryKey(),
    mahasiswaId: integer('mahasiswa_id')
      .notNull()
      .references(() => mahasiswa.id, { onDelete: 'cascade' }),
    cpmkId: integer('cpmk_id')
      .notNull()
      .references(() => cpmk.id, { onDelete: 'cascade' }),
    kelasKuliahId: integer('kelas_kuliah_id')
      .notNull()
      .references(() => kelasKuliah.id, { onDelete: 'cascade' }),
    kurikulumId: integer('kurikulum_id').references(() => kurikulum.id, { onDelete: 'set null' }),
    nilai: numeric('nilai', { precision: 5, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    unq: unique('capaian_cpmk_unique').on(t.mahasiswaId, t.cpmkId, t.kelasKuliahId),
    mhsIdx: index('capaian_cpmk_mahasiswa_id_idx').on(t.mahasiswaId),
    cpmkIdx: index('capaian_cpmk_cpmk_id_idx').on(t.cpmkId),
    kelasIdx: index('capaian_cpmk_kelas_kuliah_id_idx').on(t.kelasKuliahId),
  }),
);

export const capaianCpl = pgTable(
  'capaian_cpl',
  {
    id: serial('id').primaryKey(),
    mahasiswaId: integer('mahasiswa_id')
      .notNull()
      .references(() => mahasiswa.id, { onDelete: 'cascade' }),
    cplId: integer('cpl_id')
      .notNull()
      .references(() => cpl.id, { onDelete: 'cascade' }),
    kurikulumId: integer('kurikulum_id').references(() => kurikulum.id, { onDelete: 'set null' }),
    periodeId: varchar('periode_id', { length: 5 }).references(() => periodeAkademik.id, { onDelete: 'set null' }),
    nilai: numeric('nilai', { precision: 5, scale: 2 }).notNull(),
    predikat: varchar('predikat', { length: 20 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    mhsIdx: index('capaian_cpl_mahasiswa_id_idx').on(t.mahasiswaId),
    cplIdx: index('capaian_cpl_cpl_id_idx').on(t.cplId),
    kurIdx: index('capaian_cpl_kurikulum_id_idx').on(t.kurikulumId),
  }),
);

export const evaluasiKurikulum = pgTable('evaluasi_kurikulum', {
  id: serial('id').primaryKey(),
  kurikulumId: integer('kurikulum_id')
    .notNull()
    .references(() => kurikulum.id, { onDelete: 'cascade' }),
  periodeId: varchar('periode_id', { length: 5 }).references(() => periodeAkademik.id, { onDelete: 'set null' }),
  sumber: varchar('sumber', { length: 50 }).notNull().default('kaprodi'),
  aspek: varchar('aspek', { length: 100 }).notNull(),
  temuan: text('temuan').notNull(),
  rekomendasi: text('rekomendasi'),
  tindakLanjut: text('tindak_lanjut'),
  status: varchar('status', { length: 20 }).default('open'),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// ────────────────────────────────────────────────────────────────────────────
// OBE PHASE 3 RELATIONS
// ────────────────────────────────────────────────────────────────────────────

export const cplMataKuliahRelations = relations(cplMataKuliah, ({ one }) => ({
  cpl: one(cpl, {
    fields: [cplMataKuliah.cplId],
    references: [cpl.id],
  }),
  mataKuliah: one(mataKuliah, {
    fields: [cplMataKuliah.mataKuliahId],
    references: [mataKuliah.id],
  }),
}));

export const capaianCpmkRelations = relations(capaianCpmk, ({ one }) => ({
  mahasiswa: one(mahasiswa, {
    fields: [capaianCpmk.mahasiswaId],
    references: [mahasiswa.id],
  }),
  cpmk: one(cpmk, {
    fields: [capaianCpmk.cpmkId],
    references: [cpmk.id],
  }),
  kelasKuliah: one(kelasKuliah, {
    fields: [capaianCpmk.kelasKuliahId],
    references: [kelasKuliah.id],
  }),
  kurikulum: one(kurikulum, {
    fields: [capaianCpmk.kurikulumId],
    references: [kurikulum.id],
  }),
}));

export const capaianCplRelations = relations(capaianCpl, ({ one }) => ({
  mahasiswa: one(mahasiswa, {
    fields: [capaianCpl.mahasiswaId],
    references: [mahasiswa.id],
  }),
  cpl: one(cpl, {
    fields: [capaianCpl.cplId],
    references: [cpl.id],
  }),
  kurikulum: one(kurikulum, {
    fields: [capaianCpl.kurikulumId],
    references: [kurikulum.id],
  }),
  periode: one(periodeAkademik, {
    fields: [capaianCpl.periodeId],
    references: [periodeAkademik.id],
  }),
}));

export const evaluasiKurikulumRelations = relations(evaluasiKurikulum, ({ one }) => ({
  kurikulum: one(kurikulum, {
    fields: [evaluasiKurikulum.kurikulumId],
    references: [kurikulum.id],
  }),
  periode: one(periodeAkademik, {
    fields: [evaluasiKurikulum.periodeId],
    references: [periodeAkademik.id],
  }),
  createdByUser: one(users, {
    fields: [evaluasiKurikulum.createdBy],
    references: [users.id],
  }),
}));

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    userRole: varchar('user_role', { length: 50 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    actionType: varchar('action_type', { length: 20 }).notNull(),
    module: varchar('module', { length: 50 }).notNull(),
    entityId: varchar('entity_id', { length: 100 }),
    description: text('description').notNull(),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    timestampIdx: index('idx_audit_logs_timestamp').on(table.timestamp),
    userModuleIdx: index('idx_audit_logs_user_module').on(table.userId, table.module),
    actionModuleIdx: index('idx_audit_logs_action_module').on(table.actionType, table.module),
  }),
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));
export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_notifications_user_id').on(table.userId),
  }),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// --- MULTI TOPIK BAP ---
export const bapTopik = pgTable('bap_topik', {
  id: serial('id').primaryKey(),
  bapId: integer('bap_id')
    .notNull()
    .references(() => bap.id, { onDelete: 'cascade' }),
  topikId: integer('topik_id').references(() => rpsTopik.id, { onDelete: 'cascade' }),
  cpmkId: integer('cpmk_id').references(() => cpmk.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bapTopikRelations = relations(bapTopik, ({ one }) => ({
  bap: one(bap, {
    fields: [bapTopik.bapId],
    references: [bap.id],
  }),
  topik: one(rpsTopik, {
    fields: [bapTopik.topikId],
    references: [rpsTopik.id],
  }),
  cpmk: one(cpmk, {
    fields: [bapTopik.cpmkId],
    references: [cpmk.id],
  }),
}));

// --- KELAS PRAKTIKUM & ROMBEL ---
export const rombelPraktikum = pgTable('rombel_praktikum', {
  id: serial('id').primaryKey(),
  kelasKuliahId: integer('kelas_kuliah_id')
    .notNull()
    .references(() => kelasKuliah.id, { onDelete: 'cascade' }),
  namaGroup: varchar('nama_group', { length: 255 }).notNull(),
  instrukturId: integer('instrukturId').references(() => dosen.id, { onDelete: 'set null' }),
  keterangan: text('keterangan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const rombelPraktikumMahasiswa = pgTable('rombel_praktikum_mahasiswa', {
  id: serial('id').primaryKey(),
  rombelPraktikumId: integer('rombel_praktikum_id')
    .notNull()
    .references(() => rombelPraktikum.id, { onDelete: 'cascade' }),
  mahasiswaId: integer('mahasiswa_id')
    .notNull()
    .references(() => mahasiswa.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bapPraktikum = pgTable('bap_praktikum', {
  id: serial('id').primaryKey(),
  rombelPraktikumId: integer('rombel_praktikum_id')
    .notNull()
    .references(() => rombelPraktikum.id, { onDelete: 'cascade' }),
  tanggal: date('tanggal').notNull(),
  sesiKe: integer('sesi_ke').default(1).notNull(),
  materi: text('materi').notNull(),
  catatan: text('catatan'),
  durasiMenit: integer('durasi_menit').default(100).notNull(),
  instrukturId: integer('instruktur_id').references(() => dosen.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const presensiPraktikum = pgTable('presensi_praktikum', {
  id: serial('id').primaryKey(),
  bapPraktikumId: integer('bap_praktikum_id')
    .notNull()
    .references(() => bapPraktikum.id, { onDelete: 'cascade' }),
  mahasiswaId: integer('mahasiswa_id')
    .notNull()
    .references(() => mahasiswa.id, { onDelete: 'cascade' }),
  status: presensiStatusEnum('status').notNull(),
  durasiMangkir: integer('durasi_mangkir').default(0).notNull(),
  keterangan: text('keterangan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const rombelPraktikumRelations = relations(rombelPraktikum, ({ one, many }) => ({
  kelasKuliah: one(kelasKuliah, {
    fields: [rombelPraktikum.kelasKuliahId],
    references: [kelasKuliah.id],
  }),
  instruktur: one(dosen, {
    fields: [rombelPraktikum.instrukturId],
    references: [dosen.id],
  }),
  mahasiswaList: many(rombelPraktikumMahasiswa),
  bapList: many(bapPraktikum),
}));

export const rombelPraktikumMahasiswaRelations = relations(rombelPraktikumMahasiswa, ({ one }) => ({
  rombelPraktikum: one(rombelPraktikum, {
    fields: [rombelPraktikumMahasiswa.rombelPraktikumId],
    references: [rombelPraktikum.id],
  }),
  mahasiswa: one(mahasiswa, {
    fields: [rombelPraktikumMahasiswa.mahasiswaId],
    references: [mahasiswa.id],
  }),
}));

export const bapPraktikumRelations = relations(bapPraktikum, ({ one, many }) => ({
  rombelPraktikum: one(rombelPraktikum, {
    fields: [bapPraktikum.rombelPraktikumId],
    references: [rombelPraktikum.id],
  }),
  instruktur: one(dosen, {
    fields: [bapPraktikum.instrukturId],
    references: [dosen.id],
  }),
  presensiList: many(presensiPraktikum),
}));

export const presensiPraktikumRelations = relations(presensiPraktikum, ({ one }) => ({
  bapPraktikum: one(bapPraktikum, {
    fields: [presensiPraktikum.bapPraktikumId],
    references: [bapPraktikum.id],
  }),
  mahasiswa: one(mahasiswa, {
    fields: [presensiPraktikum.mahasiswaId],
    references: [mahasiswa.id],
  }),
}));

// --- SYSTEM FEEDBACK & EVALUASI ---
export const systemFeedback = pgTable('system_feedback', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  kategori: varchar('kategori', { length: 50 }).notNull(),
  judul: varchar('nama', { length: 255 }).notNull(),
  pesan: text('pesan').notNull(),
  rating: integer('rating'),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const systemFeedbackRelations = relations(systemFeedback, ({ one }) => ({
  user: one(users, {
    fields: [systemFeedback.userId],
    references: [users.id],
  }),
}));
