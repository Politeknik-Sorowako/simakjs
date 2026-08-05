import { t } from 'elysia';

export const createRombelBody = t.Object({
  kelasKuliahId: t.Integer(),
  namaGroup: t.String(),
  instrukturId: t.Optional(t.Nullable(t.Integer())),
  keterangan: t.Optional(t.Nullable(t.String())),
});

export const updateRombelBody = t.Partial(createRombelBody);

export const assignMahasiswaBody = t.Object({
  mahasiswaIds: t.Array(t.Integer()),
});

export const createBapPraktikumBody = t.Object({
  rombelPraktikumId: t.Integer(),
  tanggal: t.String(),
  sesiKe: t.Integer({ default: 1 }),
  materi: t.String(),
  catatan: t.Optional(t.Nullable(t.String())),
  durasiMenit: t.Integer({ default: 100 }),
  instrukturId: t.Optional(t.Nullable(t.Integer())),
});

export const updateBapPraktikumBody = t.Partial(createBapPraktikumBody);

export const savePresensiPraktikumBody = t.Object({
  bapPraktikumId: t.Integer(),
  presensiList: t.Array(
    t.Object({
      mahasiswaId: t.Integer(),
      status: t.Union([
        t.Literal('hadir'),
        t.Literal('izin'),
        t.Literal('sakit'),
        t.Literal('alpa'),
        t.Literal('telat'),
      ]),
      durasiMangkir: t.Optional(t.Integer()),
      keterangan: t.Optional(t.String()),
    }),
  ),
});

export const syncBapPraktikumBody = t.Object({
  bapPraktikumId: t.Integer(),
});
