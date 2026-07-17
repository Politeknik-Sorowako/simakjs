import { t } from 'elysia';

export const registerCalonSchema = {
  detail: {
    tags: ['Admisi - Calon Mahasiswa'],
    summary: 'Registrasi akun calon mahasiswa',
    description: 'Mendaftarkan akun baru dengan role calon_mahasiswa',
  },
  body: t.Object({
    email: t.String({ format: 'email', description: 'Email aktif' }),
    password: t.String({ minLength: 6, description: 'Password minimal 6 karakter' }),
    nama: t.String({ minLength: 3, description: 'Nama lengkap' }),
  }),
  response: {
    201: t.Object({
      message: t.String(),
      userId: t.Number(),
    }),
    400: t.Object({
      error: t.String(),
    }),
  },
};

export const verifyEmailSchema = {
  detail: {
    tags: ['Admisi - Calon Mahasiswa'],
    summary: 'Verifikasi email',
    description: 'Verifikasi email menggunakan token dari email',
  },
  body: t.Object({
    token: t.String({ description: 'Token verifikasi dari email' }),
  }),
  response: {
    200: t.Object({
      message: t.String(),
    }),
    400: t.Object({
      error: t.String(),
    }),
  },
};

export const createApplicationSchema = {
  detail: {
    tags: ['Admisi - Calon Mahasiswa'],
    summary: 'Buat pendaftaran baru',
    description: 'Membuat pendaftaran baru untuk sesi admisi aktif',
  },
  body: t.Object({
    sessionId: t.Number({ description: 'ID sesi admisi' }),
    prodiPilihan1: t.Number({ description: 'ID program studi pilihan 1' }),
    prodiPilihan2: t.Optional(t.Number({ description: 'ID program studi pilihan 2' })),
  }),
  response: {
    201: t.Object({
      message: t.String(),
      applicationId: t.Number(),
      noPendaftar: t.String(),
    }),
    400: t.Object({
      error: t.String(),
    }),
  },
};

export const updateApplicationSchema = {
  detail: {
    tags: ['Admisi - Calon Mahasiswa'],
    summary: 'Update biodata pendaftaran',
    description: 'Memperbarui biodata pendaftaran',
  },
  body: t.Object({
    nik: t.Optional(t.String({ minLength: 16, maxLength: 16 })),
    namaLengkap: t.Optional(t.String({ minLength: 3 })),
    tempatLahir: t.Optional(t.String()),
    tanggalLahir: t.Optional(t.String()),
    jenisKelamin: t.Optional(t.Union([t.Literal('L'), t.Literal('P')])),
    idAgama: t.Optional(t.Number()),
    kewarganegaraan: t.Optional(t.String()),
    jalan: t.Optional(t.String()),
    rt: t.Optional(t.String()),
    rw: t.Optional(t.String()),
    kodePos: t.Optional(t.String()),
    telepon: t.Optional(t.String()),
    namaIbuKandung: t.Optional(t.String()),
    asalSekolah: t.Optional(t.String()),
    jurusanSekolah: t.Optional(t.String()),
    tahunLulus: t.Optional(t.String()),
  }),
  response: {
    200: t.Object({
      message: t.String(),
    }),
    400: t.Object({
      error: t.String(),
    }),
  },
};

export const submitApplicationSchema = {
  detail: {
    tags: ['Admisi - Calon Mahasiswa'],
    summary: 'Submit pendaftaran',
    description: 'Mengubah status pendaftaran dari draft menjadi submitted',
  },
  params: t.Object({
    id: t.String({ description: 'ID pendaftaran' }),
  }),
  response: {
    200: t.Object({
      message: t.String(),
      status: t.String(),
    }),
    400: t.Object({
      error: t.String(),
    }),
  },
};

export const uploadDocumentSchema = {
  detail: {
    tags: ['Admisi - Calon Mahasiswa'],
    summary: 'Upload dokumen',
    description: 'Upload file dokumen persyaratan',
  },
  body: t.Object({
    requirementId: t.Number({ description: 'ID requirement dokumen' }),
  }),
  response: {
    201: t.Object({
      message: t.String(),
      documentId: t.Number(),
    }),
    400: t.Object({
      error: t.String(),
    }),
  },
};

export const submitDocumentLinkSchema = {
  detail: {
    tags: ['Admisi - Calon Mahasiswa'],
    summary: 'Submit link dokumen',
    description: 'Mengirimkan link Google Drive sebagai dokumen',
  },
  body: t.Object({
    requirementId: t.Number(),
    fileLink: t.String({ description: 'URL Google Drive' }),
  }),
  response: {
    201: t.Object({
      message: t.String(),
      documentId: t.Number(),
    }),
    400: t.Object({
      error: t.String(),
    }),
  },
};

export const submitPaymentProofSchema = {
  detail: {
    tags: ['Admisi - Calon Mahasiswa'],
    summary: 'Upload bukti pembayaran daftar ulang',
    description: 'Upload bukti transfer biaya daftar ulang',
  },
  body: t.Object({
    nominal: t.Number({ description: 'Jumlah pembayaran' }),
    bankAsal: t.Optional(t.String()),
    namaPengirim: t.Optional(t.String()),
  }),
  response: {
    201: t.Object({
      message: t.String(),
      paymentId: t.Number(),
    }),
    400: t.Object({
      error: t.String(),
    }),
  },
};
