import { beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import {
  bap,
  dosen,
  kelasKuliah,
  ketidakhadiranMahasiswa,
  krs,
  mahasiswa,
  mataKuliah,
  periodeAkademik,
  presensi,
  programStudi,
  users,
} from '../models/schema';
import { KompensasiManualService } from '../services/kompensasi-manual.service';
import { PresensiService } from '../services/presensi.service';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Mahasiswa Cuti: Presensi, Kompensasi & KRS', () => {
  let adminToken: string;
  let mhsCutiToken: string;
  let mhsAktifToken: string;
  let prodiId: number;
  let periodeId = '20251';
  let mhsCutiId: number;
  let mhsAktifId: number;
  let kelasId: number;
  let bapId: number;
  let krsCutiId: number;
  let krsAktifId: number;
  let dosenId: number;

  beforeEach(async () => {
    await clearDatabase();

    adminToken = await getAuthToken('admin@test.com', 'admin');
    mhsCutiToken = await getAuthToken('mhscuti@test.com', 'mahasiswa');
    mhsAktifToken = await getAuthToken('mhsaktif@test.com', 'mahasiswa');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: 'TI', nama: 'Teknik Informatika', jenjang: 'D4' })
      .returning();
    prodiId = prodi.id;

    const [dsn] = await db
      .insert(dosen)
      .values({
        nip: '19990001',
        nama: 'Dosen Pengampu',
        email: 'dosen@test.com',
        programStudiId: prodiId,
        jenisKelamin: 'L',
        nik: '1234567890123499',
        tanggalLahir: '1980-01-01',
      })
      .returning();
    dosenId = dsn.id;

    await db.insert(periodeAkademik).values({ id: periodeId, nama: 'Ganjil 2025/2026', aktif: true });

    const [mhsCuti] = await db
      .insert(mahasiswa)
      .values({
        nim: '25001',
        nama: 'Mhs Cuti',
        email: 'mhscuti@test.com',
        programStudiId: prodiId,
        status: 'cuti',
        namaIbuKandung: 'Ibu Cuti',
        nik: '1234567890123401',
        jenisKelamin: 'L',
        tanggalLahir: '2003-01-01',
      })
      .returning();
    mhsCutiId = mhsCuti.id;

    const [mhsAktif] = await db
      .insert(mahasiswa)
      .values({
        nim: '25002',
        nama: 'Mhs Aktif',
        email: 'mhsaktif@test.com',
        programStudiId: prodiId,
        status: 'aktif',
        namaIbuKandung: 'Ibu Aktif',
        nik: '1234567890123402',
        jenisKelamin: 'P',
        tanggalLahir: '2003-01-02',
      })
      .returning();
    mhsAktifId = mhsAktif.id;

    const [mk] = await db
      .insert(mataKuliah)
      .values({ programStudiId: prodiId, kode: `MK_${Date.now()}`, nama: 'Algoritma', sksTotal: 3 })
      .returning();
    const [kelas] = await db.insert(kelasKuliah).values({ mataKuliahId: mk.id, periodeId, namaKelas: 'A' }).returning();
    kelasId = kelas.id;

    const [bapRow] = await db
      .insert(bap)
      .values({
        kelasKuliahId: kelas.id,
        tanggal: '2025-09-01',
        pertemuanKe: 1,
        tema: 'Kontrak',
        materi: 'Pengantar',
        durasiMenit: 100,
        dosenId,
      })
      .returning();
    bapId = bapRow.id;

    const [krsCuti] = await db.insert(krs).values({ mahasiswaId: mhsCutiId, kelasKuliahId: kelasId }).returning();
    krsCutiId = krsCuti.id;
    const [krsAktif] = await db.insert(krs).values({ mahasiswaId: mhsAktifId, kelasKuliahId: kelasId }).returning();
    krsAktifId = krsAktif.id;
  });

  it('PresensiService.saveBulkPresensi melewatkan mahasiswa cuti dan tidak menulis presensi/ketidakhadiran', async () => {
    const result = await PresensiService.saveBulkPresensi(bapId, [
      { mahasiswaId: mhsCutiId, status: 'alpa' },
      { mahasiswaId: mhsAktifId, status: 'alpa' },
    ]);

    expect(result.skippedCuti).toBe(1);

    const presensiRows = await db.select().from(presensi).where(eq(presensi.bapId, bapId));
    expect(presensiRows).toHaveLength(1);
    expect(presensiRows[0].mahasiswaId).toBe(mhsAktifId);

    const cutiAbsence = await db
      .select()
      .from(ketidakhadiranMahasiswa)
      .where(eq(ketidakhadiranMahasiswa.mahasiswaId, mhsCutiId));
    expect(cutiAbsence).toHaveLength(0);
  });

  it('KompensasiManualService.createKompensasi menolak mahasiswa cuti', async () => {
    const [user] = await db.select({ id: users.id }).from(users).limit(1);
    await expect(
      KompensasiManualService.createKompensasi({
        mahasiswaId: mhsCutiId,
        tanggal: '2025-09-01',
        jenisKompen: 'alpa',
        durasiMenit: 100,
        createdBy: user?.id ?? 1,
      }),
    ).rejects.toThrow(/cuti/i);
  });

  it('Mahasiswa (aktif maupun cuti) tidak dapat membatalkan KRS mandiri (403)', async () => {
    const resCuti = await app.handle(
      new Request(`http://localhost/krs/${krsCutiId}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${mhsCutiToken}` },
      }),
    );
    expect(resCuti.status).toBe(403);

    const resAktif = await app.handle(
      new Request(`http://localhost/krs/${krsAktifId}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${mhsAktifToken}` },
      }),
    );
    expect(resAktif.status).toBe(403);
  });

  it('Admin dapat membatalkan KRS mahasiswa cuti massal via POST /krs/batal-cuti', async () => {
    const res = await app.handle(
      new Request('http://localhost/krs/batal-cuti', {
        method: 'POST',
        headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ periodeId }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deletedCount).toBe(1);

    const cutiRows = await db.select().from(krs).where(eq(krs.id, krsCutiId));
    expect(cutiRows).toHaveLength(0);
    // KRS mahasiswa aktif tetap ada.
    const aktifRows = await db.select().from(krs).where(eq(krs.id, krsAktifId));
    expect(aktifRows).toHaveLength(1);
  });
});
