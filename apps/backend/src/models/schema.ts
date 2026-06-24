import { pgTable, serial, text, varchar, integer, timestamp, pgEnum, date } from 'drizzle-orm/pg-core';

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
