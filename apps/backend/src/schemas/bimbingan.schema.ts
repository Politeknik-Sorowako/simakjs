import { t } from 'elysia';

export const bimbinganThreadBody = t.Object({
  pesan: t.String({ minLength: 1, maxLength: 1000, default: 'Halo, saya ingin berkonsultasi mengenai rencana studi saya.' }),
  tipe: t.Optional(t.String({ default: 'uts' }))
});

export const bimbinganUpdateBody = t.Object({
  ringkasan: t.Optional(t.String({ maxLength: 2000 })),
  isApproved: t.Optional(t.Boolean({ default: true })),
  permasalahan: t.Optional(t.String()),
  solusi: t.Optional(t.String()),
  tanggalBimbingan: t.Optional(t.Any()),
  statusBkd: t.Optional(t.Boolean({ default: false }))
});

export const getBimbinganSchema = {
  detail: {
    tags: ['Bimbingan'],
    summary: 'Ambil Data Bimbingan & Chat Thread',
    description: 'Mengambil data bimbingan aktif beserta riwayat thread chat antara Dosen PA dan Mahasiswa.'
  },
  params: t.Object({
    mhsId: t.Numeric()
  }),
  response: {
    200: t.Object({
      id: t.Optional(t.Integer({ default: 1 })),
      mahasiswaId: t.Optional(t.Integer({ default: 1 })),
      dosenId: t.Optional(t.Union([t.Integer(), t.Null()], { default: 1 })),
      periodeId: t.Optional(t.Union([t.String(), t.Null()], { default: '20261' })),
      ringkasan: t.Optional(t.Union([t.String(), t.Null()], { default: 'Siswa aktif berkonsultasi mengenai pemilihan mata kuliah pilihan.' })),
      isApproved: t.Optional(t.Boolean({ default: true })),
      sesi: t.Optional(t.Array(t.Object({
        id: t.Optional(t.Integer()),
        bimbinganId: t.Optional(t.Integer()),
        pertemuanKe: t.Optional(t.Integer()),
        tanggalBimbingan: t.Optional(t.Any()),
        permasalahan: t.Optional(t.String()),
        solusi: t.Optional(t.String()),
        statusBkd: t.Optional(t.Boolean()),
        createdAt: t.Optional(t.Any()),
        updatedAt: t.Optional(t.Any()),
      }))),
      thread: t.Optional(t.Array(t.Object({
        id: t.Optional(t.Integer({ default: 1 })),
        senderRole: t.Optional(t.String({ default: 'mahasiswa' })),
        pesan: t.Optional(t.String({ default: 'Halo, saya ingin berkonsultasi mengenai rencana studi saya.' })),
        tipe: t.Optional(t.String({ default: 'uts' })),
        createdAt: t.Optional(t.Any())
      })))
    })
  }
};

export const createBimbinganThreadSchema = {
  detail: {
    tags: ['Bimbingan'],
    summary: 'Kirim Pesan Bimbingan',
    description: 'Mengirimkan pesan konsultasi baru ke thread bimbingan mahasiswa.'
  },
  params: t.Object({
    mhsId: t.Numeric()
  }),
  body: bimbinganThreadBody,
  response: {
    201: t.Object({
      id: t.Optional(t.Integer({ default: 1 })),
      bimbinganId: t.Optional(t.Integer({ default: 1 })),
      senderRole: t.Optional(t.String({ default: 'mahasiswa' })),
      pesan: t.Optional(t.String({ default: 'Halo, saya ingin berkonsultasi mengenai rencana studi saya.' })),
      tipe: t.Optional(t.String({ default: 'uts' })),
      createdAt: t.Optional(t.Any())
    })
  }
};

export const updateBimbinganSchema = {
  detail: {
    tags: ['Bimbingan'],
    summary: 'Update Ringkasan & Persetujuan Bimbingan',
    description: 'Dosen PA memperbarui ringkasan bimbingan serta memberikan persetujuan kelayakan/progres bimbingan.'
  },
  params: t.Object({
    mhsId: t.Numeric()
  }),
  body: bimbinganUpdateBody,
  response: {
    200: t.Object({
      id: t.Optional(t.Integer({ default: 1 })),
      mahasiswaId: t.Optional(t.Integer({ default: 1 })),
      dosenId: t.Optional(t.Union([t.Integer(), t.Null()], { default: 1 })),
      periodeId: t.Optional(t.Union([t.String(), t.Null()], { default: '20261' })),
      ringkasan: t.Optional(t.Union([t.String(), t.Null()], { default: 'Mahasiswa sudah melengkapi revisi draft TA.' })),
      isApproved: t.Optional(t.Boolean({ default: true })),
      permasalahan: t.Optional(t.Union([t.String(), t.Null()])),
      solusi: t.Optional(t.Union([t.String(), t.Null()])),
      tanggalBimbingan: t.Optional(t.Any()),
      statusBkd: t.Optional(t.Boolean({ default: false })),
    })
  }
};

export const getBimbinganMonitoringSchema = {
  detail: {
    tags: ['Bimbingan'],
    summary: 'Monitoring Progres Bimbingan Akademik',
    description: 'Admin atau Kaprodi memantau seluruh status bimbingan mahasiswa pada periode aktif.'
  },
  response: {
    200: t.Array(t.Object({
      id: t.Optional(t.Integer({ default: 1 })),
      nim: t.Optional(t.String({ default: '202301001' })),
      nama: t.Optional(t.String({ default: 'Andi Pratama' })),
      dosenPaId: t.Optional(t.Union([t.Integer(), t.Null()], { default: 1 })),
      dosenPaNama: t.Optional(t.Union([t.String(), t.Null()], { default: 'Dr. Budi Utomo' })),
      isApproved: t.Optional(t.Boolean({ default: true })),
      bimbinganId: t.Optional(t.Union([t.Integer(), t.Null()])),
      ringkasan: t.Optional(t.Union([t.String(), t.Null()])),
      permasalahan: t.Optional(t.Union([t.String(), t.Null()])),
      solusi: t.Optional(t.Union([t.String(), t.Null()])),
      tanggalBimbingan: t.Optional(t.Any()),
      statusBkd: t.Optional(t.Boolean({ default: false })),
      createdAt: t.Optional(t.Any()),
      updatedAt: t.Optional(t.Any()),
    }))
  }
};

