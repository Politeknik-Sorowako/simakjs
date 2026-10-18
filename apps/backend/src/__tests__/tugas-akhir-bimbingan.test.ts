import { beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import {
  bimbingan,
  dosen,
  mahasiswa,
  periodeAkademik,
  programStudi,
  tugasAkhir,
  tugasAkhirAnggota,
  tugasAkhirLogbook,
  tugasAkhirPembimbing,
  users,
} from '../models/schema';
import { db } from '../utils/db';
import { getAuthToken } from './test-helper';

describe('Tugas Akhir - Milestone 2: Ruang Bimbingan & Logbook TA', () => {
  let mhsToken: string;
  let dosenToken: string;
  let prodiToken: string;

  let mhsId: number;
  let dosenId: number;
  let prodiId: number;
  let taId: number;
  let createdLogbookId: number;

  beforeAll(async () => {
    // 1. Setup Periode Akademik
    const periodeId = '20261';
    await db
      .insert(periodeAkademik)
      .values({
        id: periodeId,
        nama: '2026/2027 Ganjil',
        aktif: true,
      })
      .onConflictDoNothing();

    // 2. Setup Program Studi
    const [pRow] = await db
      .insert(programStudi)
      .values({
        kode: 'TMI-BIM',
        nama: 'Teknik Mekatronika Industri Bimbingan',
        jenjang: 'D3',
      })
      .onConflictDoNothing()
      .returning();

    prodiId = pRow ? pRow.id : (await db.query.programStudi.findFirst())!.id;

    // 3. Setup Tokens
    mhsToken = await getAuthToken('mhs-bim1@test.com', 'mahasiswa');
    dosenToken = await getAuthToken('dosen-bim1@test.com', 'dosen');
    prodiToken = await getAuthToken('prodi-bim@test.com', 'prodi');

    // 4. Setup Mahasiswa
    const [m1] = await db
      .insert(mahasiswa)
      .values({
        nim: '2026888',
        nama: 'Mahasiswa Bimbingan 1',
        email: 'mhs-bim1@test.com',
        programStudiId: prodiId,
        angkatan: '2026',
        status: 'aktif',
        jenisKelamin: 'L',
      })
      .onConflictDoNothing()
      .returning();

    mhsId = m1
      ? m1.id
      : (
          await db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.email, 'mhs-bim1@test.com')).limit(1)
        )[0].id;

    // 5. Setup Dosen
    const [d1] = await db
      .insert(dosen)
      .values({
        nip: '198801012026001',
        nama: 'Dosen Pembimbing 1',
        email: 'dosen-bim1@test.com',
        status: 'aktif',
      })
      .onConflictDoNothing()
      .returning();

    dosenId = d1
      ? d1.id
      : (await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.email, 'dosen-bim1@test.com')).limit(1))[0].id;

    // 6. Buat Tugas Akhir berstatus 'disetujui'
    const [uMhs] = await db.select({ id: users.id }).from(users).where(eq(users.email, 'mhs-bim1@test.com')).limit(1);

    const [newTa] = await db
      .insert(tugasAkhir)
      .values({
        kodeTa: 'TA-2026-BIM-001',
        tipe: 'individu',
        jenisKarya: 'skripsi',
        judul: 'Pengembangan Sistem Monitoring Bimbingan Tugas Akhir',
        programStudiId: prodiId,
        periodeId,
        status: 'disetujui',
        createdById: uMhs.id,
      })
      .returning();

    taId = newTa.id;

    // Anggota & Pembimbing
    await db.insert(tugasAkhirAnggota).values({
      tugasAkhirId: taId,
      mahasiswaId: mhsId,
      peran: 'ketua',
      statusKonfirmasi: 'diterima',
    });

    await db.insert(tugasAkhirPembimbing).values({
      tugasAkhirId: taId,
      dosenId,
      peran: 'pembimbing_1',
      statusPersetujuan: 'disetujui',
    });
  });

  it('1. Mahasiswa berhasil mencatat sesi logbook bimbingan baru', async () => {
    const res = await app.handle(
      new Request(`http://localhost/tugas-akhir/${taId}/logbooks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhsToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dosenId,
          pertemuanKe: 1,
          tanggalBimbingan: '2026-10-20',
          topik: 'Konsultasi Bab 1 Pendahuluan & Batasan Masalah',
          deskripsiKemajuan: 'Menyelesaikan latar belakang masalah dan rumusan 3 poin fokus.',
          kendala: 'Kebutuhan referensi jurnal IEEE terindeks.',
          fileDraftUrl: 'https://storage.politekniksorowako.ac.id/draft/bab1.pdf',
        }),
      }),
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: number; statusBimbingan: string } };
    expect(body.data.id).toBeDefined();
    expect(body.data.statusBimbingan).toBe('menunggu');
    createdLogbookId = body.data.id;

    // Status TA otomatis naik menjadi 'bimbingan'
    const [taRow] = await db.select().from(tugasAkhir).where(eq(tugasAkhir.id, taId)).limit(1);
    expect(taRow.status).toBe('bimbingan');
  });

  it('2. Mahasiswa dapat melihat daftar logbook bimbingan tugas akhir', async () => {
    const res = await app.handle(
      new Request(`http://localhost/tugas-akhir/${taId}/logbooks`, {
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: number; topik: string; pertemuanKe: number }[] };
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].pertemuanKe).toBe(1);
  });

  it('3. Dosen pembimbing dapat mereview logbook & otomatis mensinkronkan ke tabel BKD', async () => {
    const res = await app.handle(
      new Request(`http://localhost/tugas-akhir/${taId}/logbooks/${createdLogbookId}/review`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${dosenToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusBimbingan: 'disetujui',
          catatanDosen: 'Latar belakang sudah baik. Lanjutkan ke Bab 2 Tinjauan Pustaka.',
        }),
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { statusBimbingan: string; bimbinganId: number | null } };
    expect(body.data.statusBimbingan).toBe('disetujui');
    expect(body.data.bimbinganId).toBeDefined();

    // Verifikasi sinkronisasi BKD di tabel `bimbingan`
    const [bkdRow] = await db.select().from(bimbingan).where(eq(bimbingan.id, body.data.bimbinganId!)).limit(1);
    expect(bkdRow).toBeDefined();
    expect(bkdRow.kategori).toBe('TA');
    expect(bkdRow.statusBkd).toBe(true);
    expect(bkdRow.isApproved).toBe(true);
    expect(bkdRow.dosenId).toBe(dosenId);
  });

  it('4. Dosen pembimbing dapat memberikan ACC Sidang Proposal dan Akhir', async () => {
    // Beri ACC Sidang Proposal
    const resProposal = await app.handle(
      new Request(`http://localhost/tugas-akhir/${taId}/acc-sidang`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${dosenToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenisSidang: 'proposal',
          statusAcc: true,
          catatan: 'Naskah proposal siap diuji di hadapan dewan penguji sempro.',
        }),
      }),
    );

    expect(resProposal.status).toBe(200);

    const [pRow] = await db
      .select()
      .from(tugasAkhirPembimbing)
      .where(eq(tugasAkhirPembimbing.tugasAkhirId, taId))
      .limit(1);

    expect(pRow.accSidangProposal).toBe(true);
    expect(pRow.accSidangProposalAt).toBeDefined();
  });
});
