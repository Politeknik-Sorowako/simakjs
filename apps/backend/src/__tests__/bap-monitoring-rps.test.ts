import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { dosen, kelasKuliah, mataKuliah, periodeAkademik, programStudi } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('BAP Monitoring RPS API', () => {
  let adminToken: string;
  let prodiId: number;
  let mkId: number;
  let kelasId: number;
  const periodeId = '20231';

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin@test.com', 'admin');

    const [prodi] = await db
      .insert(programStudi)
      .values({
        kode: 'TRPL',
        nama: 'Teknologi Rekayasa Perangkat Lunak',
        jenjang: 'D4',
      })
      .returning();
    prodiId = prodi.id;

    const [dsn] = await db
      .insert(dosen)
      .values({
        nip: '199001012020011003',
        nama: 'Dosen Pengampu 1',
        email: 'dosen1@test.com',
        programStudiId: prodiId,
      })
      .returning();

    const [mk] = await db
      .insert(mataKuliah)
      .values({
        kode: 'RPL101',
        nama: 'Pemrograman Web',
        sksTotal: 3,
        programStudiId: prodiId,
      })
      .returning();
    mkId = mk.id;

    await db.insert(periodeAkademik).values({
      id: periodeId,
      nama: 'Ganjil 2023/2024',
      aktif: true,
    });

    const [kelas] = await db
      .insert(kelasKuliah)
      .values({
        mataKuliahId: mkId,
        periodeId: periodeId,
        namaKelas: 'TRPL-1A',
        sks: 3,
      })
      .returning();
    kelasId = kelas.id;
  });

  it('admin harus sukses mengambil data monitoring RPS tanpa error 500', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bap/monitoring-rps?periodeId=${periodeId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toBeArray();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].kelasKuliahId).toBe(kelasId);
    expect(data[0].namaKelas).toBe('TRPL-1A');
  });

  it('admin harus sukses mengambil detail monitoring RPS untuk kelas tertentu', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bap/monitoring-rps/kelas/${kelasId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.kelasKuliahId).toBe(kelasId);
    expect(data.matrix).toBeArray();
  });
});
