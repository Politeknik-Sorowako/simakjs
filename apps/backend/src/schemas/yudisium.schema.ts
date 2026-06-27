import { t } from 'elysia';

export const pengajuanYudisiumBody = t.Object({
  judulTa: t.String({ minLength: 5, maxLength: 500, default: 'Rancang Bangun Sistem Informasi Vokasi' }),
  skorToefl: t.Integer({ minimum: 0, maximum: 677, default: 450 }),
  bebasPerpustakaan: t.Boolean({ default: false }),
  bebasLab: t.Boolean({ default: false }),
  buktiPembayaranWisuda: t.Boolean({ default: false })
});

export const updateYudisiumStatusBody = t.Object({
  status: t.Union([
    t.Literal('diajukan'),
    t.Literal('diverifikasi'),
    t.Literal('disetujui'),
    t.Literal('ditolak')
  ]),
  catatan: t.Optional(t.String({ maxLength: 1000 }))
});

export const saveKomponenBody = t.Object({
  kelasKuliahId: t.Integer(),
  komponenList: t.Array(
    t.Object({
      nama: t.String({ minLength: 1, maxLength: 100 }),
      bobot: t.Integer({ minimum: 1, maximum: 100 })
    })
  )
});

export const saveNilaiMahasiswaBody = t.Object({
  kelasKuliahId: t.Integer(),
  nilaiList: t.Array(
    t.Object({
      krsId: t.Integer(),
      nilaiKomponenList: t.Array(
        t.Object({
          komponenNilaiId: t.Integer(),
          nilai: t.Number()
        })
      )
    })
  )
});

export const getYudisiumSchema = {
  detail: {
    tags: ['Yudisium & Komponen Nilai'],
    summary: 'Ambil Detail Pengajuan Yudisium Mahasiswa',
    description: 'Mengambil status dan kelengkapan berkas pengajuan yudisium mahasiswa.'
  },
  params: t.Object({
    mhsId: t.Numeric()
  })
};
