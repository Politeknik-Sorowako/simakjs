import { pgTable, serial, text, varchar, integer, timestamp, pgEnum, date, boolean, numeric, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const roleEnum = pgEnum('user_role', ['admin', 'dosen', 'mahasiswa']);
export const jenisKelaminEnum = pgEnum('jenis_kelamin', ['L', 'P']);
export const tagihanStatusEnum = pgEnum('tagihan_status', ['belum_bayar', 'lunas']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  role: roleEnum('role').notNull().default('mahasiswa'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
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
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
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
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const mahasiswa = pgTable('mahasiswa', {
  id: serial('id').primaryKey(),
  nim: varchar('nim', { length: 50 }).notNull().unique(),
  nama: varchar('nama', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  programStudiId: integer('program_studi_id').references(() => programStudi.id, { onDelete: 'restrict' }),
  status: varchar('status', { length: 50 }).notNull().default('aktif'), // aktif, cuti, lulus, drop_out
  idPddikti: varchar('id_pddikti', { length: 50 }).unique(),
  isSynced: boolean('is_synced').default(false).notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  namaIbuKandung: varchar('nama_ibu_kandung', { length: 255 }).notNull(),
  nik: varchar('nik', { length: 16 }).notNull().unique(),
  jenisKelamin: jenisKelaminEnum('jenis_kelamin').notNull(),
  tanggalLahir: date('tanggal_lahir').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const periodeAkademik = pgTable('periode_akademik', {
  id: varchar('id', { length: 5 }).primaryKey(), // misal "20231"
  nama: varchar('nama', { length: 100 }).notNull(),
  aktif: boolean('aktif').default(false).notNull(),
  idPddikti: varchar('id_pddikti', { length: 50 }).unique(),
  isSynced: boolean('is_synced').default(false).notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const mataKuliah = pgTable('mata_kuliah', {
  id: serial('id').primaryKey(),
  kode: varchar('kode', { length: 50 }).notNull().unique(),
  nama: varchar('nama', { length: 255 }).notNull(),
  sksTotal: integer('sks_total').notNull(),
  sksTatapMuka: integer('sks_tatap_muka'),
  sksPraktek: integer('sks_praktek'),
  programStudiId: integer('program_studi_id').references(() => programStudi.id, { onDelete: 'restrict' }),
  idPddikti: varchar('id_pddikti', { length: 50 }).unique(),
  isSynced: boolean('is_synced').default(false).notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const kelasKuliah = pgTable('kelas_kuliah', {
  id: serial('id').primaryKey(),
  mataKuliahId: integer('mata_kuliah_id').notNull().references(() => mataKuliah.id, { onDelete: 'restrict' }),
  periodeId: varchar('periode_id', { length: 5 }).notNull().references(() => periodeAkademik.id, { onDelete: 'restrict' }),
  namaKelas: varchar('nama_kelas', { length: 50 }).notNull(),
  idPddikti: varchar('id_pddikti', { length: 50 }).unique(),
  isSynced: boolean('is_synced').default(false).notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const dosenPengajarKelas = pgTable('dosen_pengajar_kelas', {
  id: serial('id').primaryKey(),
  dosenId: integer('dosen_id').notNull().references(() => dosen.id, { onDelete: 'cascade' }),
  kelasKuliahId: integer('kelas_kuliah_id').notNull().references(() => kelasKuliah.id, { onDelete: 'cascade' }),
  sksBebanMengajar: integer('sks_beban_mengajar'),
  idPddikti: varchar('id_pddikti', { length: 50 }).unique(),
  isSynced: boolean('is_synced').default(false).notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const tagihan = pgTable('tagihan', {
  id: serial('id').primaryKey(),
  mahasiswaId: integer('mahasiswa_id').notNull().references(() => mahasiswa.id, { onDelete: 'cascade' }),
  periodeId: varchar('periode_id', { length: 5 }).notNull().references(() => periodeAkademik.id, { onDelete: 'restrict' }),
  nominal: integer('nominal').notNull(),
  status: tagihanStatusEnum('status').notNull().default('belum_bayar'),
  tanggalBayar: timestamp('tanggal_bayar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const krs = pgTable('krs', {
  id: serial('id').primaryKey(),
  mahasiswaId: integer('mahasiswa_id').notNull().references(() => mahasiswa.id, { onDelete: 'cascade' }),
  kelasKuliahId: integer('kelas_kuliah_id').notNull().references(() => kelasKuliah.id, { onDelete: 'cascade' }),
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
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => {
  return {
    mahasiswaIdIdx: index('krs_mahasiswa_id_idx').on(table.mahasiswaId),
    kelasKuliahIdIdx: index('krs_kelas_kuliah_id_idx').on(table.kelasKuliahId),
  };
});

// Relations
export const programStudiRelations = relations(programStudi, ({ many }) => ({
  mahasiswa: many(mahasiswa),
  dosen: many(dosen),
  mataKuliah: many(mataKuliah),
}));

export const mahasiswaRelations = relations(mahasiswa, ({ one, many }) => ({
  programStudi: one(programStudi, {
    fields: [mahasiswa.programStudiId],
    references: [programStudi.id],
  }),
  krs: many(krs),
  tagihan: many(tagihan),
  presensi: many(presensi),
  kompensasiBayar: many(kompensasiBayar),
}));

export const dosenRelations = relations(dosen, ({ one, many }) => ({
  programStudi: one(programStudi, {
    fields: [dosen.programStudiId],
    references: [programStudi.id],
  }),
  dosenPengajarKelas: many(dosenPengajarKelas),
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

export const krsRelations = relations(krs, ({ one }) => ({
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

export const presensiStatusEnum = pgEnum('presensi_status', ['hadir', 'sakit', 'izin', 'telat', 'alpa']);

export const cpmk = pgTable('cpmk', {
  id: serial('id').primaryKey(),
  mataKuliahId: integer('mata_kuliah_id').notNull().references(() => mataKuliah.id, { onDelete: 'cascade' }),
  kode: varchar('kode', { length: 50 }).notNull(),
  deskripsi: text('deskripsi').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const bap = pgTable('bap', {
  id: serial('id').primaryKey(),
  kelasKuliahId: integer('kelas_kuliah_id').notNull().references(() => kelasKuliah.id, { onDelete: 'cascade' }),
  tanggal: date('tanggal').notNull(),
  pertemuanKe: integer('pertemuan_ke').notNull(),
  materi: text('materi').notNull(),
  durasiMenit: integer('durasi_menit').notNull(),
  cpmkId: integer('cpmk_id').notNull().references(() => cpmk.id, { onDelete: 'restrict' }),
  dosenId: integer('dosen_id').notNull().references(() => dosen.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const presensi = pgTable('presensi', {
  id: serial('id').primaryKey(),
  bapId: integer('bap_id').notNull().references(() => bap.id, { onDelete: 'cascade' }),
  mahasiswaId: integer('mahasiswa_id').notNull().references(() => mahasiswa.id, { onDelete: 'cascade' }),
  status: presensiStatusEnum('status').notNull(),
  durasiMangkir: integer('durasi_mangkir').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const kompensasiBayar = pgTable('kompensasi_bayar', {
  id: serial('id').primaryKey(),
  mahasiswaId: integer('mahasiswa_id').notNull().references(() => mahasiswa.id, { onDelete: 'cascade' }),
  jumlahMenit: integer('jumlah_menit').notNull(),
  tanggal: date('tanggal').notNull(),
  keterangan: text('keterangan').notNull(),
  petugasId: integer('petugas_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const cpmkRelations = relations(cpmk, ({ one, many }) => ({
  mataKuliah: one(mataKuliah, {
    fields: [cpmk.mataKuliahId],
    references: [mataKuliah.id],
  }),
  bap: many(bap),
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
