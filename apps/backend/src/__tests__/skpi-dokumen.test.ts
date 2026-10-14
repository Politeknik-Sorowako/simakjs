import { beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import { dosen, mahasiswa, programStudi, userProdiScopes, users } from '../models/schema';
import { DocumentSignatureService } from '../services/document-signature.service';
import { SystemParameterService } from '../services/system-parameter.service';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

const SIGN_KEYS = JSON.stringify({ k1: 'a'.repeat(64) });
const VERIFY_BASE = 'https://verify.test';

async function api(token: string, method: string, path: string, body?: unknown) {
  const response = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  return { status: response.status, data: (await response.json()) as Record<string, unknown> };
}

/** Endpoint verifikasi publik (POST + Turnstile; lolos otomatis saat NODE_ENV=test). */
function verifyRequest(uuid: string): Request {
  return new Request('http://localhost/document-signatures/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid, turnstileToken: 'test-token' }),
  });
}

describe('Modul SKPI — Dokumen & Tanda Tangan (TTE)', () => {
  let adminToken: string;
  let mhsToken: string;
  let mhs2Token: string;
  let paToken: string;
  let kemaToken: string;
  let prodiToken: string;
  let prodiId: number;
  let otherProdiId: number;
  let mhsId: number;
  let mhs2Id: number;
  let kategoriId: number;

  beforeEach(async () => {
    await clearDatabase();
    process.env.SIGN_HMAC_KEYS = SIGN_KEYS;
    process.env.SIGN_ACTIVE_KID = 'k1';
    process.env.VERIFY_BASE_URL = VERIFY_BASE;
    // `SystemParameterService` punya cache module-level (TTL 10 dtk) yang tidak
    // dibersihkan `clearDatabase()`. Reset eksplisit agar nilai `skpi_min_kegiatan`
    // dari test lain tidak mencemari isolasi test.
    await SystemParameterService.set('skpi_min_kegiatan', '1');

    adminToken = await getAuthToken('admin@test.com', 'admin');
    mhsToken = await getAuthToken('mhs@test.com', 'mahasiswa');
    mhs2Token = await getAuthToken('mhs2@test.com', 'mahasiswa');
    paToken = await getAuthToken('pa@test.com', 'dosen');
    kemaToken = await getAuthToken('kema@test.com', 'kemahasiswaan');
    prodiToken = await getAuthToken('prodi@test.com', 'prodi');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: 'IF', nama: 'Informatika', jenjang: 'D4' })
      .returning();
    prodiId = prodi.id;
    const [prodi2] = await db
      .insert(programStudi)
      .values({ kode: 'TM', nama: 'Teknik Mesin', jenjang: 'D3' })
      .returning();
    otherProdiId = prodi2.id;

    // Prodi in-scope untuk uji dokumen staf; kemahasiswaan di-scope prodi lain (out-of-scope).
    const [prodiUser] = await db.select().from(users).where(eq(users.email, 'prodi@test.com'));
    await db.insert(userProdiScopes).values({ userId: prodiUser.id, programStudiId: prodiId });
    const [kemaUser] = await db.select().from(users).where(eq(users.email, 'kema@test.com'));
    await db.insert(userProdiScopes).values({ userId: kemaUser.id, programStudiId: otherProdiId });

    const [pa] = await db
      .insert(dosen)
      .values({
        nip: '1900000001',
        nama: 'Dosen PA SKPI',
        email: 'pa@test.com',
        programStudiId: prodiId,
        jenisKelamin: 'L',
        nik: '1111111111111111',
        tanggalLahir: '1980-01-01',
      })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20240001',
        nama: 'Mahasiswa SKPI',
        email: 'mhs@test.com',
        programStudiId: prodiId,
        dosenPaId: pa.id,
        status: 'aktif',
        namaIbuKandung: 'Ibu A',
        nik: '3333333333333333',
        jenisKelamin: 'L',
        tanggalLahir: '2004-01-01',
      })
      .returning();
    mhsId = mhs.id;

    const [mhs2] = await db
      .insert(mahasiswa)
      .values({
        nim: '20240002',
        nama: 'Mahasiswa Dua',
        email: 'mhs2@test.com',
        programStudiId: prodiId,
        dosenPaId: pa.id,
        status: 'aktif',
        namaIbuKandung: 'Ibu B',
        nik: '4444444444444444',
        jenisKelamin: 'P',
        tanggalLahir: '2004-02-02',
      })
      .returning();
    mhs2Id = mhs2.id;

    const created = await api(adminToken, 'POST', '/skpi/kategori', {
      nama: 'Pelatihan',
      jenis: 'pelatihan',
      poinDefault: 10,
    });
    expect(created.status).toBe(201);
    kategoriId = created.data.id as number;
  });

  /** Input rekaman lalu verifikasi oleh admin; mengembalikan id rekaman. */
  async function addVerifiedKegiatan(
    namaKegiatan: string,
    tanggalMulai = '2026-03-01',
    nomorSertifikat?: string,
  ): Promise<number> {
    const created = await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan,
      tanggalMulai,
      nomorSertifikat,
    });
    expect(created.status).toBe(201);
    const id = created.data.id as number;
    const verified = await api(adminToken, 'PUT', `/skpi/kegiatan/${id}/verifikasi`, { action: 'approve', poin: 10 });
    expect(verified.status).toBe(200);
    return id;
  }

  it('GET dokumen: hanya kegiatan terverifikasi (pending tidak ikut) + signature null sebelum ditandatangani', async () => {
    await addVerifiedKegiatan('Pelatihan Terverifikasi', '2026-03-01', 'SRT/2026/001');
    await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Masih Pending',
      tanggalMulai: '2026-03-02',
    });

    const res = await api(mhsToken, 'GET', `/skpi/dokumen/${mhsId}`);
    expect(res.status).toBe(200);
    const kegiatan = res.data.kegiatan as Array<Record<string, unknown>>;
    expect(kegiatan.length).toBe(1);
    expect(kegiatan[0].namaKegiatan).toBe('Pelatihan Terverifikasi');
    expect(kegiatan[0].nomorSertifikat).toBe('SRT/2026/001');
    expect(res.data.totalPoin).toBe(10);
    expect((res.data.syarat as Record<string, unknown>).terpenuhi).toBe(true);
    expect(res.data.signature).toBeNull();
  });

  it('GET dokumen mahasiswa lain ditolak 403', async () => {
    const res = await api(mhsToken, 'GET', `/skpi/dokumen/${mhs2Id}`);
    expect(res.status).toBe(403);
  });

  it('GET dokumen: staf in-scope 200, staf out-of-scope & dosen PA 403', async () => {
    const inScope = await api(prodiToken, 'GET', `/skpi/dokumen/${mhsId}`);
    expect(inScope.status).toBe(200);

    const outScope = await api(kemaToken, 'GET', `/skpi/dokumen/${mhsId}`);
    expect(outScope.status).toBe(403);

    // Dosen PA bukan pemilik pemilik data prodi-scope → ditolak pada jalur ini.
    const pa = await api(paToken, 'GET', `/skpi/dokumen/${mhsId}`);
    expect(pa.status).toBe(403);

    expect(prodiId).not.toBe(otherProdiId);
  });

  it('staf admin menandatangani SKPI → QR + verifyUrl, verifikasi publik VALID ter-mask; mahasiswa ditolak 403', async () => {
    await addVerifiedKegiatan('Pelatihan Jaringan');

    // Keputusan produk: mahasiswa TIDAK menerbitkan sendiri — termasuk pemilik.
    const byMhs = await api(mhsToken, 'POST', `/skpi/dokumen/${mhsId}/sign`);
    expect(byMhs.status).toBe(403);

    const sign = await api(adminToken, 'POST', `/skpi/dokumen/${mhsId}/sign`);
    expect(sign.status).toBe(200);
    const verifyUuid = sign.data.verifyUuid as string;
    expect(verifyUuid).toBeTruthy();
    expect(sign.data.verifyUrl).toContain(`${VERIFY_BASE}/v/`);
    expect(sign.data.docHash as string).toHaveLength(64);
    expect(sign.data.qrDataUrl as string).toContain('data:image/png;base64,');

    const verifyRes = await app.handle(verifyRequest(verifyUuid));
    expect(verifyRes.status).toBe(200);
    const v = (await verifyRes.json()) as { status: string; namaMask: string; nimMask: string };
    expect(v.status).toBe('VALID');
    expect(v.namaMask).toContain('***');
    expect(v.nimMask).toContain('***');
  });

  it('idempoten lintas pemanggil staf: admin lalu prodi menghasilkan verifyUuid & docHash stabil', async () => {
    await addVerifiedKegiatan('Kegiatan Idempoten');

    const sign1 = await api(adminToken, 'POST', `/skpi/dokumen/${mhsId}/sign`);
    expect(sign1.status).toBe(200);

    const sign2 = await api(prodiToken, 'POST', `/skpi/dokumen/${mhsId}/sign`);
    expect(sign2.status).toBe(200);
    expect(sign2.data.verifyUuid).toBe(sign1.data.verifyUuid);
    expect(sign2.data.docHash).toBe(sign1.data.docHash);
  });

  it('re-sign setelah kegiatan bertambah → docHash baru & QR lama REVOKED (410)', async () => {
    await addVerifiedKegiatan('Kegiatan Pertama');
    const sign1 = await api(adminToken, 'POST', `/skpi/dokumen/${mhsId}/sign`);
    expect(sign1.status).toBe(200);
    const uuid1 = sign1.data.verifyUuid as string;

    await addVerifiedKegiatan('Kegiatan Kedua', '2026-03-05');
    const sign2 = await api(adminToken, 'POST', `/skpi/dokumen/${mhsId}/sign`);
    expect(sign2.status).toBe(200);
    expect(sign2.data.verifyUuid).not.toBe(uuid1);
    expect(sign2.data.docHash).not.toBe(sign1.data.docHash);

    const verifyOld = await app.handle(verifyRequest(uuid1));
    expect(verifyOld.status).toBe(410);
    expect(((await verifyOld.json()) as { status: string }).status).toBe('REVOKED');
  });

  it('syarat minimum: min=2 dengan 1 kegiatan terverifikasi → terpenuhi false & sign 400', async () => {
    await SystemParameterService.set('skpi_min_kegiatan', '2');
    await addVerifiedKegiatan('Kegiatan Tunggal');

    const doc = await api(mhsToken, 'GET', `/skpi/dokumen/${mhsId}`);
    expect(doc.status).toBe(200);
    const syarat = doc.data.syarat as Record<string, unknown>;
    expect(syarat.minKegiatan).toBe(2);
    expect(syarat.terpenuhi).toBe(false);

    const sign = await api(adminToken, 'POST', `/skpi/dokumen/${mhsId}/sign`);
    expect(sign.status).toBe(400);
    expect(await DocumentSignatureService.getByRef('SKPI', `skpi:${mhsId}`)).toBeNull();
  });

  it('mahasiswa & dosen PA tidak berwenang menerbitkan (403); kemahasiswaan in-scope berwenang (200)', async () => {
    await addVerifiedKegiatan('Kegiatan Otorisasi');

    const byMhs = await api(mhsToken, 'POST', `/skpi/dokumen/${mhsId}/sign`);
    expect(byMhs.status).toBe(403);

    const byPa = await api(paToken, 'POST', `/skpi/dokumen/${mhsId}/sign`);
    expect(byPa.status).toBe(403);

    // Kemahasiswaan di-scope ke prodi mahasiswa → berwenang menerbitkan.
    const [kemaUser] = await db.select().from(users).where(eq(users.email, 'kema@test.com'));
    await db.delete(userProdiScopes).where(eq(userProdiScopes.userId, kemaUser.id));
    await db.insert(userProdiScopes).values({ userId: kemaUser.id, programStudiId: prodiId });
    const byKema = await api(kemaToken, 'POST', `/skpi/dokumen/${mhsId}/sign`);
    expect(byKema.status).toBe(200);
  });

  it('staf admin in-scope boleh menerbitkan; admin prodi lain ditolak 403', async () => {
    await addVerifiedKegiatan('Kegiatan Staf');

    const byAdmin = await api(adminToken, 'POST', `/skpi/dokumen/${mhsId}/sign`);
    expect(byAdmin.status).toBe(200);

    // Prodi scoped ke prodi lain wajib ditolak.
    const [otherProdiUser] = await db.select().from(users).where(eq(users.email, 'prodi@test.com'));
    await db.delete(userProdiScopes).where(eq(userProdiScopes.userId, otherProdiUser.id));
    await db.insert(userProdiScopes).values({ userId: otherProdiUser.id, programStudiId: otherProdiId });
    const outScopeSign = await api(prodiToken, 'POST', `/skpi/dokumen/${mhsId}/sign`);
    expect(outScopeSign.status).toBe(403);
  });

  it('status akademik: lulus boleh diterbitkan, drop_out ditolak 400', async () => {
    await addVerifiedKegiatan('Kegiatan Status');

    await db.update(mahasiswa).set({ status: 'lulus' }).where(eq(mahasiswa.id, mhsId));
    const byLulus = await api(adminToken, 'POST', `/skpi/dokumen/${mhsId}/sign`);
    expect(byLulus.status).toBe(200);

    await db.update(mahasiswa).set({ status: 'drop_out' }).where(eq(mahasiswa.id, mhsId));
    const doc = await api(mhsToken, 'GET', `/skpi/dokumen/${mhsId}`);
    expect(doc.status).toBe(200);
    expect((doc.data.syarat as Record<string, unknown>).statusAkademikValid).toBe(false);

    const byDropOut = await api(adminToken, 'POST', `/skpi/dokumen/${mhsId}/sign`);
    expect(byDropOut.status).toBe(400);
  });

  // ── Tab Penerbitan (agregat + signature batch) ─────────────────────────────

  it('Penerbitan: signature tampil per baris (batch) & siapTerbit menyaring yang belum syarat', async () => {
    await addVerifiedKegiatan('Kegiatan Terbit');
    const sign = await api(adminToken, 'POST', `/skpi/dokumen/${mhsId}/sign`);
    expect(sign.status).toBe(200);

    // mhs2: hanya pending → tampil (≥1 item, status apa pun) tetapi di luar syarat.
    const pending2 = await api(mhs2Token, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Pending Mhs Dua',
      tanggalMulai: '2026-03-01',
    });
    expect(pending2.status).toBe(201);

    const all = await api(adminToken, 'GET', '/skpi/penerbitan');
    expect(all.status).toBe(200);
    const data = all.data.data as Array<Record<string, unknown>>;
    expect(data.length).toBe(2);
    const row1 = data.find((d) => d.mahasiswaId === mhsId) as Record<string, unknown>;
    const row2 = data.find((d) => d.mahasiswaId === mhs2Id) as Record<string, unknown>;
    expect((row1.signature as Record<string, unknown> | null)?.verifyUuid).toBe(sign.data.verifyUuid);
    expect(row2.signature).toBeNull();
    expect((row2.syarat as Record<string, unknown>).terpenuhi).toBe(false);

    const siap = await api(adminToken, 'GET', '/skpi/penerbitan?siapTerbit=true');
    expect((siap.data.data as unknown[]).length).toBe(1);
    expect((siap.data.data as Array<Record<string, unknown>>)[0].mahasiswaId).toBe(mhsId);
  });

  it('bulk-sign: siap ditandatangani sukses, belum syarat masuk failed, idempoten; authz staf-only + scope', async () => {
    await addVerifiedKegiatan('Siap Terbit Satu');
    const pending2 = await api(mhs2Token, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Pending Dua',
      tanggalMulai: '2026-03-01',
    });
    expect(pending2.status).toBe(201);

    // Authz: mahasiswa & staf out-of-scope → 403 utuh sebelum diproses.
    expect((await api(mhsToken, 'POST', '/skpi/dokumen/bulk-sign', { mahasiswaIds: [mhsId] })).status).toBe(403);
    expect((await api(kemaToken, 'POST', '/skpi/dokumen/bulk-sign', { mahasiswaIds: [mhsId] })).status).toBe(403);

    const res = await api(adminToken, 'POST', '/skpi/dokumen/bulk-sign', { mahasiswaIds: [mhsId, mhs2Id] });
    expect(res.status).toBe(200);
    expect(res.data.signedCount).toBe(1);
    expect(res.data.failedCount).toBe(1);
    const failed = res.data.failed as Array<{ mahasiswaId: number; error: string }>;
    expect(failed[0].mahasiswaId).toBe(mhs2Id);
    expect(failed[0].error).toContain('Minimal');

    // Idempoten: verifyUuid mhs1 stabil walau bulk dijalankan ulang.
    const doc1 = await api(adminToken, 'GET', `/skpi/dokumen/${mhsId}`);
    const uuid1 = (doc1.data.signature as Record<string, unknown>).verifyUuid;

    await api(adminToken, 'PUT', `/skpi/kegiatan/${pending2.data.id as number}/verifikasi`, { action: 'approve' });
    const res2 = await api(adminToken, 'POST', '/skpi/dokumen/bulk-sign', { mahasiswaIds: [mhsId, mhs2Id] });
    expect(res2.data.signedCount).toBe(2);
    expect(res2.data.failedCount).toBe(0);
    const doc1After = await api(adminToken, 'GET', `/skpi/dokumen/${mhsId}`);
    expect((doc1After.data.signature as Record<string, unknown>).verifyUuid).toBe(uuid1);
  });

  it('Cabut SKPI: tunggal staf in-scope & massal; alasan wajib; belum ditandatangani → failed per baris', async () => {
    await addVerifiedKegiatan('Akan Dicabut Satu');
    const c2 = await api(mhs2Token, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Akan Dicabut Dua',
      tanggalMulai: '2026-03-01',
    });
    await api(adminToken, 'PUT', `/skpi/kegiatan/${c2.data.id as number}/verifikasi`, { action: 'approve' });

    // Mahasiswa (termasuk pemilik) & staf out-of-scope → 403.
    expect(
      (await api(mhsToken, 'POST', `/skpi/dokumen/${mhsId}/revoke`, { reason: 'Mahasiswa Tidak Boleh' })).status,
    ).toBe(403);
    expect(
      (await api(kemaToken, 'POST', `/skpi/dokumen/${mhsId}/revoke`, { reason: 'Lintas Prodi Saja' })).status,
    ).toBe(403);

    const sign = await api(adminToken, 'POST', `/skpi/dokumen/${mhsId}/sign`);
    expect(sign.status).toBe(200);

    // Alasan: 2 karakter → 422 (schema); spasi saja → 400 (trim).
    expect((await api(adminToken, 'POST', `/skpi/dokumen/${mhsId}/revoke`, { reason: 'ab' })).status).toBe(422);
    expect((await api(adminToken, 'POST', `/skpi/dokumen/${mhsId}/revoke`, { reason: '   ' })).status).toBe(400);

    // Prodi in-scope boleh mencabut via jalur khusus SKPI (berbeda dengan TTE generik).
    const rev = await api(prodiToken, 'POST', `/skpi/dokumen/${mhsId}/revoke`, { reason: 'Koreksi data SKPI' });
    expect(rev.status).toBe(200);
    const doc = await api(adminToken, 'GET', `/skpi/dokumen/${mhsId}`);
    expect(doc.data.signature).toBeNull();
    // Mencabut ulang saat tidak ada tanda tangan aktif → 400.
    expect(
      (await api(prodiToken, 'POST', `/skpi/dokumen/${mhsId}/revoke`, { reason: 'Cabut Kedua Kali' })).status,
    ).toBe(400);

    // Massal: mhsId (sudah dicabut → failed per baris) + mhs2 (aktif → revoked).
    const sign2 = await api(adminToken, 'POST', `/skpi/dokumen/${mhs2Id}/sign`);
    expect(sign2.status).toBe(200);
    const bulk = await api(adminToken, 'POST', '/skpi/dokumen/bulk-revoke', {
      mahasiswaIds: [mhsId, mhs2Id],
      reason: 'Tarik massal SKPI',
    });
    expect(bulk.status).toBe(200);
    expect(bulk.data.revokedCount).toBe(1);
    expect(bulk.data.failedCount).toBe(1);
    expect((bulk.data.failed as Array<{ mahasiswaId: number }>)[0].mahasiswaId).toBe(mhsId);
    const doc2 = await api(adminToken, 'GET', `/skpi/dokumen/${mhs2Id}`);
    expect(doc2.data.signature).toBeNull();
  });
});
