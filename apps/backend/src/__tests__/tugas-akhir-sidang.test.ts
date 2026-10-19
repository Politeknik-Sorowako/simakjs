import { beforeAll, describe, expect, it } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { app } from '../app';
import {
  dosen,
  mahasiswa,
  periodeAkademik,
  programStudi,
  tugasAkhir,
  tugasAkhirAnggota,
  tugasAkhirPembimbing,
  tugasAkhirPenguji,
  tugasAkhirRubrikKriteria,
  tugasAkhirSidang,
  users,
} from '../models/schema';
import { db } from '../utils/db';
import { getAuthToken } from './test-helper';

describe('Tugas Akhir - Milestone 3: Pendaftaran & Penjadwalan Sidang Proposal', () => {
  let mhsToken: string;
  let dosenP1Token: string;
  let dosenPengujiToken: string;
  let prodiToken: string;

  let mhsId: number;
  let dosenP1Id: number;
  let dosenPengujiId: number;
  let prodiId: number;
  let taId: number;
  let sidangId: number;
  let rubrikKriteriaId: number;

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
        kode: 'TMI-SEMPRO',
        nama: 'Teknik Mekatronika Industri Sempro',
        jenjang: 'D3',
      })
      .onConflictDoNothing()
      .returning();

    prodiId = pRow ? pRow.id : (await db.query.programStudi.findFirst())!.id;

    // 3. Setup Tokens
    mhsToken = await getAuthToken('mhs-sempro1@test.com', 'mahasiswa');
    dosenP1Token = await getAuthToken('dosen-p1@test.com', 'dosen');
    dosenPengujiToken = await getAuthToken('dosen-penguji1@test.com', 'dosen');
    prodiToken = await getAuthToken('prodi-sempro@test.com', 'prodi');

    // 4. Setup Mahasiswa
    const [m1] = await db
      .insert(mahasiswa)
      .values({
        nim: '2026999',
        nama: 'Mahasiswa Sempro 1',
        email: 'mhs-sempro1@test.com',
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
          await db
            .select({ id: mahasiswa.id })
            .from(mahasiswa)
            .where(eq(mahasiswa.email, 'mhs-sempro1@test.com'))
            .limit(1)
        )[0].id;

    // 5. Setup Dosen P1 & Dosen Penguji
    const [dP1] = await db
      .insert(dosen)
      .values({
        nip: '198501012026001',
        nama: 'Dosen Pembimbing 1 Sempro',
        email: 'dosen-p1@test.com',
        status: 'aktif',
      })
      .onConflictDoNothing()
      .returning();
    dosenP1Id = dP1
      ? dP1.id
      : (await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.email, 'dosen-p1@test.com')).limit(1))[0].id;

    const [dPenguji] = await db
      .insert(dosen)
      .values({
        nip: '198702022026002',
        nama: 'Dosen Penguji 1 Sempro',
        email: 'dosen-penguji1@test.com',
        status: 'aktif',
      })
      .onConflictDoNothing()
      .returning();
    dosenPengujiId = dPenguji
      ? dPenguji.id
      : (await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.email, 'dosen-penguji1@test.com')).limit(1))[0]
          .id;

    // 6. Buat Tugas Akhir
    const [uMhs] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, 'mhs-sempro1@test.com'))
      .limit(1);

    const uniqueKode = `TA-SEMPRO-${Date.now()}`;
    const [newTa] = await db
      .insert(tugasAkhir)
      .values({
        kodeTa: uniqueKode,
        tipe: 'individu',
        jenisKarya: 'prototipe',
        judul: 'Rancang Bangun Robot AGV Industri Berbasis SLAM Lidar',
        programStudiId: prodiId,
        periodeId,
        status: 'bimbingan',
        createdById: uMhs.id,
      })
      .returning();

    taId = newTa.id;

    await db.insert(tugasAkhirAnggota).values({
      tugasAkhirId: taId,
      mahasiswaId: mhsId,
      peran: 'ketua',
      statusKonfirmasi: 'diterima',
    });

    await db.insert(tugasAkhirPembimbing).values({
      tugasAkhirId: taId,
      dosenId: dosenP1Id,
      peran: 'pembimbing_1',
      statusPersetujuan: 'disetujui',
      accSidangProposal: true,
      accSidangProposalAt: new Date(),
    });

    // 7. Setup Rubrik Kriteria Proposal
    const [rubrik] = await db
      .insert(tugasAkhirRubrikKriteria)
      .values({
        programStudiId: prodiId,
        jenisSidang: 'proposal',
        kode: 'KRIT-01',
        nama: 'Kualitas Rumusan Masalah & Metodologi',
        bobot: 100,
        urutan: 1,
        isAktif: true,
      })
      .returning();
    rubrikKriteriaId = rubrik.id;
  });

  it('1. Mahasiswa berhasil mendaftar Sidang Proposal setelah memenuhi syarat ACC Pembimbing', async () => {
    const res = await app.handle(
      new Request(`http://localhost/tugas-akhir/${taId}/sidang/daftar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhsToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenisSidang: 'proposal',
          berkasProposalUrl: 'https://storage.politekniksorowako.ac.id/proposal/robot-agv.pdf',
          buktiBebasKompensasiUrl: 'https://storage.politekniksorowako.ac.id/kompensasi/bebas.pdf',
          buktiPlagiasiUrl: 'https://storage.politekniksorowako.ac.id/turnitin/similarity-12-persen.pdf',
          catatanMahasiswa: 'Seluruh materi proposal telah disetujui Pembimbing 1.',
        }),
      }),
    );

    const body = (await res.json()) as { data: { id: number; status: string } };
    expect(res.status).toBe(201);
    expect(body.data.id).toBeDefined();
    expect(body.data.status).toBe('diajukan');
    sidangId = body.data.id;

    // Status TA otomatis berubah menjadi 'sempro_diajukan'
    const [taRow] = await db.select().from(tugasAkhir).where(eq(tugasAkhir.id, taId)).limit(1);
    expect(taRow.status).toBe('sempro_diajukan');
  });

  it('2. Program Studi menjadwalkan Sidang Proposal dan plotting Dewan Penguji', async () => {
    const res = await app.handle(
      new Request(`http://localhost/tugas-akhir/${taId}/sidang/${sidangId}/jadwal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${prodiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggalSidang: '2026-10-25',
          jamMulai: '09:00',
          jamSelesai: '11:00',
          ruangan: 'Ruang Sidang Utama Lantai 2',
          timPenguji: [
            { dosenId: dosenPengujiId, peranPenguji: 'penguji_1' },
            { dosenId: dosenP1Id, peranPenguji: 'pembimbing_1' },
          ],
        }),
      }),
    );

    const body = (await res.json()) as { data?: { status: string; ruangan: string }; error?: unknown };
    if (res.status !== 200) {
      console.log('Error on test 2:', body);
    }
    expect(res.status).toBe(200);
    expect(body.data?.status).toBe('dijadwalkan');
    expect(body.data?.ruangan).toBe('Ruang Sidang Utama Lantai 2');

    // Pastikan status TA berubah menjadi 'sempro_dijadwalkan'
    const [taRow] = await db.select().from(tugasAkhir).where(eq(tugasAkhir.id, taId)).limit(1);
    expect(taRow.status).toBe('sempro_dijadwalkan');

    // Pastikan penguji tercatat di tabel `tugas_akhir_penguji`
    const pengujiRows = await db.select().from(tugasAkhirPenguji).where(eq(tugasAkhirPenguji.sidangId, sidangId));
    expect(pengujiRows.length).toBe(2);
  });

  it('3. Dosen Penguji dapat menginput nilai kriteria & catatan revisi sidang', async () => {
    const res = await app.handle(
      new Request(`http://localhost/tugas-akhir/${taId}/sidang/${sidangId}/nilai`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${dosenPengujiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nilaiList: [
            {
              kriteriaId: rubrikKriteriaId,
              mahasiswaId: mhsId,
              nilai: 8.5,
            },
          ],
          catatanRevisi: 'Perdalam spesifikasi sensor LiDAR dan algoritma pemetaan pada Bab 3.',
        }),
      }),
    );

    const body = (await res.json()) as { message?: string; error?: unknown };
    if (res.status !== 200) {
      console.log('Error on test 3:', body);
    }
    expect(res.status).toBe(200);
    expect(body.message).toContain('berhasil disimpan');

    // Pastikan nilaiTotal di penguji terupdate
    const [pRow] = await db
      .select()
      .from(tugasAkhirPenguji)
      .where(and(eq(tugasAkhirPenguji.sidangId, sidangId), eq(tugasAkhirPenguji.dosenId, dosenPengujiId)))
      .limit(1);
    expect(Number(pRow.nilaiTotal)).toBe(8.5);
  });

  it('4. Program Studi memfinalisasi hasil Sidang Proposal (Lulus Dengan Revisi)', async () => {
    const res = await app.handle(
      new Request(`http://localhost/tugas-akhir/${taId}/sidang/${sidangId}/finalisasi`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${prodiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusHasil: 'lulus_dengan_revisi',
          batasWaktuRevisi: '2026-11-05',
          catatanSidang: 'Proposal diterima dengan revisi minor pada Bab 3.',
        }),
      }),
    );

    const body = (await res.json()) as {
      data?: { statusHasil: string; status: string; nilaiAkhirAngka: number };
      error?: unknown;
    };
    if (res.status !== 200) {
      console.log('Error on test 4:', body);
    }
    expect(res.status).toBe(200);
    expect(body.data?.statusHasil).toBe('lulus_dengan_revisi');
    expect(body.data?.status).toBe('selesai');
    expect(body.data?.nilaiAkhirAngka).toBeDefined();

    // Verifikasi status TA naik menjadi 'sempro_selesai'
    const [taRow] = await db.select().from(tugasAkhir).where(eq(tugasAkhir.id, taId)).limit(1);
    expect(taRow.status).toBe('sempro_selesai');
  });

  it('5. Endpoint Rekap Nilai Sidang menghasilkan baris data ekspor (0-10, 0-100, Huruf Mutu BPA)', async () => {
    const res = await app.handle(
      new Request(`http://localhost/tugas-akhir/${taId}/sidang/${sidangId}/rekap-nilai`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${prodiToken}` },
      }),
    );

    const body = (await res.json()) as {
      data?: {
        exportRows: {
          nim: string;
          nama: string;
          nilaiAkhir: string;
          nilaiAkhirSkala100: string;
          hurufMutu: string;
          statusHasil: string;
        }[];
      };
      error?: unknown;
    };
    expect(res.status).toBe(200);
    expect(body.data?.exportRows).toBeDefined();
    expect(body.data!.exportRows.length).toBeGreaterThan(0);

    const firstRow = body.data!.exportRows[0];
    expect(firstRow.nim).toBeDefined();
    expect(firstRow.nilaiAkhir).toBe('8.50');
    expect(firstRow.nilaiAkhirSkala100).toBe('85.00');
    expect(firstRow.hurufMutu).toBe('A');
  });

  it('6. Workflow Revisi: Mahasiswa submit naskah revisi, penguji beri ACC, dan status revisi tuntas', async () => {
    // A. Mahasiswa mengunggah naskah revisi
    const submitRes = await app.handle(
      new Request(`http://localhost/tugas-akhir/${taId}/sidang/${sidangId}/revisi`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhsToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileRevisiUrl: 'https://drive.google.com/file/d/revisi-final-proposal/view',
          catatanMahasiswa: 'Telah memperbaiki spesifikasi sensor dan algoritma pada Bab 3.',
        }),
      }),
    );
    expect(submitRes.status).toBe(200);

    // Verifikasi statusRevisi di database menjadi 'diverifikasi_penguji'
    const [sidangAfterUpload] = await db
      .select()
      .from(tugasAkhirSidang)
      .where(eq(tugasAkhirSidang.id, sidangId))
      .limit(1);
    expect(sidangAfterUpload.statusRevisi).toBe('diverifikasi_penguji');

    // B. Dosen Penguji menyetujui revisi (ACC Revisi)
    const pengujiRows = await db.select().from(tugasAkhirPenguji).where(eq(tugasAkhirPenguji.sidangId, sidangId));

    for (const p of pengujiRows) {
      const accRes = await app.handle(
        new Request(`http://localhost/tugas-akhir/${taId}/sidang/${sidangId}/penguji/${p.id}/acc-revisi`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${prodiToken}` },
        }),
      );
      expect(accRes.status).toBe(200);
    }

    // Verifikasi statusRevisi di database menjadi 'tuntas'
    const [sidangAfterAllAcc] = await db
      .select()
      .from(tugasAkhirSidang)
      .where(eq(tugasAkhirSidang.id, sidangId))
      .limit(1);
    expect(sidangAfterAllAcc.statusRevisi).toBe('tuntas');
  });
});
