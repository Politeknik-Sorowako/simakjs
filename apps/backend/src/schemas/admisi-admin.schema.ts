import { t } from 'elysia';

export const createSessionSchema = {
  detail: {
    tags: ['Admisi - Admin'],
    summary: 'Buat sesi admisi baru',
  },
  body: t.Object({
    kode: t.String({ minLength: 2, maxLength: 20 }),
    nama: t.String({ minLength: 3, maxLength: 255 }),
    deskripsi: t.Optional(t.String()),
    tanggalMulai: t.String({ description: 'YYYY-MM-DD' }),
    tanggalTutup: t.String({ description: 'YYYY-MM-DD' }),
    tanggalVerif: t.Optional(t.String()),
    tanggalUjian: t.Optional(t.String()),
    tanggalPengumuman: t.Optional(t.String()),
    kuota: t.Optional(t.Number()),
  }),
  response: {
    201: t.Object({ message: t.String(), sessionId: t.Number() }),
    400: t.Object({ error: t.String() }),
  },
};

export const updateSessionSchema = {
  detail: {
    tags: ['Admisi - Admin'],
    summary: 'Update sesi admisi',
  },
  body: t.Object({
    kode: t.Optional(t.String({ minLength: 2, maxLength: 20 })),
    nama: t.Optional(t.String({ minLength: 3, maxLength: 255 })),
    deskripsi: t.Optional(t.String()),
    tanggalMulai: t.Optional(t.String()),
    tanggalTutup: t.Optional(t.String()),
    tanggalVerif: t.Optional(t.String()),
    tanggalUjian: t.Optional(t.String()),
    tanggalPengumuman: t.Optional(t.String()),
    kuota: t.Optional(t.Number()),
    isActive: t.Optional(t.Boolean()),
  }),
  response: {
    200: t.Object({ message: t.String() }),
    400: t.Object({ error: t.String() }),
  },
};

export const addSessionProdiSchema = {
  detail: {
    tags: ['Admisi - Admin'],
    summary: 'Tambah prodi ke sesi admisi',
  },
  body: t.Object({
    prodiId: t.Number(),
    kuota: t.Optional(t.Number()),
    passingGrade: t.Optional(t.Number()),
    biayaDaftar: t.Optional(t.Number()),
  }),
  response: {
    201: t.Object({ message: t.String() }),
    400: t.Object({ error: t.String() }),
  },
};

export const createDocumentRequirementSchema = {
  detail: {
    tags: ['Admisi - Admin'],
    summary: 'Buat syarat dokumen',
  },
  body: t.Object({
    sessionId: t.Number(),
    prodiId: t.Optional(t.Number()),
    namaDokumen: t.String({ minLength: 3 }),
    deskripsi: t.Optional(t.String()),
    isWajib: t.Optional(t.Boolean()),
    formatFile: t.Optional(t.String()),
    maxSizeKb: t.Optional(t.Number()),
    urutan: t.Optional(t.Number()),
  }),
  response: {
    201: t.Object({ message: t.String(), requirementId: t.Number() }),
    400: t.Object({ error: t.String() }),
  },
};

export const verifyDocumentSchema = {
  detail: {
    tags: ['Admisi - Admin'],
    summary: 'Verifikasi dokumen',
  },
  body: t.Object({
    documentId: t.Number(),
    isVerified: t.Boolean(),
    rejectionNote: t.Optional(t.String()),
  }),
  response: {
    200: t.Object({ message: t.String() }),
    400: t.Object({ error: t.String() }),
  },
};

export const createSelectionComponentSchema = {
  detail: {
    tags: ['Admisi - Admin'],
    summary: 'Buat komponen penilaian',
  },
  body: t.Object({
    sessionId: t.Number(),
    prodiId: t.Optional(t.Number()),
    namaKomponen: t.String(),
    bobot: t.Number({ description: 'Persentase bobot (0-100)' }),
    tipePenilai: t.Optional(t.String()),
    urutan: t.Optional(t.Number()),
  }),
  response: {
    201: t.Object({ message: t.String() }),
    400: t.Object({ error: t.String() }),
  },
};

export const inputScoreSchema = {
  detail: {
    tags: ['Admisi - Admin'],
    summary: 'Input nilai peserta',
  },
  body: t.Object({
    applicationId: t.Number(),
    componentId: t.Number(),
    score: t.Number({ description: 'Nilai 0-100' }),
    notes: t.Optional(t.String()),
  }),
  response: {
    201: t.Object({ message: t.String() }),
    400: t.Object({ error: t.String() }),
  },
};

export const createExamScheduleSchema = {
  detail: {
    tags: ['Admisi - Admin'],
    summary: 'Buat jadwal ujian',
  },
  body: t.Object({
    applicationId: t.Number(),
    sessionId: t.Number(),
    reviewerId: t.Optional(t.Number()),
    tipeUjian: t.String(),
    tanggal: t.String(),
    waktuMulai: t.String(),
    waktuSelesai: t.Optional(t.String()),
    lokasiType: t.Optional(t.String()),
    lokasiDetail: t.Optional(t.String()),
    catatan: t.Optional(t.String()),
  }),
  response: {
    201: t.Object({ message: t.String(), scheduleId: t.Number() }),
    400: t.Object({ error: t.String() }),
  },
};

export const verifyPaymentSchema = {
  detail: {
    tags: ['Admisi - Admin'],
    summary: 'Verifikasi pembayaran daftar ulang',
  },
  body: t.Object({
    paymentId: t.Number(),
    isVerified: t.Boolean(),
    rejectionNote: t.Optional(t.String()),
  }),
  response: {
    200: t.Object({ message: t.String() }),
    400: t.Object({ error: t.String() }),
  },
};

export const issueNimSchema = {
  detail: {
    tags: ['Admisi - Admin'],
    summary: 'Terbitkan NIM untuk peserta',
  },
  body: t.Object({
    applicationId: t.Number(),
    nim: t.String({ minLength: 5, maxLength: 50 }),
  }),
  response: {
    200: t.Object({ message: t.String(), nim: t.String() }),
    400: t.Object({ error: t.String() }),
  },
};

export const updateApplicationStatusSchema = {
  detail: {
    tags: ['Admisi - Admin'],
    summary: 'Update status aplikasi (manual)',
  },
  body: t.Object({
    status: t.String(),
    notes: t.Optional(t.String()),
  }),
  response: {
    200: t.Object({ message: t.String() }),
    400: t.Object({ error: t.String() }),
  },
};
