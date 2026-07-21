import { t } from 'elysia';

const validStatus = t.Union(
  [
    t.Literal('hadir'),
    t.Literal('terlambat'),
    t.Literal('unknown'),
    t.Literal('sakit'),
    t.Literal('izin'),
    t.Literal('alpa'),
  ],
  { error: 'Status presensi tidak valid' },
);

const validShift = t.Union([t.Literal('pagi'), t.Literal('sore')], { error: 'Shift harus pagi atau sore' });

export const createKelompokSchema = {
  body: t.Object({
    namaKelompok: t.String({ minLength: 1, error: 'Nama kelompok harus diisi' }),
    programStudiId: t.Optional(t.Nullable(t.Number({ error: 'Program studi tidak valid' }))),
    dosenId: t.Optional(t.Nullable(t.Number({ error: 'Dosen PJ tidak valid' }))),
    shift: t.Optional(t.String({ error: 'Shift tidak valid' })),
    keterangan: t.Optional(t.String({ error: 'Keterangan tidak valid' })),
  }),
};

export const updateKelompokSchema = {
  body: t.Object({
    namaKelompok: t.Optional(t.String({ minLength: 1, error: 'Nama kelompok tidak valid' })),
    programStudiId: t.Optional(t.Nullable(t.Number({ error: 'Program studi tidak valid' }))),
    dosenId: t.Optional(t.Nullable(t.Number({ error: 'Dosen PJ tidak valid' }))),
    shift: t.Optional(t.String({ error: 'Shift tidak valid' })),
    keterangan: t.Optional(t.String({ error: 'Keterangan tidak valid' })),
    isActive: t.Optional(t.Boolean({ error: 'Status aktif tidak valid' })),
  }),
  params: t.Object({
    id: t.String({ error: 'ID kelompok diperlukan' }),
  }),
};

export const deleteKelompokSchema = {
  params: t.Object({
    id: t.String({ error: 'ID kelompok diperlukan' }),
  }),
};

export const getKelompokSchema = {
  query: t.Object({
    prodiId: t.Optional(t.String({ error: 'Prodi ID tidak valid' })),
    dosenId: t.Optional(t.String({ error: 'Dosen ID tidak valid' })),
  }),
};

export const getKelompokDetailSchema = {
  params: t.Object({
    id: t.String({ error: 'ID kelompok diperlukan' }),
  }),
};

export const manageAnggotaSchema = {
  params: t.Object({
    id: t.String({ error: 'ID kelompok diperlukan' }),
  }),
  body: t.Object({
    mahasiswaIds: t.Array(t.Number(), { minItems: 1, error: 'Pilih minimal satu mahasiswa' }),
  }),
};

export const removeAnggotaSchema = {
  params: t.Object({
    id: t.String({ error: 'ID kelompok diperlukan' }),
    mhsId: t.String({ error: 'ID mahasiswa diperlukan' }),
  }),
};

export const bukaSesiSchema = {
  body: t.Object({
    kelompokApelId: t.Number({ error: 'Kelompok apel harus dipilih' }),
    tanggal: t.String({ minLength: 10, error: 'Tanggal harus diisi (YYYY-MM-DD)' }),
    shift: validShift,
    jamMulai: t.String({ error: 'Jam mulai harus diisi' }),
    dosenId: t.Optional(t.Nullable(t.Number({ error: 'Dosen PJ tidak valid' }))),
  }),
};

export const submitPresensiSchema = {
  params: t.Object({
    id: t.String({ error: 'ID sesi diperlukan' }),
  }),
  body: t.Object({
    presensiList: t.Array(
      t.Object({
        mahasiswaId: t.Number({ error: 'ID mahasiswa diperlukan' }),
        status: validStatus,
        menitTerlambat: t.Optional(t.Nullable(t.Number({ minimum: 0, error: 'Menit terlambat tidak valid' }))),
      }),
      { minItems: 1 },
    ),
  }),
};

export const getSesiPresensiSchema = {
  params: t.Object({
    id: t.String({ error: 'ID sesi diperlukan' }),
  }),
};

export const getSesiByKelompokSchema = {
  params: t.Object({
    kelompokId: t.String({ error: 'ID kelompok diperlukan' }),
  }),
};

export const tutupSesiSchema = {
  params: t.Object({
    id: t.String({ error: 'ID sesi diperlukan' }),
  }),
};

export const getSesiAktifSchema = {
  query: t.Object({
    dosenId: t.Optional(t.String({ error: 'Dosen ID tidak valid' })),
  }),
};

export const getMonitorSchema = {
  query: t.Object({
    dosenId: t.Optional(t.String({ error: 'Dosen ID tidak valid' })),
    tanggal: t.Optional(t.String({ error: 'Tanggal tidak valid' })),
  }),
};

export const getPresensiUnknownSchema = {
  query: t.Object({
    page: t.Optional(t.String({ error: 'Page tidak valid' })),
    limit: t.Optional(t.String({ error: 'Limit tidak valid' })),
    prodiId: t.Optional(t.String({ error: 'Prodi ID tidak valid' })),
    kelompokId: t.Optional(t.String({ error: 'Kelompok ID tidak valid' })),
    tanggal: t.Optional(t.String({ error: 'Tanggal tidak valid' })),
  }),
};

export const verifyPresensiSchema = {
  params: t.Object({
    id: t.String({ error: 'ID presensi diperlukan' }),
  }),
  body: t.Object({
    verifiedStatus: t.Union([t.Literal('sakit'), t.Literal('izin'), t.Literal('alpa'), t.Literal('hadir')], {
      error: 'Status verifikasi harus sakit, izin, alpa, atau hadir',
    }),
    verificationNote: t.Optional(t.String({ error: 'Catatan verifikasi tidak valid' })),
  }),
};

export const getRekapApelSchema = {
  params: t.Object({
    kelompokId: t.String({ error: 'ID kelompok diperlukan' }),
  }),
};
