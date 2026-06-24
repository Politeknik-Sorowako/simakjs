import { pgTable, serial, text, varchar, integer, timestamp, pgEnum, date, boolean, numeric } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const roleEnum = pgEnum('user_role', ['admin', 'dosen', 'mahasiswa']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  role: roleEnum('role').notNull().default('mahasiswa'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const programStudi = pgTable('program_studi', {
  id: serial('id').primaryKey(),
  kode: varchar('kode', { length: 50 }).notNull().unique(),
  nama: varchar('nama', { length: 255 }).notNull(),
  jenjang: varchar('jenjang', { length: 10 }).notNull(), // D3, D4, dll.
  idPddikti: varchar('id_pddikti', { length: 50 }),
});

export const dosen = pgTable('dosen', {
  id: serial('id').primaryKey(),
  nip: varchar('nip', { length: 50 }).notNull().unique(),
  nama: varchar('nama', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  programStudiId: integer('program_studi_id').references(() => programStudi.id),
  idPddikti: varchar('id_pddikti', { length: 50 }),
  nidn: varchar('nidn', { length: 50 }).unique(),
  nik: varchar('nik', { length: 16 }),
  jenisKelamin: varchar('jenis_kelamin', { length: 1 }),
  tanggalLahir: date('tanggal_lahir'),
});

export const mahasiswa = pgTable('mahasiswa', {
  id: serial('id').primaryKey(),
  nim: varchar('nim', { length: 50 }).notNull().unique(),
  nama: varchar('nama', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  programStudiId: integer('program_studi_id').references(() => programStudi.id),
  status: varchar('status', { length: 50 }).notNull().default('aktif'), // aktif, cuti, lulus, drop_out
  idPddikti: varchar('id_pddikti', { length: 50 }),
  namaIbuKandung: varchar('nama_ibu_kandung', { length: 255 }).notNull(),
  nik: varchar('nik', { length: 16 }).notNull().unique(),
  jenisKelamin: varchar('jenis_kelamin', { length: 1 }).notNull(),
  tanggalLahir: date('tanggal_lahir').notNull(),
});

export const periodeAkademik = pgTable('periode_akademik', {
  id: varchar('id', { length: 5 }).primaryKey(), // misal "20231"
  nama: varchar('nama', { length: 100 }).notNull(),
  aktif: boolean('aktif').default(false).notNull(),
  idPddikti: varchar('id_pddikti', { length: 50 }),
});

export const mataKuliah = pgTable('mata_kuliah', {
  id: serial('id').primaryKey(),
  kode: varchar('kode', { length: 50 }).notNull().unique(),
  nama: varchar('nama', { length: 255 }).notNull(),
  sksTotal: integer('sks_total').notNull(),
  sksTatapMuka: integer('sks_tatap_muka'),
  sksPraktek: integer('sks_praktek'),
  programStudiId: integer('program_studi_id').references(() => programStudi.id),
  idPddikti: varchar('id_pddikti', { length: 50 }),
});

export const kelasKuliah = pgTable('kelas_kuliah', {
  id: serial('id').primaryKey(),
  mataKuliahId: integer('mata_kuliah_id').notNull().references(() => mataKuliah.id),
  periodeId: varchar('periode_id', { length: 5 }).notNull().references(() => periodeAkademik.id),
  namaKelas: varchar('nama_kelas', { length: 50 }).notNull(),
  idPddikti: varchar('id_pddikti', { length: 50 }),
});

export const dosenPengajarKelas = pgTable('dosen_pengajar_kelas', {
  id: serial('id').primaryKey(),
  dosenId: integer('dosen_id').notNull().references(() => dosen.id),
  kelasKuliahId: integer('kelas_kuliah_id').notNull().references(() => kelasKuliah.id),
  sksBebanMengajar: integer('sks_beban_mengajar'),
  idPddikti: varchar('id_pddikti', { length: 50 }),
});

export const krs = pgTable('krs', {
  id: serial('id').primaryKey(),
  mahasiswaId: integer('mahasiswa_id').notNull().references(() => mahasiswa.id),
  kelasKuliahId: integer('kelas_kuliah_id').notNull().references(() => kelasKuliah.id),
  nilaiAngka: numeric('nilai_angka', { precision: 5, scale: 2 }),
  nilaiHuruf: varchar('nilai_huruf', { length: 5 }),
  nilaiIndeks: numeric('nilai_indeks', { precision: 3, scale: 2 }),
  idPddikti: varchar('id_pddikti', { length: 50 }),
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
}));

