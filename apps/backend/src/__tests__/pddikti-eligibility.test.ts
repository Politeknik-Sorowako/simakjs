import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import {
  bap,
  bimbingan,
  cpmk,
  dosen,
  dosenPengajarKelas,
  kelasKuliah,
  krs,
  mahasiswa,
  mataKuliah,
  periodeAkademik,
  presensi,
  programStudi,
} from '../models/schema';
import { FeederService } from '../services/feeder.service';
import { FeederPullService } from '../services/feeder-pull.service';
import { SystemParameterService } from '../services/system-parameter.service';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('PDDIKTI Feeder & Exam Eligibility API', () => {
  let adminToken: string;
  let dosenToken: string;
  let mhsToken: string;

  let prodiId: number;
  let mhsId: number;
  const periodeId = '20231';
  let mkId: number;
  let kelasId: number;
  let krsId: number;
  let dosenId: number;
  let cpmkId: number;

  afterEach(() => {
    FeederService.setTestTransport(null);
    FeederService.clearTokenCache();
    SystemParameterService.clearCache();
  });

  beforeEach(async () => {
    await clearDatabase();

    adminToken = await getAuthToken('admin@test.com', 'admin');
    dosenToken = await getAuthToken('dosen@test.com', 'dosen');
    mhsToken = await getAuthToken('mhs@test.com', 'mahasiswa');

    // 1. Seed Prodi
    const [prodi] = await db
      .insert(programStudi)
      .values({
        kode: 'TI',
        nama: 'Teknik Informatika',
        jenjang: 'D4',
      })
      .returning();
    prodiId = prodi.id;

    // Seed Dosen
    const [dsn] = await db
      .insert(dosen)
      .values({
        nidn: '12345678',
        nip: '123456789012345678',
        nama: 'Dosen Test',
        email: 'dosen@test.com',
        programStudiId: prodiId,
      })
      .returning();
    dosenId = dsn.id;

    // 2. Seed Mahasiswa
    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20200001',
        nama: 'Mahasiswa Test',
        email: 'mhs@test.com',
        programStudiId: prodiId,
        status: 'aktif',
        namaIbuKandung: 'Ibu Test',
        nik: '1234567890123456',
        jenisKelamin: 'L',
        tanggalLahir: '2000-01-01',
      })
      .returning();
    mhsId = mhs.id;

    // 3. Seed Active Periode
    await db.insert(periodeAkademik).values({
      id: periodeId,
      nama: 'Ganjil 2023/2024',
      aktif: true,
    });

    // 4. Seed Mata Kuliah
    const [mk] = await db
      .insert(mataKuliah)
      .values({
        kode: 'IF101',
        nama: 'Pemrograman Dasar',
        sksTotal: 3,
        sksTeori: 2,
        sksPraktik: 1,
        semester: 1,
        programStudiId: prodiId,
      })
      .returning();
    mkId = mk.id;

    // Seed CPMK
    const [c] = await db
      .insert(cpmk)
      .values({
        mataKuliahId: mkId,
        kode: 'CPMK-1',
        deskripsi: 'Mampu menjelaskan konsep dasar pemrograman',
      })
      .returning();
    cpmkId = c.id;

    // 5. Seed Kelas
    const [kelas] = await db
      .insert(kelasKuliah)
      .values({
        mataKuliahId: mkId,
        periodeId: periodeId,
        namaKelas: 'A',
      })
      .returning();
    kelasId = kelas.id;

    await db.insert(dosenPengajarKelas).values({
      dosenId,
      kelasKuliahId: kelasId,
      rencanaTatapMuka: 16,
      realisasiTatapMuka: 0,
      jenisEvaluasi: 'UTS',
    });

    // 6. Seed KRS
    const [k] = await db
      .insert(krs)
      .values({
        mahasiswaId: mhsId,
        kelasKuliahId: kelasId,
        isApproved: true,
      })
      .returning();
    krsId = k.id;
  });

  describe('Exam Eligibility Checks', () => {
    it('should show student as NOT eligible if bimbingan and attendance are not met', async () => {
      const response = await app.handle(
        new Request(`http://localhost/khs/mahasiswa/${mhsId}/periode/${periodeId}/eligibility`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${mhsToken}` },
        }),
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.overallEligible).toBe(false);
      expect(data.bimbingan.eligible).toBe(false);
    });

    it('should show student as eligible if bimbingan is approved and attendance is >= 80%', async () => {
      // 1. Seed approved bimbingan
      await db.insert(bimbingan).values({
        mahasiswaId: mhsId,
        periodeId: periodeId,
        isApproved: true,
      });

      // 2. Seed meetings & attendance
      const [meeting] = await db
        .insert(bap)
        .values({
          kelasKuliahId: kelasId,
          pertemuanKe: 1,
          materi: 'Introduction',
          tanggal: '2023-09-01',
          durasiMenit: 100,
          cpmkId: cpmkId,
          dosenId: dosenId,
        })
        .returning();

      await db.insert(presensi).values({
        bapId: meeting.id,
        mahasiswaId: mhsId,
        status: 'hadir',
        durasiMangkir: 0,
      });

      const response = await app.handle(
        new Request(`http://localhost/khs/mahasiswa/${mhsId}/periode/${periodeId}/eligibility`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${mhsToken}` },
        }),
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.overallEligible).toBe(true);
      expect(data.bimbingan.eligible).toBe(true);
      expect(data.classes[0].attendanceRate).toBe(100);
    });
  });

  describe('Grade Locking Process', () => {
    it('should lock grade and reject future inputs', async () => {
      // 1. Lock the class
      const lockRes = await app.handle(
        new Request(`http://localhost/yudisium/kelas/${kelasId}/lock`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${dosenToken}` },
        }),
      );
      expect(lockRes.status).toBe(200);

      // 2. Try to save components
      const compRes = await app.handle(
        new Request(`http://localhost/yudisium/kelas/komponen`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${dosenToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            kelasKuliahId: kelasId,
            komponenList: [{ nama: 'Tugas', bobot: 100 }],
          }),
        }),
      );
      expect(compRes.status).toBe(400);
      const compData = await compRes.json();
      expect(compData.error).toContain('dikunci');
    });
  });

  describe('Feeder Configuration (PDDIKTI)', () => {
    const getParams = async (token: string) => {
      const res = await app.handle(
        new Request('http://localhost/system/parameters', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: Array<Record<string, unknown>> };
      return body.data;
    };

    const putParam = (token: string, key: string, value: string) =>
      app.handle(
        new Request(`http://localhost/system/parameters/${key}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ value }),
        }),
      );

    it('masks FEEDER_PASSWORD, keeps it on empty update, and validates values', async () => {
      // Defaults terisi otomatis (tanpa migrasi manual).
      const initial = await getParams(adminToken);
      const url0 = initial.find((p) => p.key === 'FEEDER_URL');
      const user0 = initial.find((p) => p.key === 'FEEDER_USERNAME');
      const pw0 = initial.find((p) => p.key === 'FEEDER_PASSWORD');
      expect(url0?.value).toBe('https://feeder.politekniksorowako.ac.id/ws/live2.php');
      expect(user0?.value).toBe('darmawaty@politekniksorowako.ac.id');
      expect(pw0?.value).toBe('');
      expect(pw0?.hasValue).toBe(false);

      // Set password → respons tidak membocorkan nilainya.
      const setRes = await putParam(adminToken, 'FEEDER_PASSWORD', 'rahasia123');
      expect(setRes.status).toBe(200);
      expect(((await setRes.json()) as { value: string }).value).toBe('');

      const afterSet = await getParams(adminToken);
      const pw1 = afterSet.find((p) => p.key === 'FEEDER_PASSWORD');
      expect(pw1?.value).toBe('');
      expect(pw1?.masked).toBe(true);
      expect(pw1?.hasValue).toBe(true);

      // Update password dengan nilai kosong = pertahankan password lama.
      const keepRes = await putParam(adminToken, 'FEEDER_PASSWORD', '');
      expect(keepRes.status).toBe(200);
      const afterKeep = await getParams(adminToken);
      expect(afterKeep.find((p) => p.key === 'FEEDER_PASSWORD')?.hasValue).toBe(true);

      // Validasi rentang & format.
      expect((await putParam(adminToken, 'FEEDER_URL', 'bukan-url')).status).toBe(400);
      expect((await putParam(adminToken, 'FEEDER_TIMEOUT_MS', '1000')).status).toBe(400);
      expect((await putParam(adminToken, 'FEEDER_PAGE_SIZE', '1000')).status).toBe(400);
      expect((await putParam(adminToken, 'FEEDER_TIMEOUT_MS', '30000')).status).toBe(200);
      expect((await putParam(adminToken, 'FEEDER_URL', 'https://feeder.example.ac.id/ws/live2.php')).status).toBe(200);
    });

    it('legacy GET /settings masks FEEDER_PASSWORD too', async () => {
      // Regresi: /settings lama mengembalikan seluruh baris system_settings ke role
      // non-admin (mis. prodi) — parameter rahasia wajib tetap termasking di sana.
      expect((await putParam(adminToken, 'FEEDER_PASSWORD', 'rahasia123')).status).toBe(200);

      const res = await app.handle(
        new Request('http://localhost/settings', {
          method: 'GET',
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: Array<{ key: string; value: string | null }> };
      const pw = body.data.find((s) => s.key === 'FEEDER_PASSWORD');
      expect(pw).toBeDefined();
      expect(pw?.value).toBe('');
    });

    it('rejects test-connection for non-admin users', async () => {
      const res = await app.handle(
        new Request('http://localhost/pddikti/test-connection', {
          method: 'POST',
          headers: { Authorization: `Bearer ${mhsToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
      );
      expect(res.status).toBe(403);
    });

    it('enforces FEEDER_WRITE_GUARD (ON by default) and blocks non-Get actions before network', async () => {
      const cfgDefault = await SystemParameterService.getFeederConfig();
      expect(cfgDefault.writeGuard).toBe(true);

      // Validasi nilai parameter FEEDER_WRITE_GUARD via API
      expect((await putParam(adminToken, 'FEEDER_WRITE_GUARD', 'bukan-bool')).status).toBe(400);
      expect((await putParam(adminToken, 'FEEDER_WRITE_GUARD', 'true')).status).toBe(200);

      let transportCalled = false;
      FeederService.setTestTransport(async (_cfg, body) => {
        transportCalled = true;
        if (body.act === 'GetToken') return { error_code: 0, data: { token: 'tok-test' } };
        return { error_code: 0, data: { id: 'ok' } };
      });

      const cfgOn = {
        ...cfgDefault,
        url: 'https://feeder.local.test/ws/live2.php',
        username: 'u',
        password: 'p',
        writeGuard: true,
      };

      // request() menolak aksi tulis maupun GetToken langsung tanpa memanggil transport
      await expect(FeederService.request(cfgOn, 'InsertBiodataMahasiswa')).rejects.toThrow(
        /hanya mengizinkan operasi baca/,
      );
      await expect(FeederService.request(cfgOn, 'UpdateMahasiswa')).rejects.toThrow(/hanya mengizinkan operasi baca/);
      await expect(FeederService.request(cfgOn, 'DeleteMahasiswa')).rejects.toThrow(/hanya mengizinkan operasi baca/);
      await expect(FeederService.request(cfgOn, 'GetToken')).rejects.toThrow(/hanya mengizinkan operasi baca/);
      expect(transportCalled).toBe(false);

      // mutate() diblokir saat writeGuard ON
      await expect(FeederService.mutate(cfgOn, 'InsertBiodataMahasiswa', { record: {} })).rejects.toThrow(
        /FEEDER_WRITE_GUARD aktif/,
      );
      expect(transportCalled).toBe(false);

      // Saat writeGuard dimatikan (OFF), mutate() tetap menolak act baca tetapi mengizinkan Insert*
      expect((await putParam(adminToken, 'FEEDER_WRITE_GUARD', 'false')).status).toBe(200);
      const cfgOff = await SystemParameterService.getFeederConfig();
      expect(cfgOff.writeGuard).toBe(false);

      await expect(FeederService.mutate({ ...cfgOn, writeGuard: false }, 'GetProfilPT')).rejects.toThrow(
        /hanya Insert\*\/Update\*\/Delete\*/,
      );

      const mutRes = await FeederService.mutate<{ id: string }>(
        { ...cfgOn, writeGuard: false },
        'InsertBiodataMahasiswa',
        { record: { nama_mahasiswa: 'Tes' } },
      );
      expect(mutRes.id).toBe('ok');
      expect(transportCalled).toBe(true);
    });
  });

  describe('Feeder Pull (Preview & Apply Read-Only)', () => {
    it('previews and applies Referensi (semester, prodi) and Master (matkul, dosen, mahasiswa) via mock transport', async () => {
      // Siapkan kredensial dummy lokal + pasang mock transport (tanpa koneksi ke Feeder asli)
      await app.handle(
        new Request('http://localhost/system/parameters/FEEDER_PASSWORD', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: 'dummy-secret' }),
        }),
      );

      const calledActs: string[] = [];
      FeederService.setTestTransport(async (_cfg, body) => {
        const act = String(body.act);
        calledActs.push(act);
        if (act === 'GetToken') {
          return { error_code: 0, data: { token: 'mock-token-123' } };
        }
        if (act === 'GetSemester') {
          return {
            error_code: 0,
            data: [
              { id_semester: '20231', nama_semester: '2023/2024 Ganjil (Feeder)' },
              { id_semester: '20241', nama_semester: '2024/2025 Ganjil' },
            ],
          };
        }
        if (act === 'GetProdi') {
          return {
            error_code: 0,
            data: [
              {
                id_prodi: 'uuid-prodi-ti',
                kode_program_studi: 'TI',
                nama_program_studi: 'Teknik Informatika',
                nama_jenjang_pendidikan: 'D4',
              },
              {
                id_prodi: 'uuid-prodi-tm',
                kode_program_studi: 'TM',
                nama_program_studi: 'Teknik Mesin',
                nama_jenjang_pendidikan: 'D3',
              },
            ],
          };
        }
        if (act === 'GetListMataKuliah') {
          return {
            error_code: 0,
            data: [
              {
                id_matkul: 'uuid-mk-001',
                id_prodi: 'uuid-prodi-ti',
                kode_mata_kuliah: 'IF101',
                nama_mata_kuliah: 'Algoritma Pemrograman',
                sks_mata_kuliah: 3,
                sks_tatap_muka: 2,
                sks_praktek: 1,
              },
              {
                id_matkul: 'uuid-mk-002',
                id_prodi: 'uuid-prodi-ti',
                kode_mata_kuliah: 'IF102',
                nama_mata_kuliah: 'Struktur Data Lanjut',
                sks_mata_kuliah: 4,
                sks_tatap_muka: 3,
                sks_praktek: 1,
              },
            ],
          };
        }
        if (act === 'GetListDosen') {
          return {
            error_code: 0,
            data: [
              {
                id_dosen: 'uuid-dosen-1',
                nidn: '12345678',
                nip: '123456789012345678',
                nama_dosen: 'Dosen Test',
                jenis_kelamin: 'L',
                tanggal_lahir: '15-08-1985',
                id_agama: 1,
              },
              {
                id_dosen: 'uuid-dosen-2',
                nidn: '87654321',
                nip: '876543210987654321',
                nama_dosen: 'Dosen Baru Feeder',
                jenis_kelamin: 'P',
                tanggal_lahir: '1990-02-20',
                id_agama: 1,
              },
            ],
          };
        }
        if (act === 'GetListMahasiswa') {
          return {
            error_code: 0,
            data: [
              {
                id_mahasiswa: 'uuid-mhs-1',
                nim: '20200001',
                nama_mahasiswa: 'Mahasiswa Test',
                id_prodi: 'uuid-prodi-ti',
                id_periode: '20231',
                jenis_kelamin: 'L',
                tanggal_lahir: '2000-01-01',
              },
              {
                id_mahasiswa: 'uuid-mhs-2',
                nim: '54321',
                nama_mahasiswa: 'Mhs Baru Feeder',
                id_prodi: 'uuid-prodi-ti',
                id_periode: '20241',
                jenis_kelamin: 'P',
                tanggal_lahir: '12-11-2005',
              },
            ],
          };
        }
        return { error_code: 0, data: [] };
      });

      // 1. Katalog entitas pull
      const catRes = await app.handle(
        new Request('http://localhost/pddikti/pull/entities', {
          method: 'GET',
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );
      expect(catRes.status).toBe(200);
      const catBody = (await catRes.json()) as { writeGuard: boolean; entities: Array<{ key: string }> };
      expect(catBody.writeGuard).toBe(true);
      expect(catBody.entities.map((e) => e.key)).toEqual([
        'semester',
        'prodi',
        'matkul',
        'dosen',
        'mahasiswa',
        'kelas',
        'krs-nilai',
        'dosen-pengajar',
        'transkrip',
        'aktivitas-mahasiswa',
        'anggota-aktivitas',
        'pembimbing-aktivitas',
        'konversi-aktivitas',
      ]);

      // 2. Preview & Apply Semester (20231 konflik nama, 20241 baru)
      const semPrevRes = await app.handle(
        new Request('http://localhost/pddikti/pull/preview?entity=semester', {
          method: 'GET',
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );
      expect(semPrevRes.status).toBe(200);
      const semPrev = (await semPrevRes.json()) as {
        summary: { baru: number; konflik: number };
      };
      expect(semPrev.summary.baru).toBe(1);
      expect(semPrev.summary.konflik).toBe(1);

      // Apply semester dengan conflictResolution = 'feeder'
      const semApplyRes = await app.handle(
        new Request('http://localhost/pddikti/pull/apply', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: 'semester',
            feederIds: ['20231', '20241'],
            conflictResolution: 'feeder',
          }),
        }),
      );
      expect(semApplyRes.status).toBe(200);
      const semApply = (await semApplyRes.json()) as { inserted: number; updated: number };
      expect(semApply.inserted).toBe(1);
      expect(semApply.updated).toBe(1);

      const [sem20231] = await db.select().from(periodeAkademik).where(eq(periodeAkademik.id, '20231'));
      expect(sem20231.idPddikti).toBe('20231');
      expect(sem20231.nama).toBe('2023/2024 Ganjil (Feeder)');

      // 3. Preview & Apply Prodi (TI -> link_id, TM -> baru)
      const prodiApplyRes = await app.handle(
        new Request('http://localhost/pddikti/pull/apply', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: 'prodi',
            feederIds: ['uuid-prodi-ti', 'uuid-prodi-tm'],
          }),
        }),
      );
      expect(prodiApplyRes.status).toBe(200);
      const prodiApply = (await prodiApplyRes.json()) as { inserted: number; linkedOnly: number };
      expect(prodiApply.linkedOnly).toBe(1);
      expect(prodiApply.inserted).toBe(1);

      const [tiRow] = await db.select().from(programStudi).where(eq(programStudi.id, prodiId));
      expect(tiRow.idPddikti).toBe('uuid-prodi-ti');

      // 4. Apply Matkul, Dosen, Mahasiswa
      const mkApplyRes = await app.handle(
        new Request('http://localhost/pddikti/pull/apply', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: 'matkul',
            feederIds: ['uuid-mk-001', 'uuid-mk-002'],
          }),
        }),
      );
      expect(mkApplyRes.status).toBe(200);
      const mkApply = (await mkApplyRes.json()) as { inserted: number; linkedOnly: number };
      expect(mkApply.linkedOnly).toBe(1);
      expect(mkApply.inserted).toBe(1);

      const dsnApplyRes = await app.handle(
        new Request('http://localhost/pddikti/pull/apply', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: 'dosen',
            feederIds: ['uuid-dosen-1', 'uuid-dosen-2'],
          }),
        }),
      );
      expect(dsnApplyRes.status).toBe(200);
      const dsnApply = (await dsnApplyRes.json()) as { inserted: number; linkedOnly: number };
      expect(dsnApply.linkedOnly).toBe(1);
      expect(dsnApply.inserted).toBe(1);

      const [dsn1] = await db.select().from(dosen).where(eq(dosen.id, dosenId));
      expect(dsn1.idPddikti).toBe('uuid-dosen-1');
      expect(dsn1.tanggalLahir).toBe('1985-08-15'); // ternormalisasi dari DD-MM-YYYY

      const mhsApplyRes = await app.handle(
        new Request('http://localhost/pddikti/pull/apply', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: 'mahasiswa',
            feederIds: ['uuid-mhs-1', 'uuid-mhs-2'],
          }),
        }),
      );
      expect(mhsApplyRes.status).toBe(200);
      const mhsApply = (await mhsApplyRes.json()) as { inserted: number; linkedOnly: number };
      expect(mhsApply.linkedOnly).toBe(1);
      expect(mhsApply.inserted).toBe(1);

      // Pastikan seluruh panggilan ke Feeder hanya GetToken & Get*
      expect(calledActs.every((a) => a === 'GetToken' || a.startsWith('Get'))).toBe(true);

      // 5. RBAC: non-admin ditolak saat mencoba applyPull
      const forbiddenRes = await app.handle(
        new Request('http://localhost/pddikti/pull/apply', {
          method: 'POST',
          headers: { Authorization: `Bearer ${dosenToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: 'semester',
            feederIds: ['20241'],
          }),
        }),
      );
      expect(forbiddenRes.status).toBe(403);
    });

    it('dedupes repeated Feeder pages when the server ignores offset', async () => {
      let actCalls = 0;
      const page = Array.from({ length: 50 }, (_, i) => ({
        id_semester: String(20200 + i),
        nama_semester: `Semester ${i}`,
      }));
      FeederService.setTestTransport(async (_cfg, body) => {
        if (body.act === 'GetToken') return { error_code: 0, data: { token: 'tok' } };
        actCalls++;
        // Server selalu mengembalikan halaman penuh yang sama (mengabaikan offset).
        return { error_code: 0, data: page };
      });

      const cfg = {
        ...(await SystemParameterService.getFeederConfig()),
        url: 'https://feeder.local.test/ws/live2.php',
        username: 'u',
        password: 'p',
        writeGuard: true,
        pageSize: 50,
      };
      const rows = await FeederPullService.fetchFeederRows(cfg, 'GetSemester', { maxPages: 4 });
      expect(rows.length).toBe(50);
      expect(actCalls).toBe(2); // halaman kedua seluruhnya duplikat → berhenti
    });

    it('does not mislink a matkul to another prodi that shares the same kode', async () => {
      // Prodi lain (tanpa id PDDIKTI) memiliki MK dengan kode sama; prodi TI tertaut id_prodi Feeder.
      const [prodiB] = await db
        .insert(programStudi)
        .values({ kode: 'TM2', nama: 'Teknik Mesin Baru', jenjang: 'D3' })
        .returning();
      const [mkB] = await db
        .insert(mataKuliah)
        .values({ programStudiId: prodiB.id, kode: 'ZZ999', nama: 'MK Prodi Lain', sksTotal: 2 })
        .returning();
      await db.update(programStudi).set({ idPddikti: 'uuid-prodi-ti' }).where(eq(programStudi.id, prodiId));
      await app.handle(
        new Request('http://localhost/system/parameters/FEEDER_PASSWORD', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: 'dummy-secret' }),
        }),
      );

      FeederService.setTestTransport(async (_cfg, body) => {
        const act = String(body.act);
        if (act === 'GetToken') return { error_code: 0, data: { token: 'tok' } };
        if (act === 'GetListMataKuliah') {
          return {
            error_code: 0,
            data: [
              {
                id_matkul: 'uuid-mk-zz',
                id_prodi: 'uuid-prodi-ti',
                kode_mata_kuliah: 'ZZ999',
                nama_mata_kuliah: 'MK Baru di TI',
                sks_mata_kuliah: 2,
              },
            ],
          };
        }
        return { error_code: 0, data: [] };
      });

      const res = await app.handle(
        new Request('http://localhost/pddikti/pull/apply', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity: 'matkul', feederIds: ['uuid-mk-zz'] }),
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { inserted: number; linkedOnly: number };
      expect(body.inserted).toBe(1); // dibuat baru di prodi TI
      expect(body.linkedOnly).toBe(0); // TIDAK menautkan ke MK prodi lain

      const [mkBAfter] = await db.select().from(mataKuliah).where(eq(mataKuliah.id, mkB.id));
      expect(mkBAfter.idPddikti).toBeNull();
      const [newMk] = await db.select().from(mataKuliah).where(eq(mataKuliah.idPddikti, 'uuid-mk-zz'));
      expect(newMk.programStudiId).toBe(prodiId);
    });

    it('pulls transactional data: kelas kuliah, KRS & nilai, transkrip, aktivitas MBKM', async () => {
      const actsCalled: string[] = [];
      // Prasyarat: semester, prodi, matkul, mahasiswa sudah tertaut ke ID PDDIKTI.
      await app.handle(
        new Request('http://localhost/system/parameters/FEEDER_PASSWORD', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: 'dummy-secret' }),
        }),
      );
      await db.update(periodeAkademik).set({ idPddikti: '20231' }).where(eq(periodeAkademik.id, '20231'));
      await db.update(programStudi).set({ idPddikti: 'uuid-prodi-ti' }).where(eq(programStudi.id, prodiId));
      await db.update(mahasiswa).set({ idPddikti: 'uuid-mhs-lokal' }).where(eq(mahasiswa.id, mhsId));
      await db.update(mataKuliah).set({ idPddikti: 'uuid-mk-lokal' }).where(eq(mataKuliah.id, mkId));

      const [mhsRow] = await db.select({ nim: mahasiswa.nim }).from(mahasiswa).where(eq(mahasiswa.id, mhsId));
      const nimMhs = mhsRow.nim;
      // Simpan satu kelas lokal yang perlu ditautkan (idPddikti belum ada).
      const [kelasLokal] = await db
        .insert(kelasKuliah)
        .values({
          mataKuliahId: mkId,
          periodeId: periodeId,
          namaKelas: 'Kelas Teori A',
          tanggalMulaiEfektif: '2024-02-05',
        })
        .returning();
      // KRS lokal tanpa nilai (menunggu pengisian) dan KRS lokal yang sudah bernilai 70.
      const [krsBaru] = await db
        .insert(krs)
        .values({ mahasiswaId: mhsId, kelasKuliahId: kelasLokal.id, isApproved: false })
        .returning();
      const [kelasNilai] = await db
        .insert(kelasKuliah)
        .values({
          mataKuliahId: mkId,
          periodeId: periodeId,
          namaKelas: 'Kelas Nilai Lama',
          idPddikti: 'uuid-kelas-nilai',
        })
        .returning();
      const [krsKonflik] = await db
        .insert(krs)
        .values({
          mahasiswaId: mhsId,
          kelasKuliahId: kelasNilai.id,
          nilaiAngka: 70,
          nilaiHuruf: 'B-',
          nilaiIndeks: 2.75,
          isApproved: true,
        })
        .returning();

      FeederService.setTestTransport(async (_cfg, body) => {
        const act = String(body.act);
        actsCalled.push(act);
        if (act === 'GetToken') return { error_code: 0, data: { token: 'tok-trans' } };
        if (act === 'GetListKelasKuliah') {
          return {
            error_code: 0,
            data: [
              {
                id_kelas_kuliah: 'uuid-kelas-1',
                id_semester: '20231',
                id_matkul: 'uuid-mk-lokal',
                kode_mata_kuliah: 'IF101',
                nama_kelas: 'Kelas Teori A',
                tanggal_mulai_efektif: '05-02-2024',
                tanggal_akhir_efektif: '2024-06-30',
              },
              {
                id_kelas_kuliah: 'uuid-kelas-2',
                id_semester: '20231',
                id_matkul: 'uuid-mk-lokal',
                kode_mata_kuliah: 'IF101',
                nama_kelas: 'Kelas Teori B',
              },
            ],
          };
        }
        if (act === 'GetRiwayatNilaiMahasiswa') {
          return {
            error_code: 0,
            data: [
              // KRS sudah ada lokal (nilai kosong) → status "isi"
              {
                nim: nimMhs,
                id_kelas_kuliah: 'uuid-kelas-1',
                kode_mata_kuliah: 'IF101',
                id_semester: '20231',
                nilai_angka: 85,
                nilai_huruf: 'A',
                nilai_indeks: 4,
              },
              // Nilai bertentangan dengan lokal (70 → 60) → konflik
              {
                nim: nimMhs,
                id_kelas_kuliah: 'uuid-kelas-nilai',
                kode_mata_kuliah: 'IF101',
                id_semester: '20231',
                nilai_angka: 60,
                nilai_huruf: 'C',
                nilai_indeks: 2,
              },
              // NIM belum ada di aplikasi → tidak dapat diterapkan
              {
                nim: '99999999',
                id_kelas_kuliah: 'uuid-kelas-1',
                kode_mata_kuliah: 'IF101',
                nilai_angka: 90,
              },
            ],
          };
        }
        if (act === 'GetTranskripMahasiswa') {
          return {
            error_code: 0,
            data: [
              { nim: nimMhs, nama_mahasiswa: 'Mahasiswa Test', ipk: 3.45, jumlah_sks_diakui: 96 },
              { nim: '99999999', nama_mahasiswa: 'Mahasiswa Luar', ipk: 3.1, jumlah_sks_diakui: 100 },
            ],
          };
        }
        if (act === 'GetListAktivitasMahasiswa') {
          return {
            error_code: 0,
            data: [
              {
                id_aktivitas: 'uuid-akt-1',
                judul: 'Magang Industri Polos',
                id_jenis_aktivitas: '5',
                id_semester: '20231',
                id_prodi: 'uuid-prodi-ti',
              },
            ],
          };
        }
        return { error_code: 0, data: [] };
      });

      // Kelas bertabrakan dipanggil dengan id_pddikti miliknya sendiri (unik, bukan id kelas baru).
      // 1) Kelas: tautkan kelas lokal + satu kelas baru
      const applyKelas = await app.handle(
        new Request('http://localhost/pddikti/pull/apply', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity: 'kelas', feederIds: ['uuid-kelas-1', 'uuid-kelas-2'] }),
        }),
      );
      expect(applyKelas.status).toBe(200);
      const kelasResult = (await applyKelas.json()) as { linkedOnly: number; inserted: number };
      expect(kelasResult.linkedOnly).toBe(1);
      expect(kelasResult.inserted).toBe(1);

      const [kelasUtama] = await db.select().from(kelasKuliah).where(eq(kelasKuliah.idPddikti, 'uuid-kelas-1'));
      expect(kelasUtama.id).toBe(kelasLokal.id);
      expect(kelasUtama.tanggalMulaiEfektif).toBe('2024-02-05'); // tanggal ternormalisasi == lokal, tidak ditimpa

      const [kelasBaru] = await db.select().from(kelasKuliah).where(eq(kelasKuliah.idPddikti, 'uuid-kelas-2'));
      expect(kelasBaru.namaKelas).toBe('Kelas Teori B');
      expect(kelasBaru.periodeId).toBe(periodeId);

      // 2) KRS & nilai: "isi" nilai kosong; konflik dipertahankan lokal (default)
      const applyKrs = await app.handle(
        new Request('http://localhost/pddikti/pull/apply', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: 'krs-nilai',
            feederIds: [`${nimMhs}|uuid-kelas-1`, `${nimMhs}|uuid-kelas-nilai`, '99999999|uuid-kelas-1'],
          }),
        }),
      );
      expect(applyKrs.status).toBe(200);
      const krsResult = (await applyKrs.json()) as { updated: number; linkedOnly: number; skipped: number };
      expect(krsResult.updated).toBe(1); // nilai diisi
      expect(krsResult.linkedOnly).toBe(1); // konflik dipertahankan lokal
      expect(krsResult.skipped).toBe(1); // NIM tidak dikenal

      const [krsTerisi] = await db.select().from(krs).where(eq(krs.id, krsBaru.id));
      expect(Number(krsTerisi.nilaiAngka)).toBe(85);
      expect(krsTerisi.nilaiHuruf).toBe('A');
      expect(Number(krsTerisi.nilaiIndeks)).toBe(4);
      expect(krsTerisi.isApproved).toBe(true);

      const [krsDitahan] = await db.select().from(krs).where(eq(krs.id, krsKonflik.id));
      expect(Number(krsDitahan.nilaiAngka)).toBe(70); // tetap lokal
      expect(krsDitahan.nilaiHuruf).toBe('B-');

      // Konflik + resolusi "feeder" → nilai ditimpa
      const applyKrsFeeder = await app.handle(
        new Request('http://localhost/pddikti/pull/apply', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: 'krs-nilai',
            feederIds: [`${nimMhs}|uuid-kelas-nilai`],
            conflictResolution: 'feeder',
          }),
        }),
      );
      expect(applyKrsFeeder.status).toBe(200);
      const [krsDitimpa] = await db.select().from(krs).where(eq(krs.id, krsKonflik.id));
      expect(Number(krsDitimpa.nilaiAngka)).toBe(60);
      expect(krsDitimpa.nilaiHuruf).toBe('C');

      // 3) Preview transkrip & aktivitas: read-only, apply ditolak
      const prevTranskrip = await app.handle(
        new Request('http://localhost/pddikti/pull/preview?entity=transkrip', {
          method: 'GET',
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );
      expect(prevTranskrip.status).toBe(200);
      const transkripBody = (await prevTranskrip.json()) as { items: Array<{ canApply: boolean; status: string }> };
      expect(transkripBody.items.length).toBe(2);
      expect(transkripBody.items.every((i) => i.canApply === false)).toBe(true);

      const prevAktivitas = await app.handle(
        new Request('http://localhost/pddikti/pull/preview?entity=aktivitas-mahasiswa', {
          method: 'GET',
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );
      expect(prevAktivitas.status).toBe(200);
      const aktivitasBody = (await prevAktivitas.json()) as {
        items: Array<{ canApply: boolean; label: string; status: string; feederId: string }>;
      };
      expect(aktivitasBody.items.length).toBe(1);
      expect(aktivitasBody.items[0].label).toContain('Magang Industri');
      // Sejak modul Aktivitas MBKM tersedia, entitas ini bisa di-apply (bukan pratinjau saja).
      expect(aktivitasBody.items[0].canApply).toBe(true);
      expect(aktivitasBody.items[0].status).toBe('baru');

      const applyPreviewOnly = await app.handle(
        new Request('http://localhost/pddikti/pull/apply', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity: 'transkrip', feederIds: [nimMhs] }),
        }),
      );
      expect(applyPreviewOnly.status).toBe(400);

      // 4) Semua interaksi Feeder tetap read-only
      expect(actsCalled.length).toBeGreaterThan(0);
      expect(actsCalled.every((a) => a === 'GetToken' || a.startsWith('Get'))).toBe(true);
    });

    it('pulls dosen pengajar kelas and fills empty SKS beban mengajar', async () => {
      const actsCalled: string[] = [];
      // Prasyarat: dosen, prodi & kelas sudah tertaut ke ID PDDIKTI.
      await app.handle(
        new Request('http://localhost/system/parameters/FEEDER_PASSWORD', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: 'dummy-secret' }),
        }),
      );
      await db.update(programStudi).set({ idPddikti: 'uuid-prodi-ti' }).where(eq(programStudi.id, prodiId));
      await db.update(dosen).set({ idPddikti: 'uuid-dosen-1' }).where(eq(dosen.id, dosenId));

      // Penugasan lokal sudah ada tetapi SKS beban mengajar masih kosong.
      const [kelasIsi] = await db
        .insert(kelasKuliah)
        .values({ mataKuliahId: mkId, periodeId, namaKelas: 'Kelas Isi SKS', idPddikti: 'uuid-kelas-isi' })
        .returning();
      const [pdKosong] = await db
        .insert(dosenPengajarKelas)
        .values({ dosenId, kelasKuliahId: kelasIsi.id, idPddikti: 'uuid-akt-isi' })
        .returning();
      // Penugasan lokal dengan SKS berbeda dari Feeder → konflik.
      const [kelasKonflik] = await db
        .insert(kelasKuliah)
        .values({ mataKuliahId: mkId, periodeId, namaKelas: 'Kelas Konflik SKS', idPddikti: 'uuid-kelas-konflik' })
        .returning();
      const [pdKonflik] = await db
        .insert(dosenPengajarKelas)
        .values({ dosenId, kelasKuliahId: kelasKonflik.id, sksBebanMengajar: 40, idPddikti: 'uuid-akt-konflik' })
        .returning();

      FeederService.setTestTransport(async (_cfg, body) => {
        const act = String(body.act);
        actsCalled.push(act);
        if (act === 'GetToken') return { error_code: 0, data: { token: 'tok-dp' } };
        if (act === 'GetAktivitasMengajarDosen') {
          return {
            error_code: 0,
            data: [
              // Dua substansi untuk pasangan yang sama → diagregasi (2 + 2 SKS).
              {
                id_aktivitas: 'uuid-akt-isi',
                id_dosen: 'uuid-dosen-1',
                id_kelas_kuliah: 'uuid-kelas-isi',
                nama_substansi: 'Tatap muka',
                sks_substansi_total: 2,
              },
              {
                id_aktivitas: 'uuid-akt-isi-2',
                id_dosen: 'uuid-dosen-1',
                id_kelas_kuliah: 'uuid-kelas-isi',
                nama_substansi: 'Praktik',
                sks_substansi_total: 2,
              },
              // SKS bertentangan dengan lokal (40 → 50) → konflik
              {
                id_aktivitas: 'uuid-akt-konflik',
                id_dosen: 'uuid-dosen-1',
                id_kelas_kuliah: 'uuid-kelas-konflik',
                sks_substansi_total: 50,
              },
              // Dosen belum terautau di aplikasi → tidak dapat diterapkan
              {
                id_aktivitas: 'uuid-akt-luar',
                id_dosen: 'uuid-dosen-lain',
                id_kelas_kuliah: 'uuid-kelas-isi',
                sks_substansi_total: 2,
              },
              // Kelas belum tertaut di aplikasi → tidak dapat diterapkan
              {
                id_aktivitas: 'uuid-akt-kelas-baru',
                id_dosen: 'uuid-dosen-1',
                id_kelas_kuliah: 'uuid-kelas-baru',
                sks_substansi_total: 4,
              },
            ],
          };
        }
        return { error_code: 0, data: [] };
      });

      const prev = await app.handle(
        new Request('http://localhost/pddikti/pull/preview?entity=dosen-pengajar', {
          method: 'GET',
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );
      expect(prev.status).toBe(200);
      const prevBody = (await prev.json()) as {
        items: Array<{
          feederId: string;
          status: string;
          canApply: boolean;
          note?: string;
          feederData: Record<string, unknown>;
        }>;
        summary: { totalFeeder: number; isi: number; konflik: number; baru: number };
      };
      // Dua baris substansi kelas "isi" diagregasi menjadi satu penugasan.
      expect(prevBody.summary.totalFeeder).toBe(4);
      expect(prevBody.summary.isi).toBe(1);
      expect(prevBody.summary.konflik).toBe(1);
      expect(prevBody.summary.baru).toBe(2);

      const itemIsi = prevBody.items.find((i) => i.feederId === 'uuid-akt-isi');
      expect(itemIsi?.status).toBe('isi');
      expect(itemIsi?.canApply).toBe(true);
      expect(itemIsi?.feederData.sksBebanMengajar).toBe(4); // 2 + 2 diagregasi
      const blocked = prevBody.items.filter((i) => !i.canApply);
      expect(blocked.length).toBe(2);
      expect(blocked.some((i) => i.note?.includes('Dosen uuid-dosen-lain'))).toBe(true);
      expect(blocked.some((i) => i.note?.includes('Kelas kuliah uuid-kelas-baru'))).toBe(true);

      // Apply default (lokal): SKS kosong diisi, konflik dipertahankan.
      const applyDp = await app.handle(
        new Request('http://localhost/pddikti/pull/apply', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: 'dosen-pengajar',
            feederIds: ['uuid-akt-isi', 'uuid-akt-konflik', 'uuid-akt-luar', 'uuid-akt-kelas-baru'],
          }),
        }),
      );
      expect(applyDp.status).toBe(200);
      const dpResult = (await applyDp.json()) as { updated: number; linkedOnly: number; skipped: number };
      expect(dpResult.updated).toBe(1); // SKS diisi
      expect(dpResult.linkedOnly).toBe(1); // konflik dipertahankan lokal
      expect(dpResult.skipped).toBe(2); // dosen & kelas belum tertaut

      const [pdTerisi] = await db.select().from(dosenPengajarKelas).where(eq(dosenPengajarKelas.id, pdKosong.id));
      expect(pdTerisi.sksBebanMengajar).toBe(4);

      const [pdDitahan] = await db.select().from(dosenPengajarKelas).where(eq(dosenPengajarKelas.id, pdKonflik.id));
      expect(pdDitahan.sksBebanMengajar).toBe(40); // tetap lokal

      // Konflik + resolusi "feeder" → SKS ditimpa
      const applyFeeder = await app.handle(
        new Request('http://localhost/pddikti/pull/apply', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: 'dosen-pengajar',
            feederIds: ['uuid-akt-konflik'],
            conflictResolution: 'feeder',
          }),
        }),
      );
      expect(applyFeeder.status).toBe(200);
      const [pdDitimpa] = await db.select().from(dosenPengajarKelas).where(eq(dosenPengajarKelas.id, pdKonflik.id));
      expect(pdDitimpa.sksBebanMengajar).toBe(50);

      // Semua interaksi Feeder tetap read-only
      expect(actsCalled.every((a) => a === 'GetToken' || a.startsWith('Get'))).toBe(true);
    });
  });

  describe('PDDIKTI Sync Simulation', () => {
    it('should execute PDDIKTI Sync and return statistics', async () => {
      // 1. Get initial stats
      const statsRes = await app.handle(
        new Request('http://localhost/pddikti/stats', {
          method: 'GET',
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );
      expect(statsRes.status).toBe(200);
      const statsData = await statsRes.json();
      expect(statsData.mahasiswa.unsynced).toBe(1);

      // 2. Trigger sync
      const syncRes = await app.handle(
        new Request('http://localhost/pddikti/sync', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );
      expect(syncRes.status).toBe(200);
      const syncData = await syncRes.json();
      expect(syncData.details.mahasiswaSynced).toBe(1);

      // 3. Verify updated stats
      const statsRes2 = await app.handle(
        new Request('http://localhost/pddikti/stats', {
          method: 'GET',
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );
      const statsData2 = await statsRes2.json();
      expect(statsData2.mahasiswa.unsynced).toBe(0);
    });
  });
});
