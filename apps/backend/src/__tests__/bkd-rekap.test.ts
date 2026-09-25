import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import {
  bap,
  bapPraktikum,
  dosen,
  dosenPengajarKelas,
  kelasKuliah,
  mahasiswa,
  mataKuliah,
  periodeAkademik,
  presensi,
  presensiPraktikum,
  programStudi,
  rombelPraktikum,
  rombelPraktikumMahasiswa,
} from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('BKD Rekap', () => {
  let adminToken: string;
  let dosenToken: string;
  let dosenId: number;
  let mhsId: number;
  let kelasId: number;
  const periodeId = '20251';

  beforeEach(async () => {
    await clearDatabase();

    adminToken = await getAuthToken('admin_bkd@test.com', 'admin');
    dosenToken = await getAuthToken('dosen_bkd@test.com', 'dosen');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: `BKD_${Date.now()}`, nama: 'Teknik Mesin', jenjang: 'D4' })
      .returning();

    const [dosenRow] = await db
      .insert(dosen)
      .values({
        nip: `NIP_${Date.now()}`,
        nama: 'Dosen BKD',
        email: 'dosen_bkd@test.com',
        programStudiId: prodi.id,
        nidn: `NIDN_${Date.now()}`,
      })
      .returning();
    dosenId = dosenRow.id;

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20250099',
        nama: 'Mahasiswa BKD',
        email: 'mhs_bkd@test.com',
        programStudiId: prodi.id,
        status: 'aktif',
        namaIbuKandung: 'Ibu BKD',
        nik: '1234567890123599',
        jenisKelamin: 'L',
        tanggalLahir: '2003-01-01',
      })
      .returning();
    mhsId = mhs.id;

    await db.insert(periodeAkademik).values({ id: periodeId, nama: 'Ganjil 2025/2026', aktif: true });

    const [mk] = await db
      .insert(mataKuliah)
      .values({ programStudiId: prodi.id, kode: `MKB_${Date.now()}`, nama: 'Matematika', sksTotal: 3 })
      .returning();
    const [kelas] = await db.insert(kelasKuliah).values({ mataKuliahId: mk.id, periodeId, namaKelas: 'A' }).returning();
    kelasId = kelas.id;
    await db.insert(dosenPengajarKelas).values({ dosenId, kelasKuliahId: kelas.id, sksBebanMengajar: 3 });

    const [bapRow] = await db
      .insert(bap)
      .values({
        kelasKuliahId: kelas.id,
        tanggal: '2025-09-01',
        pertemuanKe: 1,
        tema: 'Kontrak Kuliah',
        materi: 'Pengantar',
        catatan: 'Sesi pertama',
        durasiMenit: 100,
        dosenId,
      })
      .returning();
    await db.insert(presensi).values({ bapId: bapRow.id, mahasiswaId: mhsId, status: 'hadir', durasiMangkir: 0 });

    // Data praktikum: rombel dengan instruktur = dosen + BAP + presensi praktikum.
    const [rombel] = await db
      .insert(rombelPraktikum)
      .values({ kelasKuliahId: kelas.id, namaGroup: 'Prak-A', instrukturId: dosenId })
      .returning();
    await db.insert(rombelPraktikumMahasiswa).values({ rombelPraktikumId: rombel.id, mahasiswaId: mhsId });

    const [bapPrakRow] = await db
      .insert(bapPraktikum)
      .values({
        rombelPraktikumId: rombel.id,
        tanggal: '2025-09-03',
        sesiKe: 1,
        materi: 'Praktik Pengantar',
        durasiMenit: 100,
        instrukturId: dosenId,
      })
      .returning();
    await db.insert(presensiPraktikum).values({ bapPraktikumId: bapPrakRow.id, mahasiswaId: mhsId, status: 'hadir' });
  });

  it('BKD rekap: admin bisa filter dosenId manapun', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bkd/rekap?dosenId=${dosenId}&periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        mengajar: unknown[];
        ringkasan: { totalSks: number };
      };
    };
    expect(body.data.mengajar).toHaveLength(1);
    expect(body.data.ringkasan.totalSks).toBe(3);
  });

  it('BKD rekap: pertemuan membawa detail BAP & rekap presensi agregat per mahasiswa', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bkd/rekap?dosenId=${dosenId}&periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        mengajar: {
          kelasId: number;
          pertemuan: {
            bapId: number;
            tema: string | null;
            catatan: string | null;
            presensiRingkasan: { hadir: number; total: number };
          }[];
        }[];
        rekapPresensi: {
          kelasId: number;
          mahasiswa: { nim: string; nama: string; hadir: number; totalKehadiran: number; persentaseHadir: number }[];
        }[];
      };
    };

    const kelas = body.data.mengajar[0];
    expect(kelas.pertemuan).toHaveLength(1);
    expect(kelas.pertemuan[0]).toMatchObject({
      tema: 'Kontrak Kuliah',
      catatan: 'Sesi pertama',
      presensiRingkasan: { hadir: 1, total: 1 },
    });
    expect(kelas.pertemuan[0].bapId).toBeGreaterThan(0);

    const rekap = body.data.rekapPresensi[0];
    expect(rekap.mahasiswa).toHaveLength(1);
    expect(rekap.mahasiswa[0]).toMatchObject({
      nim: '20250099',
      nama: 'Mahasiswa BKD',
      hadir: 1,
      totalKehadiran: 1,
      persentaseHadir: 100,
    });
  });

  it('BKD rekap: dosen dipaksa self dan tetap berhasil', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bkd/rekap?periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { ringkasan: { totalSks: number } } };
    expect(body.data.ringkasan.totalSks).toBe(3);
  });

  it('BKD rekap: dosen mengabaikan dosenId query orang lain (self-only)', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bkd/rekap?dosenId=999999&periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { ringkasan: { totalSks: number } } };
    expect(body.data.ringkasan.totalSks).toBe(3);
  });

  it('BKD rekap: dosen dengan dosenId=0 (placeholder) tetap memuat data sendiri', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bkd/rekap?dosenId=0&periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { ringkasan: { totalSks: number } } };
    expect(body.data.ringkasan.totalSks).toBe(3);
  });

  it('BKD rekap: prodi bisa mereview laporan dosen manapun', async () => {
    const prodiToken = await getAuthToken('prodi_bkd@test.com', 'prodi');
    const res = await app.handle(
      new Request(`http://localhost/bkd/rekap?dosenId=${dosenId}&periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${prodiToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { ringkasan: { totalSks: number } } };
    expect(body.data.ringkasan.totalSks).toBe(3);
  });

  it('BKD rekap: non-dosen tanpa dosenId ditolak (400)', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bkd/rekap?periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('BKD rekap: periode wajib (422 bila kosong dari schema)', async () => {
    const res = await app.handle(
      new Request('http://localhost/bkd/rekap', {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(422);
  });

  it('BKD rekap: mahasiswa ditolak (403)', async () => {
    const mhsToken = await getAuthToken('mhs_bkd@test.com', 'mahasiswa');
    const res = await app.handle(
      new Request(`http://localhost/bkd/rekap?periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(res.status).toBe(403);
  });

  it('BKD rekap: rekap praktikum (instruktur rombel) membawa rombel, riwayat BAP & presensi', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bkd/rekap?dosenId=${dosenId}&periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        mengajarPraktikum: {
          rombelId: number;
          namaGroup: string;
          jumlahPertemuan: number;
          totalMenit: number;
          pertemuan: {
            bapId: number;
            sesiKe: number;
            tanggal: string;
            materi: string;
            presensiRingkasan: { hadir: number; total: number };
          }[];
          presensi: { hadir: number; persen: number };
        }[];
        rekapPresensiPraktikum: {
          rombelId: number;
          jumlahPertemuan: number;
          mahasiswa: { nim: string; nama: string; hadir: number; totalKehadiran: number; persentaseHadir: number }[];
        }[];
        ringkasan: {
          totalRombelPraktikum: number;
          totalPertemuanPraktikum: number;
          totalMenitPraktikum: number;
          grandPertemuan: number;
          grandMenit: number;
        };
      };
    };

    expect(body.data.mengajarPraktikum).toHaveLength(1);
    const rombel = body.data.mengajarPraktikum[0];
    expect(rombel.namaGroup).toBe('Prak-A');
    expect(rombel.jumlahPertemuan).toBe(1);
    expect(rombel.totalMenit).toBe(100);
    expect(rombel.pertemuan[0]).toMatchObject({
      sesiKe: 1,
      tanggal: '2025-09-03',
      materi: 'Praktik Pengantar',
      presensiRingkasan: { hadir: 1, total: 1 },
    });
    expect(rombel.presensi.persen).toBe(100);

    const rekap = body.data.rekapPresensiPraktikum[0];
    expect(rekap.mahasiswa).toHaveLength(1);
    expect(rekap.mahasiswa[0]).toMatchObject({
      nim: '20250099',
      nama: 'Mahasiswa BKD',
      hadir: 1,
      totalKehadiran: 1,
      persentaseHadir: 100,
    });

    expect(body.data.ringkasan).toMatchObject({
      totalRombelPraktikum: 1,
      totalPertemuanPraktikum: 1,
      totalMenitPraktikum: 100,
      grandPertemuan: 2,
      grandMenit: 200,
    });
  });

  it('BKD rekap: dosen pengisi BAP (bukan instruktur rombel) tetap masuk rekap praktikum', async () => {
    const [dosenLain] = await db
      .insert(dosen)
      .values({
        nip: `NIPL_${Date.now()}`,
        nama: 'Dosen Pengisi',
        email: `pengisi_${Date.now()}@test.com`,
        programStudiId: (await db.query.programStudi.findFirst())?.id,
        nidn: `NIDNL_${Date.now()}`,
      })
      .returning();

    // Rombel milik dosen lain, tapi sesi diisi dosenLain.
    const [mkPrak] = await db
      .insert(mataKuliah)
      .values({
        programStudiId: (await db.query.programStudi.findFirst())?.id,
        kode: `MKP_${Date.now()}`,
        nama: 'Praktikum Lab',
        sksTotal: 1,
      })
      .returning();
    const [kelasPrak] = await db
      .insert(kelasKuliah)
      .values({ mataKuliahId: mkPrak.id, periodeId, namaKelas: 'B' })
      .returning();
    const [rombelLain] = await db
      .insert(rombelPraktikum)
      .values({ kelasKuliahId: kelasPrak.id, namaGroup: 'Prak-B', instrukturId: dosenId })
      .returning();
    await db.insert(rombelPraktikumMahasiswa).values({ rombelPraktikumId: rombelLain.id, mahasiswaId: mhsId });
    await db
      .insert(bapPraktikum)
      .values({
        rombelPraktikumId: rombelLain.id,
        tanggal: '2025-09-04',
        sesiKe: 1,
        materi: 'Praktik Diisi Lain',
        durasiMenit: 100,
        instrukturId: dosenLain.id,
      })
      .returning();

    const res = await app.handle(
      new Request(`http://localhost/bkd/rekap?dosenId=${dosenLain.id}&periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { mengajarPraktikum: { namaGroup: string; jumlahPertemuan: number }[] };
    };
    expect(body.data.mengajarPraktikum).toHaveLength(1);
    expect(body.data.mengajarPraktikum[0]).toMatchObject({ namaGroup: 'Prak-B', jumlahPertemuan: 1 });
  });

  it('BKD rekap: dosen tanpa rombel praktikum mendapat list praktikum kosong', async () => {
    const [dosenTanpa] = await db
      .insert(dosen)
      .values({
        nip: `NIPT_${Date.now()}`,
        nama: 'Dosen Tanpa Praktikum',
        email: `tanpa_${Date.now()}@test.com`,
        programStudiId: (await db.query.programStudi.findFirst())?.id,
        nidn: `NIDNT_${Date.now()}`,
      })
      .returning();

    const res = await app.handle(
      new Request(`http://localhost/bkd/rekap?dosenId=${dosenTanpa.id}&periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { mengajarPraktikum: unknown[]; rekapPresensiPraktikum: unknown[] } };
    expect(body.data.mengajarPraktikum).toHaveLength(0);
    expect(body.data.rekapPresensiPraktikum).toHaveLength(0);
  });

  it('BKD rekap: baris BAP hasil sync [Praktikum] tidak dihitung ganda di seksi teori', async () => {
    // Simulasi syncPresensiPraktikumToKelas: baris di kelas induk dengan prefix [Praktikum].
    const [bapSync] = await db
      .insert(bap)
      .values({
        kelasKuliahId: kelasId,
        tanggal: '2025-09-03',
        pertemuanKe: 2,
        materi: '[Praktikum] Praktik Pengantar',
        durasiMenit: 100,
        dosenId,
      })
      .returning();
    await db.insert(presensi).values({ bapId: bapSync.id, mahasiswaId: mhsId, status: 'hadir', durasiMangkir: 0 });

    const res = await app.handle(
      new Request(`http://localhost/bkd/rekap?dosenId=${dosenId}&periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        mengajar: { jumlahPertemuan: number; totalMenit: number; presensi: { hadir: number } }[];
        mengajarPraktikum: { jumlahPertemuan: number }[];
        rekapPresensi: { mahasiswa: { hadir: number; persentaseHadir: number }[] }[];
        ringkasan: {
          totalPertemuan: number;
          totalMenit: number;
          totalPertemuanPraktikum: number;
          grandPertemuan: number;
          grandMenit: number;
        };
      };
    };

    // Teori: hanya BAP asli (2025-09-01) — baris sync [Praktikum] dikeluarkan.
    expect(body.data.mengajar[0].jumlahPertemuan).toBe(1);
    expect(body.data.mengajar[0].totalMenit).toBe(100);
    expect(body.data.mengajar[0].presensi.hadir).toBe(1);
    expect(body.data.rekapPresensi[0].mahasiswa[0].hadir).toBe(1);
    expect(body.data.rekapPresensi[0].mahasiswa[0].persentaseHadir).toBe(100);

    // Praktikum tetap terhitung persis sekali, grand total tidak ganda.
    expect(body.data.mengajarPraktikum[0].jumlahPertemuan).toBe(1);
    expect(body.data.ringkasan).toMatchObject({
      totalPertemuan: 1,
      totalPertemuanPraktikum: 1,
      grandPertemuan: 2,
      grandMenit: 200,
    });
  });
});
