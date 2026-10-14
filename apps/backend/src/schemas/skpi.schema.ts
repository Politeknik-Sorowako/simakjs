import { t } from 'elysia';

const skpiTags = ['SKPI'];
const datePattern = '^\\d{4}-\\d{2}-\\d{2}$';

// ─── Master Kategori Kegiatan ────────────────────────────────────────────────

export const getKategoriSkpiSchema = {
  detail: {
    tags: skpiTags,
    summary: 'Daftar Kategori Kegiatan SKPI',
    description: 'Mengambil daftar kategori kegiatan. `semua=true` mengembalikan termasuk non-aktif (staf).',
  },
  query: t.Object({
    semua: t.Optional(t.String()),
  }),
};

export const createKategoriSkpiSchema = {
  detail: {
    tags: skpiTags,
    summary: 'Buat Kategori Kegiatan SKPI',
    description: 'Menambahkan master kategori kegiatan (Hanya Admin/Kemahasiswaan).',
  },
  body: t.Object({
    nama: t.String({ minLength: 1, maxLength: 100 }),
    jenis: t.Union(
      [
        t.Literal('pelatihan'),
        t.Literal('seminar'),
        t.Literal('organisasi'),
        t.Literal('prestasi'),
        t.Literal('lainnya'),
      ],
      { default: 'lainnya' },
    ),
    poinDefault: t.Optional(t.Numeric({ default: 0, minimum: 0 })),
    isAktif: t.Optional(t.Boolean({ default: true })),
  }),
};

export const updateKategoriSkpiSchema = {
  detail: {
    tags: skpiTags,
    summary: 'Edit Kategori Kegiatan SKPI',
  },
  params: t.Object({ id: t.Numeric() }),
  body: t.Object({
    nama: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
    jenis: t.Optional(
      t.Union([
        t.Literal('pelatihan'),
        t.Literal('seminar'),
        t.Literal('organisasi'),
        t.Literal('prestasi'),
        t.Literal('lainnya'),
      ]),
    ),
    poinDefault: t.Optional(t.Numeric({ minimum: 0 })),
    isAktif: t.Optional(t.Boolean()),
  }),
};

export const deleteKategoriSkpiSchema = {
  detail: {
    tags: skpiTags,
    summary: 'Hapus Kategori Kegiatan SKPI',
    description: 'Hapus kategori. Ditolak bila masih dipakai rekaman kegiatan.',
  },
  params: t.Object({ id: t.Numeric() }),
};

// ─── Rekaman Kegiatan Mahasiswa ──────────────────────────────────────────────

export const getKegiatanSkpiSchema = {
  detail: {
    tags: skpiTags,
    summary: 'Daftar Rekaman Kegiatan SKPI',
    description:
      'Daftar rekaman kegiatan. Mahasiswa hanya melihat miliknya; Dosen PA melihat mahasiswa bimbingannya; staf sesuai scope prodi.',
  },
  query: t.Object({
    page: t.Optional(t.Numeric({ default: 1 })),
    limit: t.Optional(t.Numeric({ default: 10 })),
    status: t.Optional(t.String()),
    kategoriId: t.Optional(t.Numeric()),
    mahasiswaId: t.Optional(t.Numeric()),
    prodiId: t.Optional(t.Numeric()),
    search: t.Optional(t.String()),
  }),
};

export const getKegiatanByIdSkpiSchema = {
  detail: { tags: skpiTags, summary: 'Detail Rekaman Kegiatan SKPI' },
  params: t.Object({ id: t.Numeric() }),
};

export const createKegiatanSkpiSchema = {
  detail: {
    tags: skpiTags,
    summary: 'Input Rekaman Kegiatan SKPI',
    description:
      'Mahasiswa menginput rekaman kegiatannya sendiri (status pending). Staf (admin/prodi/kemahasiswaan) dapat menginput untuk mahasiswa dalam scope-nya via `mahasiswaId`.',
  },
  body: t.Object({
    kategoriKegiatanId: t.Numeric(),
    namaKegiatan: t.String({ minLength: 1, maxLength: 255 }),
    penyelenggara: t.Optional(t.Union([t.String({ maxLength: 255 }), t.Null()])),
    tanggalMulai: t.String({ pattern: datePattern }),
    tanggalSelesai: t.Optional(t.Union([t.String({ pattern: datePattern }), t.Null()])),
    lokasi: t.Optional(t.Union([t.String({ maxLength: 255 }), t.Null()])),
    deskripsi: t.Optional(t.Union([t.String(), t.Null()])),
    nomorSertifikat: t.Optional(t.Union([t.String({ maxLength: 100 }), t.Null()])),
    mahasiswaId: t.Optional(t.Numeric()),
  }),
};

export const updateKegiatanSkpiSchema = {
  detail: {
    tags: skpiTags,
    summary: 'Edit Rekaman Kegiatan SKPI',
    description: 'Hanya rekaman berstatus pending/ditolak yang dapat diedit.',
  },
  params: t.Object({ id: t.Numeric() }),
  body: t.Object({
    kategoriKegiatanId: t.Optional(t.Numeric()),
    namaKegiatan: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
    penyelenggara: t.Optional(t.Union([t.String({ maxLength: 255 }), t.Null()])),
    tanggalMulai: t.Optional(t.String({ pattern: datePattern })),
    tanggalSelesai: t.Optional(t.Union([t.String({ pattern: datePattern }), t.Null()])),
    lokasi: t.Optional(t.Union([t.String({ maxLength: 255 }), t.Null()])),
    deskripsi: t.Optional(t.Union([t.String(), t.Null()])),
    nomorSertifikat: t.Optional(t.Union([t.String({ maxLength: 100 }), t.Null()])),
  }),
};

export const deleteKegiatanSkpiSchema = {
  detail: {
    tags: skpiTags,
    summary: 'Hapus Rekaman Kegiatan SKPI',
    description: 'Pemilik menghapus rekaman pending/ditolak; admin dapat menghapus apa saja.',
  },
  params: t.Object({ id: t.Numeric() }),
};

export const verifyKegiatanSkpiSchema = {
  detail: {
    tags: skpiTags,
    summary: 'Verifikasi Rekaman Kegiatan SKPI',
    description:
      'Dosen PA / Kemahasiswaan / Admin / Prodi / Kaprodi menyetujui atau menolak rekaman. `catatan` wajib diisi saat reject.',
  },
  params: t.Object({ id: t.Numeric() }),
  body: t.Object({
    action: t.Union([t.Literal('approve'), t.Literal('reject')]),
    catatan: t.Optional(t.String({ maxLength: 1000 })),
    poin: t.Optional(t.Numeric({ minimum: 0 })),
  }),
};

export const verifyBulkKegiatanSkpiSchema = {
  detail: {
    tags: skpiTags,
    summary: 'Verifikasi Massal (Approve) Rekaman SKPI',
    description:
      'Menyetujui banyak rekaman `pending` sekaligus (maks 100 id per permintaan). Hanya approve — penolakan tetap per rekaman (catatan wajib). Proses per baris: id bukan pending / di luar otorisasi masuk daftar `failed` tanpa membatalkan baris lain.',
  },
  body: t.Object({
    ids: t.Array(t.Numeric({ minimum: 1 }), { minItems: 1, maxItems: 100 }),
  }),
};

export const importKegiatanSkpiSchema = {
  detail: {
    tags: skpiTags,
    summary: 'Impor Rekaman Kegiatan SKPI (CSV)',
    description:
      'Mengimpor daftar rekaman kegiatan mahasiswa dari file CSV (multipart field `file`) oleh staf-verifier; hasil berstatus pending. Header wajib: `nim`, `nama_kategori`, `nama_kegiatan`, `tanggal_mulai` (opsional: `tanggal_selesai`, `penyelenggara`, `lokasi`, `nomor_sertifikat`, `deskripsi`). Proses per baris dengan error individual.',
  },
  body: t.Object({
    file: t.File(),
  }),
};

export const unverifyKegiatanSkpiSchema = {
  detail: {
    tags: skpiTags,
    summary: 'Batalkan Hasil Verifikasi Rekaman SKPI',
    description:
      'Koreksi pasca-verifikasi: diverifikasi/ditolak → pending (metadata verifikator dihapus). Staf Admin/Prodi/Kaprodi/Kemahasiswaan dalam scope.',
  },
  params: t.Object({ id: t.Numeric() }),
};

export const editHasilVerifikasiSkpiSchema = {
  detail: {
    tags: skpiTags,
    summary: 'Edit Hasil Verifikasi Rekaman SKPI',
    description:
      'Mengubah poin & catatan hasil verifikasi rekaman TERVERIFIKASI tanpa mengubah status. Staf Admin/Prodi/Kaprodi/Kemahasiswaan dalam scope.',
  },
  params: t.Object({ id: t.Numeric() }),
  body: t.Object({
    poin: t.Optional(t.Numeric({ minimum: 0 })),
    catatan: t.Optional(t.String({ maxLength: 1000 })),
  }),
};

// ─── Lampiran Sertifikat ─────────────────────────────────────────────────────

export const listLampiranSkpiSchema = {
  detail: { tags: skpiTags, summary: 'Daftar Lampiran Kegiatan SKPI' },
  params: t.Object({ id: t.Numeric() }),
};

export const uploadLampiranSkpiSchema = {
  detail: {
    tags: skpiTags,
    summary: 'Unggah Lampiran Sertifikat Kegiatan SKPI',
    description: 'Unggah bukti sertifikat (PDF/gambar, maks 5 MB). Menggantikan lampiran lama bila sudah ada.',
  },
  params: t.Object({ id: t.Numeric() }),
  body: t.Object({
    file: t.File(),
    keterangan: t.Optional(t.String({ maxLength: 255 })),
  }),
};

export const lampiranSkpiParamsSchema = {
  detail: { tags: skpiTags, summary: 'Unduh / Hapus Lampiran Kegiatan SKPI' },
  params: t.Object({ id: t.Numeric(), lampiranId: t.Numeric() }),
};

// ─── Dokumen SKPI (TTE / QR) ────────────────────────────────────────────────

export const getDokumenSkpiSchema = {
  detail: {
    tags: skpiTags,
    summary: 'Ringkasan Dokumen SKPI Siap Cetak',
    description:
      'Identitas mahasiswa + daftar kegiatan terverifikasi + syarat penerbitan + status tanda tangan (bila ada). Mahasiswa own / staf scope prodi.',
  },
  params: t.Object({ mhsId: t.Numeric({ minimum: 1 }) }),
};

export const signDokumenSkpiSchema = {
  detail: {
    tags: skpiTags,
    summary: 'Terbitkan Tanda Tangan SKPI (QR Signed-Hash)',
    description:
      'Menandatangani SKPI idempoten (pola TTE KHS). Otorisasi: khusus staf Admin/Prodi/Kaprodi/Kemahasiswaan dalam scope (mahasiswa TIDAK — termasuk pemilik; keputusan produk Tahap berikut). Ditolak bila syarat §4.4 belum terpenuhi.',
  },
  params: t.Object({ mhsId: t.Numeric({ minimum: 1 }) }),
};

export const getPenerbitanSkpiSchema = {
  detail: {
    tags: skpiTags,
    summary: 'Daftar Penerbitan SKPI per Mahasiswa',
    description:
      'Daftar mahasiswa dengan ≥1 rekaman kegiatan (status apa pun) berisi hitung per status, total poin terverifikasi, syarat penerbitan, dan status tanda tangan. Khusus staf-verifier dalam scope prodi. `siapTerbit=true` menyaring hanya mahasiswa yang syaratnya terpenuhi.',
  },
  query: t.Object({
    page: t.Optional(t.Numeric({ default: 1 })),
    limit: t.Optional(t.Numeric({ default: 10 })),
    search: t.Optional(t.String()),
    prodiId: t.Optional(t.Numeric()),
    siapTerbit: t.Optional(t.String()),
  }),
};

export const bulkSignDokumenSkpiSchema = {
  detail: {
    tags: skpiTags,
    summary: 'Terbitkan Tanda Tangan SKPI Massal',
    description:
      'Menandatangani SKPI banyak mahasiswa sekaligus (maks 50 id). Seluruh id wajib dalam scope (403 utuh bila ada di luar lingkup); per mahasiswa syarat §4.4 dienforce — yang gagal masuk daftar `failed` tanpa membatalkan sisanya. Idempoten.',
  },
  body: t.Object({
    mahasiswaIds: t.Array(t.Numeric({ minimum: 1 }), { minItems: 1, maxItems: 50 }),
  }),
};

export const revokeDokumenSkpiSchema = {
  detail: {
    tags: skpiTags,
    summary: 'Cabut Tanda Tangan SKPI',
    description:
      'Mencabut tanda tangan SKPI satu mahasiswa (alasan wajib ≥3 karakter). Khusus staf-verifier dalam scope prodi — jalur khusus SKPI (lebih luas dari jalur TTE generik yang dibatasi admin/kaprodi).',
  },
  params: t.Object({ mhsId: t.Numeric({ minimum: 1 }) }),
  body: t.Object({
    reason: t.String({ minLength: 3, maxLength: 500 }),
  }),
};

export const bulkRevokeDokumenSkpiSchema = {
  detail: {
    tags: skpiTags,
    summary: 'Cabut Tanda Tangan SKPI Massal',
    description:
      'Mencabut tanda tangan SKPI banyak mahasiswa (maks 50 id, alasan wajib ≥3 karakter). Seluruh id wajib dalam scope; mahasiswa belum ditandatangani masuk `failed` per baris. Aman di-re-run.',
  },
  body: t.Object({
    mahasiswaIds: t.Array(t.Numeric({ minimum: 1 }), { minItems: 1, maxItems: 50 }),
    reason: t.String({ minLength: 3, maxLength: 500 }),
  }),
};
