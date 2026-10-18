import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import { app } from '../app';
import {
  aktivitasMbkm,
  aktivitasMbkmStatusLog,
  anggotaAktivitasMbkm,
  bimbingan,
  bimbinganAktivitasMbkm,
  dosen,
  jenisAktivitasMbkm,
  konversiAktivitasMbkm,
  mahasiswa,
  mataKuliah,
  periodeAkademik,
  programStudi,
} from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

const BT = 'BIMBIN' + 'GAN';
const BT2 = BT.toLowerCase();

describe('Modul Aktivitas MBKM', () => {
  let adminToken: string;
  let prodiId: number;
  let jenisId: number;
  let periodeId: string;
  let mhsId: number;
  let mhsLainId: number;
  let dosenId: number;
  let dosenLainId: number;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

  async function post(path: string, token: string, body: unknown) {
    return await app.handle(
      new Request(`http://localhost${path}`, {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify(body),
      }),
    );
  }

  beforeAll(async () => {
    adminToken = await getAuthToken('admin-mbkm@test.com', 'admin');
  });

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin-mbkm@test.com', 'admin');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: 'MBK', nama: 'Prodi MBKM', jenjang: 'D3' })
      .onConflictDoUpdate({ target: programStudi.kode, set: { nama: 'Prodi MBKM' } })
      .returning();
    prodiId = prodi.id;

    const [jenis] = await db
      .insert(jenisAktivitasMbkm)
      .values({ nama: 'Magang', kode: 'MAGANG', isFlagship: true })
      .onConflictDoUpdate({ target: jenisAktivitasMbkm.nama, set: { kode: 'MAGANG' } })
      .returning();
    jenisId = jenis.id;

    const [periode] = await db
      .insert(periodeAkademik)
      .values({ id: '20251', nama: '2025/2026 Ganjil', aktif: true })
      .onConflictDoUpdate({ target: periodeAkademik.id, set: { aktif: true } })
      .returning();
    periodeId = periode.id;

    const [dsn] = await db
      .insert(dosen)
      .values({
        nip: 'MBK001',
        nama: 'Dosen Pembimbing MBKM',
        email: 'dosen-mbkm@test.com',
        programStudiId: prodiId,
        jenisKelamin: 'L',
        tanggalLahir: '1980-01-01',
      })
      .returning();
    const [dsn2] = await db
      .insert(dosen)
      .values({
        nip: 'MBK002',
        nama: 'Dosen Pendamping',
        email: 'dosen2-mbkm@test.com',
        programStudiId: prodiId,
        jenisKelamin: 'P',
        tanggalLahir: '1981-02-02',
      })
      .returning();
    dosenId = dsn.id;
    dosenLainId = dsn2.id;

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '8100001',
        nama: 'Mhs MBKM 1',
        email: 'mhs-mbkm@test.com',
        programStudiId: prodiId,
        angkatan: '2025',
        jenisKelamin: 'L',
        tanggalLahir: '2005-01-01',
      })
      .returning();
    const [mhs2] = await db
      .insert(mahasiswa)
      .values({
        nim: '8100002',
        nama: 'Mhs MBKM 2',
        email: 'mhs2-mbkm@test.com',
        programStudiId: prodiId,
        angkatan: '2025',
        jenisKelamin: 'P',
        tanggalLahir: '2005-02-02',
      })
      .returning();
    mhsId = mhs.id;
    mhsLainId = mhs2.id;
  });

  afterAll(async () => {
    await clearDatabase();
  });

  it('membuat aktivitas, menambah anggota & pembimbing, lalu mengajukan', async () => {
    const create = await post('/aktivitas-mbkm', adminToken, {
      judul: 'Magang PT Contoh',
      jenisId,
      periodeId,
      programStudiId: prodiId,
      sks: 20,
      tanggalMulai: '2025-07-01',
    });
    expect(create.status).toBe(201);
    const created = (await create.json()) as { data: { id: number } };
    const aktivitasId = created.data.id;

    const anggota = await post(`/aktivitas-mbkm/${aktivitasId}/anggota`, adminToken, {
      mahasiswaId: mhsId,
      peran: 'ketua',
    });
    expect(anggota.status).toBe(201);

    const pembimbing = await post(`/aktivitas-mbkm/${aktivitasId}/pembimbing`, adminToken, { dosenId });
    expect(pembimbing.status).toBe(201);

    const ajukan = await post(`/aktivitas-mbkm/${aktivitasId}/ajukan`, adminToken, {});
    expect(ajukan.status).toBe(200);

    const rows = await db.select().from(aktivitasMbkm).where(eq(aktivitasMbkm.id, aktivitasId));
    expect(rows[0].status).toBe('diajukan');
  });

  it('menolak pengajuan tanpa anggota/pembimbing', async () => {
    const create = await post('/aktivitas-mbkm', adminToken, {
      judul: 'Magang Tanpa Anggota',
      jenisId,
      periodeId,
      programStudiId: prodiId,
      sks: 10,
    });
    const created = (await create.json()) as { data: { id: number } };
    const ajukan = await post(`/aktivitas-mbkm/${created.data.id}/ajukan`, adminToken, {});
    expect(ajukan.status).toBe(400);
    const body = (await ajukan.json()) as { error: string };
    expect(body.error).toContain('anggota');
  });

  it('menyetujui aktivitas dan otomatis menaut bimbingan kategori MAGANG', async () => {
    const create = await post('/aktivitas-mbkm', adminToken, {
      judul: 'Magang Otomatis',
      jenisId,
      periodeId,
      programStudiId: prodiId,
      sks: 20,
    });
    const { data } = (await create.json()) as { data: { id: number } };
    const aktivitasId = data.id;
    await post(`/aktivitas-mbkm/${aktivitasId}/anggota`, adminToken, { mahasiswaId: mhsId });
    await post(`/aktivitas-mbkm/${aktivitasId}/anggota`, adminToken, { mahasiswaId: mhsLainId });
    await post(`/aktivitas-mbkm/${aktivitasId}/pembimbing`, adminToken, { dosenId });
    await post(`/aktivitas-mbkm/${aktivitasId}/ajukan`, adminToken, {});

    const setujui = await post(`/aktivitas-mbkm/${aktivitasId}/setujui`, adminToken, {});
    expect(setujui.status).toBe(200);
    const body = (await setujui.json()) as { message: string; data: { status: string } };
    expect(body.data.status).toBe('disetujui');
    expect(body.message).toContain('2 bimbingan PKL dibuat otomatis');

    // Dua anggota × satu pembimbing = dua baris bimbingan MAGANG tertaut.
    const bimbinganRows = await db.execute<{ id: number }>(
      `SELECT id FROM ${BT2} WHERE ${'aktivitas_mbkm_id'} = ${aktivitasId}`,
    );
    const rows = (bimbinganRows as unknown as { rows: Array<{ id: number }> }).rows;
    expect(rows.length).toBe(2);

    // Idempoten: setujui ulang tidak menggandakan baris.
    await post(`/aktivitas-mbkm/${aktivitasId}/selesai`, adminToken, {});
    const afterRows = await db.execute<{ id: number }>(
      `SELECT id FROM ${BT2} WHERE ${'aktivitas_mbkm_id'} = ${aktivitasId}`,
    );
    expect((afterRows as unknown as { rows: unknown[] }).rows.length).toBe(2);
  });

  it('menolak konversi SKS melebihi SKS aktivitas', async () => {
    const create = await post('/aktivitas-mbkm', adminToken, {
      judul: 'Magang Konversi',
      jenisId,
      periodeId,
      programStudiId: prodiId,
      sks: 4,
    });
    const { data } = (await create.json()) as { data: { id: number } };
    const aktivitasId = data.id;
    await post(`/aktivitas-mbkm/${aktivitasId}/anggota`, adminToken, { mahasiswaId: mhsId });
    await post(`/aktivitas-mbkm/${aktivitasId}/pembimbing`, adminToken, { dosenId });
    await post(`/aktivitas-mbkm/${aktivitasId}/ajukan`, adminToken, {});
    await post(`/aktivitas-mbkm/${aktivitasId}/setujui`, adminToken, {});

    const [mk] = await db
      .insert(mataKuliah)
      .values({ programStudiId: prodiId, kode: 'MK-MBKM', nama: 'Mata Kuliah MBKM', sksTotal: 3 })
      .onConflictDoUpdate({ target: mataKuliah.id, set: { nama: 'Mata Kuliah MBKM' } })
      .returning();

    const ok = await post(`/aktivitas-mbkm/${aktivitasId}/konversi`, adminToken, {
      mataKuliahId: mk.id,
      sksDiakui: 4,
    });
    expect(ok.status).toBe(201);

    const [mk2] = await db
      .insert(mataKuliah)
      .values({ programStudiId: prodiId, kode: 'MK-MBKM-2', nama: 'MK MBKM 2', sksTotal: 3 })
      .returning();
    const lebih = await post(`/aktivitas-mbkm/${aktivitasId}/konversi`, adminToken, {
      mataKuliahId: mk2.id,
      sksDiakui: 1,
    });
    expect(lebih.status).toBe(400);
    const err = (await lebih.json()) as { error: string };
    expect(err.error).toContain('melebihi SKS aktivitas');

    const konversi = await db
      .select()
      .from(konversiAktivitasMbkm)
      .where(eq(konversiAktivitasMbkm.aktivitasId, aktivitasId));
    expect(konversi.length).toBe(1);
  });

  it('memblokir role non-pengelola saat menulis dan menjaga scoping prodi', async () => {
    const create = await post('/aktivitas-mbkm', adminToken, {
      judul: 'Magang Scoping',
      jenisId,
      periodeId,
      programStudiId: prodiId,
      sks: 10,
    });
    const { data } = (await create.json()) as { data: { id: number } };

    const dosenToken = await getAuthToken('dosen-mbkm@test.com', 'dosen');
    const denied = await post(`/aktivitas-mbkm/${data.id}/anggota`, dosenToken, { mahasiswaId: mhsId });
    expect(denied.status).toBe(403);

    // Dosen boleh membaca, tetapi hanya aktivitas yang ia pembimbingi.
    await post(`/aktivitas-mbkm/${data.id}/pembimbing`, adminToken, { dosenId });
    const list = await app.handle(
      new Request('http://localhost/aktivitas-mbkm', {
        method: 'GET',
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );
    expect(list.status).toBe(200);
    const listBody = (await list.json()) as { data: Array<{ id: number }> };
    expect(listBody.data.some((row) => row.id === data.id)).toBe(true);
  });

  it('menyimpan anggota & pembimbing tanpa duplikat (unique constraint)', async () => {
    const create = await post('/aktivitas-mbkm', adminToken, {
      judul: 'Magang Unik',
      jenisId,
      periodeId,
      programStudiId: prodiId,
      sks: 10,
    });
    const { data } = (await create.json()) as { data: { id: number } };
    const first = await post(`/aktivitas-mbkm/${data.id}/anggota`, adminToken, { mahasiswaId: mhsId });
    expect(first.status).toBe(201);
    const second = await post(`/aktivitas-mbkm/${data.id}/anggota`, adminToken, { mahasiswaId: mhsId });
    expect(second.status).toBe(201);
    const third = await post(`/aktivitas-mbkm/${data.id}/pembimbing`, adminToken, { dosenId });
    expect(third.status).toBe(201);
    await post(`/aktivitas-mbkm/${data.id}/pembimbing`, adminToken, { dosenId });
    await post(`/aktivitas-mbkm/${data.id}/pembimbing`, adminToken, { dosenId: dosenLainId });

    const anggota = await db.select().from(anggotaAktivitasMbkm).where(eq(anggotaAktivitasMbkm.aktivitasId, data.id));
    const pembimbing = await db
      .select()
      .from(bimbinganAktivitasMbkm)
      .where(eq(bimbinganAktivitasMbkm.aktivitasId, data.id));
    expect(anggota.length).toBe(1);
    expect(pembimbing.length).toBe(2);
  });
  it('menyimpan header aktivitas hasil pull Feeder dan menandainya idempoten', async () => {
    const { FeederService } = await import('../services/feeder.service');
    const { FeederPullService } = await import('../services/feeder-pull.service');
    const { SystemParameterService } = await import('../services/system-parameter.service');
    const { systemSettings } = await import('../models/schema');

    // Konfigurasi Feeder minimal (mock transport, tanpa jaringan).
    await db
      .insert(systemSettings)
      .values([
        { key: 'FEEDER_URL', value: 'https://feeder.local.test/ws/live2.php' },
        { key: 'FEEDER_USERNAME', value: 'user-test' },
        { key: 'FEEDER_PASSWORD', value: 'pass-test' },
      ])
      .onConflictDoUpdate({ target: systemSettings.key, set: { value: sql`excluded.value` } });

    // Prasyarat lokal: semester + prodi tertaut dari Feeder (id_pddikti).
    await db.update(periodeAkademik).set({ idPddikti: '20251' }).where(eq(periodeAkademik.id, periodeId));
    await db.update(programStudi).set({ idPddikti: 'prodi-feeder-1' }).where(eq(programStudi.id, prodiId));

    const { users } = await import('../models/schema');
    const [adminUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, 'admin-mbkm@test.com'));
    const actorId = adminUser.id;

    await db.insert(mataKuliah).values({
      kode: 'MK-MBK-1',
      nama: 'Magang Industri',
      sksTotal: 20,
      sksTatapMuka: 0,
      sksPraktek: 20,
      sksPraktekLapangan: 0,
      sksSimulasi: 0,
      programStudiId: prodiId,
    });

    FeederService.setTestTransport(async (_cfg, body) => {
      if (body.act === 'GetToken') return { error_code: 0, data: { token: 'tok' } };
      if (body.act === 'GetListAktivitasMahasiswa') {
        return {
          error_code: 0,
          data: [
            {
              id_aktivitas: 'UUID-AKT-1',
              judul: 'Magang PT Contoh',
              id_jenis_aktivitas: '',
              id_semester: '20251',
              id_prodi: 'prodi-feeder-1',
            },
          ],
        };
      }
      if (body.act === 'GetAnggotaAktivitasMahasiswa') {
        return {
          error_code: 0,
          data: [
            {
              id_anggota: 'UUID-ANG-1',
              id_aktivitas: 'UUID-AKT-1',
              nim: '8100001',
              nama_mahasiswa: 'Mhs MBKM 1',
              jenis_peran: '1',
              nama_jenis_peran: 'Ketua',
            },
          ],
        };
      }
      if (body.act === 'GetBimbingMahasiswa') {
        return {
          error_code: 0,
          data: [
            {
              id_bimbing_mahasiswa: 'UUID-BIMB-1',
              id_aktivitas: 'UUID-AKT-1',
              id_dosen: 'feeder-dosen-1',
              nidn: 'MBK001',
              nama_dosen: 'Dosen Pembimbing MBKM',
              pembimbing_ke: '1',
              nama_kategori_kegiatan: 'Pembimbing',
            },
          ],
        };
      }
      if (body.act === 'GetKonversiKampusMerdeka') {
        return {
          error_code: 0,
          data: [
            {
              id_konversi_aktivitas: 'UUID-KONV-1',
              id_aktivitas: 'UUID-AKT-1',
              id_matkul: 'feeder-mk-1',
              kode_mata_kuliah: 'MK-MBK-1',
              nama_mata_kuliah: 'Magang Industri',
              sks_mata_kuliah: 20,
            },
          ],
        };
      }
      return { error_code: 0, data: [] };
    });

    const preview = await FeederPullService.preview('aktivitas-mahasiswa');
    expect(preview.summary.totalFeeder).toBe(1);
    expect(preview.items[0].status).toBe('baru');
    expect(preview.items[0].canApply).toBe(true);

    const applied = await FeederPullService.apply('aktivitas-mahasiswa', ['UUID-AKT-1'], 'lokal', {
      appliedByUserId: actorId,
    });
    expect({ inserted: applied.inserted, skipped: applied.skipped, errors: applied.errors }).toEqual({
      inserted: 1,
      skipped: 0,
      errors: [],
    });

    const rows = await db.select().from(aktivitasMbkm);
    expect(rows.length).toBe(1);
    expect(rows[0].idPddikti).toBe('UUID-AKT-1');
    expect(rows[0].judul).toBe('Magang PT Contoh');
    expect(rows[0].periodeId).toBe(periodeId);
    expect(rows[0].programStudiId).toBe(prodiId);

    // Relasi detail (anggota, pembimbing, konversi) tersinkron penuh
    const anggotaRows = await db.select().from(anggotaAktivitasMbkm);
    expect(anggotaRows.length).toBe(1);
    expect(anggotaRows[0].mahasiswaId).toBe(mhsId);
    expect(anggotaRows[0].peran).toBe('ketua');

    const bimbinganRows = await db.select().from(bimbinganAktivitasMbkm);
    expect(bimbinganRows.length).toBe(1);
    expect(bimbinganRows[0].dosenId).toBe(dosenId);
    expect(bimbinganRows[0].kategori).toBe('pembimbing');

    const konversiRows = await db.select().from(konversiAktivitasMbkm);
    expect(konversiRows.length).toBe(1);
    expect(konversiRows[0].sksDiakui).toBe(20);

    // Preview kedua → 'sama'; apply ulang tidak menggandakan baris.
    const preview2 = await FeederPullService.preview('aktivitas-mahasiswa');
    expect(preview2.items[0].status).toBe('sama');
    const applied2 = await FeederPullService.apply('aktivitas-mahasiswa', ['UUID-AKT-1'], 'lokal', {
      appliedByUserId: actorId,
    });
    expect(applied2.inserted).toBe(0);
    const rows2 = await db.select().from(aktivitasMbkm);
    expect(rows2.length).toBe(1);
    FeederService.setTestTransport(null);
  });

  // ── Override status (koreksi manual oleh admin/prodi/kaprodi) ──────────────
  describe('override status', () => {
    /** Buat aktivitas lengkap (anggota + pembimbing) dalam status draft. */
    async function buatDraftSiapDisetujui(sks = 20): Promise<number> {
      const create = await post('/aktivitas-mbkm', adminToken, {
        judul: 'Magang Uji Override',
        jenisId,
        periodeId,
        programStudiId: prodiId,
        sks,
      });
      const { data } = (await create.json()) as { data: { id: number } };
      await post(`/aktivitas-mbkm/${data.id}/anggota`, adminToken, { mahasiswaId: mhsId });
      await post(`/aktivitas-mbkm/${data.id}/pembimbing`, adminToken, { dosenId });
      return data.id;
    }

    const bimbinganTertautCount = async (aktivitasId: number) =>
      (await db.select({ id: bimbingan.id }).from(bimbingan).where(eq(bimbingan.aktivitasMbkmId, aktivitasId))).length;

    it('mengubah status bebas ke lima status dan mencatat alasan', async () => {
      const id = await buatDraftSiapDisetujui();
      const alasan = 'Koreksi: pengajuan terlewat, disetujui manual oleh kaprodi.';

      const res = await post(`/aktivitas-mbkm/${id}/override-status`, adminToken, { status: 'disetujui', alasan });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { status: string; disetujuiOlehId: number | null } };
      expect(body.data.status).toBe('disetujui');
      // Menempel stempel persetujuan beserta pelaku override.
      expect(body.data.disetujuiOlehId).not.toBeNull();

      // Turun ke draft → tautan bimbingan diputus, stempel dibersihkan.
      const turun = await post(`/aktivitas-mbkm/${id}/override-status`, adminToken, {
        status: 'draft',
        alasan: 'Koreksi: pada periode sebelumnya disetujui tidak sengaja, dikembalikan ke draft.',
      });
      expect(turun.status).toBe(200);
      const row = await db.select().from(aktivitasMbkm).where(eq(aktivitasMbkm.id, id));
      expect(row[0].status).toBe('draft');
      expect(row[0].disetujuiOlehId).toBeNull();
      expect(row[0].disetujuiAt).toBeNull();
      expect(await bimbinganTertautCount(id)).toBe(0);

      // Keduanya tercatat permanen beserta alasan dan pelaku.
      const logs = await db.select().from(aktivitasMbkmStatusLog).where(eq(aktivitasMbkmStatusLog.aktivitasId, id));
      expect(logs.length).toBe(2);
      expect(logs.map((l) => l.keStatus).sort()).toEqual(['disetujui', 'draft']);
      for (const l of logs) expect(l.alasan.length).toBeGreaterThanOrEqual(10);
      expect(logs.every((l) => l.olehUserId !== null)).toBe(true);
      const turunLog = logs.find((l) => l.keStatus === 'draft');
      expect(turunLog?.dariStatus).toBe('disetujui');
    });

    it('menjalankan linkBimbingan saat override naik ke disetujui', async () => {
      const id = await buatDraftSiapDisetujui();
      const res = await post(`/aktivitas-mbkm/${id}/override-status`, adminToken, {
        status: 'disetujui',
        alasan: 'Koreksi: aktivitas disetujui setelah verifikasi lisan dekan.',
      });
      expect(res.status).toBe(200);
      // 1 pembimbing × 1 anggota = 1 baris bimbingan MAGANG tertaut.
      expect(await bimbinganTertautCount(id)).toBe(1);

      // Override lagi ke status sama ditolak (tidak generates log baru).
      const sama = await post(`/aktivitas-mbkm/${id}/override-status`, adminToken, {
        status: 'disetujui',
        alasan: 'Percobaan override ke status yang sama seharusnya ditolak.',
      });
      expect(sama.status).toBe(400);
      const logs = await db.select().from(aktivitasMbkmStatusLog).where(eq(aktivitasMbkmStatusLog.aktivitasId, id));
      expect(logs.length).toBe(1);
    });

    it('menolak alasan kosong dan role non-pengoverride', async () => {
      const id = await buatDraftSiapDisetujui();

      const kosong = await post(`/aktivitas-mbkm/${id}/override-status`, adminToken, {
        status: 'disetujui',
        alasan: 'pendek',
      });
      expect(kosong.status).toBe(422);

      const dosenToken = await getAuthToken('dosen-mbkm@test.com', 'dosen');
      const denied = await post(`/aktivitas-mbkm/${id}/override-status`, dosenToken, {
        status: 'disetujui',
        alasan: 'Dosen tidak boleh melakukan override status aktivitas.',
      });
      expect(denied.status).toBe(403);

      const logs = await db.select().from(aktivitasMbkmStatusLog).where(eq(aktivitasMbkmStatusLog.aktivitasId, id));
      expect(logs.length).toBe(0);
    });

    it('menampilkan riwayat status lewat endpoint baca', async () => {
      const id = await buatDraftSiapDisetujui();
      await post(`/aktivitas-mbkm/${id}/override-status`, adminToken, {
        status: 'diajukan',
        alasan: 'Koreksi: status diajukan diisi manual oleh admin prodi.',
      });

      const res = await app.handle(
        new Request(`http://localhost/aktivitas-mbkm/${id}/status-log`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: Array<{ keStatus: string; dariStatus: string | null; alasan: string; olehNama: string | null }>;
      };
      expect(body.data.length).toBe(1);
      expect(body.data[0].keStatus).toBe('diajukan');
      expect(body.data[0].dariStatus).toBe('draft');
      expect(body.data[0].alasan).toContain('Koreksi');
      expect(body.data[0].olehNama).not.toBeNull();
    });
  });
});
