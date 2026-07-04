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
  }),
  response: {
    200: t.Object({
      id: t.Integer({ default: 1 }),
      mahasiswaId: t.Integer({ default: 1 }),
      judulTa: t.String({ default: 'Rancang Bangun Sistem Informasi Vokasi' }),
      skorToefl: t.Integer({ default: 450 }),
      bebasPerpustakaan: t.Boolean({ default: true }),
      bebasLab: t.Boolean({ default: true }),
      buktiPembayaranWisuda: t.Boolean({ default: true }),
      status: t.String({ default: 'diajukan' }),
      catatan: t.Union([t.String(), t.Null()], { default: null }),
      mahasiswa: t.Optional(t.Object({
        nim: t.String({ default: '202301001' }),
        nama: t.String({ default: 'Andi Pratama' }),
        status: t.String({ default: 'aktif' })
      })),
      prodi: t.Optional(t.Union([
        t.Object({
          nama: t.Union([t.String(), t.Null()])
        }),
        t.Null()
      ]))
    }),
    404: t.Object({
      error: t.String({ default: 'Pengajuan yudisium tidak ditemukan' })
    })
  }
};

export const getAllYudisiumSchema = {
  detail: {
    tags: ['Yudisium & Komponen Nilai'],
    summary: 'Daftar Pengajuan Yudisium',
    description: 'Mengambil daftar semua pengajuan yudisium mahasiswa.'
  },
  response: {
    200: t.Array(t.Object({
      id: t.Integer({ default: 1 }),
      mahasiswaId: t.Integer({ default: 1 }),
      judulTa: t.String({ default: 'Rancang Bangun Sistem Informasi Vokasi' }),
      skorToefl: t.Integer({ default: 450 }),
      bebasPerpustakaan: t.Boolean({ default: true }),
      bebasLab: t.Boolean({ default: true }),
      buktiPembayaranWisuda: t.Boolean({ default: true }),
      status: t.String({ default: 'diajukan' }),
      catatan: t.Union([t.String(), t.Null()], { default: null }),
      mahasiswa: t.Optional(t.Object({
        nim: t.String({ default: '202301001' }),
        nama: t.String({ default: 'Andi Pratama' }),
        status: t.String({ default: 'aktif' })
      })),
      prodi: t.Optional(t.Union([
        t.Object({
          nama: t.Union([t.String(), t.Null()])
        }),
        t.Null()
      ]))
    }))
  }
};

export const submitPengajuanYudisiumSchema = {
  detail: {
    tags: ['Yudisium & Komponen Nilai'],
    summary: 'Ajukan Yudisium',
    description: 'Mengajukan yudisium bagi mahasiswa dengan menyertakan kelengkapan berkas.'
  },
  params: t.Object({
    mhsId: t.Numeric()
  }),
  body: pengajuanYudisiumBody,
  response: {
    201: t.Object({
      id: t.Integer({ default: 1 }),
      mahasiswaId: t.Integer({ default: 1 }),
      judulTa: t.String({ default: 'Rancang Bangun Sistem Informasi Vokasi' }),
      skorToefl: t.Integer({ default: 450 }),
      bebasPerpustakaan: t.Boolean({ default: true }),
      bebasLab: t.Boolean({ default: true }),
      buktiPembayaranWisuda: t.Boolean({ default: true }),
      status: t.String({ default: 'diajukan' })
    })
  }
};

export const updateYudisiumStatusSchema = {
  detail: {
    tags: ['Yudisium & Komponen Nilai'],
    summary: 'Update Status Yudisium',
    description: 'Memperbarui status verifikasi/persetujuan pengajuan yudisium mahasiswa oleh kaprodi/admin.'
  },
  params: t.Object({
    mhsId: t.Numeric()
  }),
  body: updateYudisiumStatusBody,
  response: {
    200: t.Object({
      id: t.Integer({ default: 1 }),
      mahasiswaId: t.Integer({ default: 1 }),
      status: t.String({ default: 'diverifikasi' }),
      catatan: t.Union([t.String(), t.Null()], { default: 'Berkas lengkap dan sesuai' })
    })
  }
};

export const getKomponenYudisiumSchema = {
  detail: {
    tags: ['Yudisium & Komponen Nilai'],
    summary: 'Daftar Komponen Nilai Kelas',
    description: 'Mengambil daftar komponen nilai (uts, uas, tugas, dll) untuk suatu Kelas Kuliah.'
  },
  params: t.Object({
    kelasKuliahId: t.Numeric()
  }),
  response: {
    200: t.Array(t.Object({
      id: t.Integer({ default: 1 }),
      kelasKuliahId: t.Integer({ default: 1 }),
      nama: t.String({ default: 'UTS' }),
      bobot: t.Integer({ default: 30 })
    }))
  }
};

export const saveKomponenYudisiumSchema = {
  detail: {
    tags: ['Yudisium & Komponen Nilai'],
    summary: 'Simpan Komponen Nilai Kelas',
    description: 'Menyimpan komponen nilai beserta bobotnya untuk suatu Kelas Kuliah.'
  },
  body: saveKomponenBody,
  response: {
    200: t.Array(t.Object({
      id: t.Optional(t.Integer({ default: 1 })),
      kelasKuliahId: t.Optional(t.Integer({ default: 1 })),
      nama: t.Optional(t.String({ default: 'UTS' })),
      bobot: t.Optional(t.Integer({ default: 30 }))
    }))
  }
};

export const getNilaiMahasiswaYudisiumSchema = {
  detail: {
    tags: ['Yudisium & Komponen Nilai'],
    summary: 'Daftar Nilai Mahasiswa Kelas',
    description: 'Mengambil daftar nilai mahasiswa beserta nilainya per komponen di suatu Kelas Kuliah.'
  },
  params: t.Object({
    kelasKuliahId: t.Numeric()
  }),
  response: {
    200: t.Array(t.Object({
      krsId: t.Optional(t.Integer({ default: 1 })),
      mahasiswaId: t.Optional(t.Integer({ default: 1 })),
      nim: t.Optional(t.String({ default: '202301001' })),
      nama: t.Optional(t.String({ default: 'Andi Pratama' })),
      nilaiAngka: t.Optional(t.Union([t.String(), t.Null()], { default: '85.5' })),
      nilaiHuruf: t.Optional(t.Union([t.String(), t.Null()], { default: 'A' })),
      nilaiIndeks: t.Optional(t.Union([t.String(), t.Null()], { default: '4.0' })),
      nilaiKomponen: t.Optional(t.Array(t.Object({
        id: t.Optional(t.Integer()),
        krsId: t.Optional(t.Integer()),
        komponenNilaiId: t.Optional(t.Integer()),
        nilai: t.Optional(t.Union([t.String(), t.Number()]))
      })))
    }))
  }
};

export const saveNilaiMahasiswaYudisiumSchema = {
  detail: {
    tags: ['Yudisium & Komponen Nilai'],
    summary: 'Simpan Nilai Mahasiswa Kelas',
    description: 'Menginput/menyimpan nilai mahasiswa untuk setiap komponen nilai di suatu Kelas Kuliah.'
  },
  body: saveNilaiMahasiswaBody,
  response: {
    200: t.Array(t.Object({
      id: t.Optional(t.Integer({ default: 1 })),
      mahasiswaId: t.Optional(t.Integer({ default: 1 })),
      kelasKuliahId: t.Optional(t.Integer({ default: 1 })),
      nilaiAngka: t.Optional(t.Union([t.String(), t.Null()], { default: '85.5' })),
      nilaiHuruf: t.Optional(t.Union([t.String(), t.Null()], { default: 'A' })),
      nilaiIndeks: t.Optional(t.Union([t.String(), t.Null()], { default: '4.0' }))
    }))
  }
};

export const lockKelasYudisiumSchema = {
  detail: {
    tags: ['Yudisium & Komponen Nilai'],
    summary: 'Kunci Nilai Kelas',
    description: 'Mengunci nilai suatu Kelas Kuliah agar tidak dapat diubah lagi dan nilai diproses ke KHS.'
  },
  params: t.Object({
    kelasKuliahId: t.Numeric()
  }),
  response: {
    200: t.Object({
      id: t.Optional(t.Integer({ default: 1 })),
      mataKuliahId: t.Optional(t.Integer({ default: 1 })),
      periodeId: t.Optional(t.String({ default: '20261' })),
      nama: t.Optional(t.String({ default: 'Kelas A' })),
      isLocked: t.Optional(t.Boolean({ default: true }))
    })
  }
};

export const unlockKelasYudisiumSchema = {
  detail: {
    tags: ['Yudisium & Komponen Nilai'],
    summary: 'Buka Kunci Nilai Kelas',
    description: 'Membuka kunci nilai suatu Kelas Kuliah agar dapat diubah kembali.'
  },
  params: t.Object({
    kelasKuliahId: t.Numeric()
  }),
  response: {
    200: t.Object({
      id: t.Optional(t.Integer({ default: 1 })),
      mataKuliahId: t.Optional(t.Integer({ default: 1 })),
      periodeId: t.Optional(t.String({ default: '20261' })),
      nama: t.Optional(t.String({ default: 'Kelas A' })),
      isLocked: t.Optional(t.Boolean({ default: false }))
    })
  }
};

