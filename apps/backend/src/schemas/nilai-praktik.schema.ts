import { t } from 'elysia';

export const nilaiPraktikItem = t.Object({
  mahasiswaId: t.Integer(),
  komponenNilaiId: t.Optional(t.Nullable(t.Integer())),
  nilaiAngka: t.Number({ minimum: 0, maximum: 100 }),
  keterangan: t.Optional(t.Nullable(t.String())),
});

export const saveNilaiPraktikBody = t.Object({
  rombelPraktikumId: t.Integer(),
  nilaiList: t.Array(nilaiPraktikItem),
});

export const saveNilaiPraktikSchema = {
  detail: {
    tags: ['Nilai Praktik'],
    summary: 'Simpan Nilai Praktikum per Rombel',
    description: 'Menyimpan penilaian praktikum per rombel. Data lama pada rombel akan diganti seluruhnya.',
  },
  body: saveNilaiPraktikBody,
  response: {
    200: t.Object({
      success: t.Boolean(),
      syncedCount: t.Integer(),
    }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
    404: t.Object({ error: t.String() }),
  },
};

export const getNilaiPraktikByRombelSchema = {
  detail: {
    tags: ['Nilai Praktik'],
    summary: 'Daftar Nilai Praktikum per Rombel',
    description: 'Mengambil daftar nilai praktikum beserta informasi mahasiswa dan komponen nilai.',
  },
  params: t.Object({ rombelPraktikumId: t.Numeric() }),
  response: {
    200: t.Array(
      t.Object({
        id: t.Integer(),
        rombelPraktikumId: t.Integer(),
        mahasiswaId: t.Integer(),
        mahasiswaNim: t.String(),
        mahasiswaNama: t.String(),
        komponenNilaiId: t.Union([t.Integer(), t.Null()]),
        komponenNama: t.Union([t.String(), t.Null()]),
        nilaiAngka: t.String(),
        keterangan: t.Union([t.String(), t.Null()]),
        createdAt: t.Union([t.String(), t.Null()], { default: null }),
      }),
    ),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
  },
};
